/**
 * VoltageEngine — Voltage propagation across Net/Node graph.
 *
 * Given a validated CircuitGraph, resolves voltages on every net
 * and determines which devices are active.
 *
 * Algorithm:
 *   1. Seed source nets with their source voltages
 *   2. Propagate through nets connected via resistive paths
 *   3. Determine active output devices (LEDs, buzzers, etc.)
 */

import type { LabComponent } from '../../types';
import type { CircuitGraph } from './NetGraph';
import { pinKey } from './NetGraph';

/* ─── Voltage Constants ─── */
export const V_LOW = 0;
export const V_3V3 = 3.3;
export const V_5V = 5;

/* ─── Evaluation Result ─── */
export interface CircuitEvaluation {
    /** pinKey → voltage */
    voltages: Record<string, number>;
    /** Component IDs of active LEDs */
    activeLEDs: Set<string>;
    /** Component IDs of active buzzers */
    activeBuzzers: Set<string>;
    /** Component IDs of powered DHT11s */
    activeDHT11s: Set<string>;
}

/**
 * Evaluate voltages across the entire circuit.
 */
export function evaluateVoltages(
    components: LabComponent[],
    graph: CircuitGraph,
    simulationSignals: Record<string, boolean>,
    isSimulating: boolean,
): CircuitEvaluation {
    const voltages: Record<string, number> = {};
    const activeLEDs = new Set<string>();
    const activeBuzzers = new Set<string>();
    const activeDHT11s = new Set<string>();

    if (!isSimulating) {
        return { voltages, activeLEDs, activeBuzzers, activeDHT11s };
    }

    // ── 1. Seed: assign voltages to source nets ──
    for (const comp of components) {
        const device = graph.devices.get(comp.id);
        if (!device) continue;

        for (const pin of device.pins) {
            if (pin.defaultVoltage === null) continue;
            const pk = pinKey(comp.id, pin.name);
            const netId = graph.pinToNet.get(pk);
            if (netId === undefined) continue;

            const net = graph.nets[netId];
            // Set the net voltage (highest source wins for power, lowest for ground)
            if (pin.direction === 'GROUND') {
                net.voltage = V_LOW;
            } else if (pin.direction === 'POWER') {
                net.voltage = Math.max(net.voltage ?? 0, pin.defaultVoltage);
            }
        }

        // Digital output pins driven by simulation signals (Arduino)
        if (comp.type === 'ARDUINO_UNO') {
            for (let i = 0; i <= 13; i++) {
                const sigKey = `${i}`;
                const sigKeyD = `D${i}`;
                if (simulationSignals[sigKey] || simulationSignals[sigKeyD]) {
                    const pk = pinKey(comp.id, `D${i}`);
                    const netId = graph.pinToNet.get(pk);
                    if (netId !== undefined) {
                        graph.nets[netId].voltage = V_5V;
                    }
                }
            }
        }

        // GPIO pins for Raspberry Pi
        if (comp.type === 'RASPBERRY_PI') {
            for (const [sig, val] of Object.entries(simulationSignals)) {
                if (sig.startsWith('GPIO') && val) {
                    const pk = pinKey(comp.id, sig);
                    const netId = graph.pinToNet.get(pk);
                    if (netId !== undefined) {
                        graph.nets[netId].voltage = V_3V3;
                    }
                }
            }
        }
    }

    // ── 2. Propagate voltages through resistive connections ──
    // Build a net-to-net adjacency list with conductances (G = 1/R)
    interface Neighbor { netId: number; conductance: number; }
    const netAdj = new Map<number, Neighbor[]>();

    for (const [key, resistance] of graph.netResistances) {
        const [pkA, pkB] = key.split('|');
        const netA = graph.pinToNet.get(pkA);
        const netB = graph.pinToNet.get(pkB);
        // Avoid self-loops or infinity resistance links
        if (netA === undefined || netB === undefined || netA === netB || resistance === Infinity) continue;

        // Prevent division by zero; treat 0 resistance as very small resistance in context of the solver
        // (Though pure 0 resistance should have been merged via Union-Find in NetGraph!)
        const r = Math.max(resistance, 1e-6);
        const g = 1 / r;

        if (!netAdj.has(netA)) netAdj.set(netA, []);
        if (!netAdj.has(netB)) netAdj.set(netB, []);
        netAdj.get(netA)!.push({ netId: netB, conductance: g });
        netAdj.get(netB)!.push({ netId: netA, conductance: g });
    }

    // Identify fixed (source) nets vs unknown nets
    const fixedNets = new Set<number>();
    for (const net of graph.nets) {
        if (net.voltage !== null) {
            fixedNets.add(net.id);
        } else if (netAdj.has(net.id)) {
            // Initialize unknown connected nets to 0 to start relaxation
            net.voltage = 0;
        }
    }

    // Iterative Relaxation Solver (Gauss-Seidel approach)
    // Solves the resistor network node voltages.
    const MAX_ITERATIONS = 500;
    const EPSILON = 0.001; // Convergence threshold in volts

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let maxDelta = 0;

        for (const net of graph.nets) {
            if (fixedNets.has(net.id)) continue; // Don't change source voltages

            const neighbors = netAdj.get(net.id);
            if (!neighbors || neighbors.length === 0) continue;

            let sumGV = 0; // Sum of (Conductance * Voltage)
            let sumG = 0;  // Sum of Conductance

            for (const nb of neighbors) {
                const nbNet = graph.nets[nb.netId];
                if (nbNet.voltage !== null) {
                    sumGV += nb.conductance * nbNet.voltage;
                    sumG += nb.conductance;
                }
            }

            if (sumG > 0) {
                const newVoltage = sumGV / sumG;
                const oldVoltage = net.voltage!;
                maxDelta = Math.max(maxDelta, Math.abs(newVoltage - oldVoltage));
                net.voltage = newVoltage;
            }
        }

        if (maxDelta < EPSILON) {
            break; // Converged
        }
    }

    // Clean up floating nets (nets that ended up with exactly 0 but have no path to ground/source)
    // Relaxation leaves completely isolated subgraphs at 0. Let's make sure they are null.
    // If a net has 0V but isn't connected to a source, it's floating.
    const connectedToSource = new Set<number>(fixedNets);
    const reachQueue: number[] = Array.from(fixedNets);
    while (reachQueue.length > 0) {
        const curr = reachQueue.shift()!;
        const neighbors = netAdj.get(curr);
        if (neighbors) {
            for (const nb of neighbors) {
                if (!connectedToSource.has(nb.netId)) {
                    connectedToSource.add(nb.netId);
                    reachQueue.push(nb.netId);
                }
            }
        }
    }
    for (const net of graph.nets) {
        if (!connectedToSource.has(net.id)) {
            net.voltage = null; // Floating
        }
    }


    // ── 3. Flatten net voltages to per-pin voltages ──
    for (const net of graph.nets) {
        if (net.voltage === null) continue;
        for (const pk of net.pins) {
            voltages[pk] = net.voltage;
        }
    }

    // ── 4. Determine active output devices ──
    // LEDs are diodes, not resistors. The Gauss-Seidel solver treats them as
    // low-resistance paths, which gives incorrect voltage distribution.
    // Fix: detect forward-biased LEDs by checking if their anode net is
    // reachable from a power source AND their cathode net has a path to ground.
    // If so, the LED is ON regardless of the solver's computed voltage drop.
    const LED_FORWARD_VOLTAGE = 2.0; // ~2V typical forward drop

    for (const comp of components) {
        if (comp.type === 'LED_LIGHT') {
            const anodePk = pinKey(comp.id, 'Anode (+)');
            const cathodePk = pinKey(comp.id, 'Cathode (-)');
            const anodeNetId = graph.pinToNet.get(anodePk);
            const cathodeNetId = graph.pinToNet.get(cathodePk);

            if (anodeNetId !== undefined && cathodeNetId !== undefined) {
                const anodeNet = graph.nets[anodeNetId];
                const cathodeNet = graph.nets[cathodeNetId];

                // Check: anode net has voltage > 0 (connected to power source)
                // Check: cathode net has a path to ground (connected to ground)
                const anodeHasPower = anodeNet.voltage !== null && anodeNet.voltage > 1.0;
                const cathodeHasGround = cathodeNet.voltage !== null && cathodeNet.voltage < 1.0;

                // Also check if cathode net is reachable from a ground source
                // (it might have a non-zero voltage from the solver but still be
                // connected to ground through a resistor)
                const cathodeConnectedToGround = connectedToSource.has(cathodeNetId) &&
                    Array.from(cathodeNet.pins).some(pk => {
                        // Check if any pin on this net belongs to a ground device
                        for (const c of components) {
                            const dev = graph.devices.get(c.id);
                            if (!dev) continue;
                            for (const pin of dev.pins) {
                                if (pinKey(c.id, pin.name) === pk && pin.direction === 'GROUND') {
                                    return true;
                                }
                            }
                        }
                        return false;
                    });

                // The cathode net may be pulled high by the solver (because LED is modeled as
                // low resistance). But if there's a path from cathode to ground through a 
                // resistor, the LED is forward-biased and should be ON.
                const cathodeReachesGround = cathodeHasGround || cathodeConnectedToGround ||
                    // Check via resistive adjacency: is cathode net connected to a ground net?
                    (netAdj.get(cathodeNetId)?.some(nb => {
                        const nbNet = graph.nets[nb.netId];
                        // Direct neighbor is ground
                        if (nbNet.voltage !== null && nbNet.voltage < 0.5) return true;
                        // Neighbor's neighbor is ground (through one resistor hop)
                        return netAdj.get(nb.netId)?.some(nb2 => {
                            const nb2Net = graph.nets[nb2.netId];
                            return nb2Net.voltage !== null && nb2Net.voltage < 0.5;
                        }) || false;
                    }) || false);

                if (anodeHasPower && cathodeReachesGround) {
                    activeLEDs.add(comp.id);
                    // Override voltages for correct display:
                    // Anode stays at its source voltage
                    // Cathode = Anode - forward voltage drop
                    const sourceV = anodeNet.voltage!;
                    voltages[anodePk] = sourceV;
                    voltages[cathodePk] = Math.max(0, sourceV - LED_FORWARD_VOLTAGE);
                }
            }
        }

        if (comp.type === 'BUZZER') {
            const posPk = pinKey(comp.id, '(+)');
            const negPk = pinKey(comp.id, '(-)');
            const posNetId = graph.pinToNet.get(posPk);
            const negNetId = graph.pinToNet.get(negPk);

            if (posNetId !== undefined && negNetId !== undefined) {
                const posNet = graph.nets[posNetId];
                const negNet = graph.nets[negNetId];
                const posHasPower = posNet.voltage !== null && posNet.voltage > 2.0;
                const negHasGround = negNet.voltage !== null && negNet.voltage < 1.0;
                if (posHasPower && negHasGround) {
                    activeBuzzers.add(comp.id);
                }
            }
        }

        if (comp.type === 'DHT11_SENSOR') {
            const vccV = voltages[pinKey(comp.id, 'VCC')];
            const gndV = voltages[pinKey(comp.id, 'GND')];
            if (vccV !== undefined && gndV !== undefined) {
                const vDrop = vccV - gndV;
                if (vDrop > 3.0) {
                    activeDHT11s.add(comp.id);
                }
            }
        }
    }

    return { voltages, activeLEDs, activeBuzzers, activeDHT11s };
}
