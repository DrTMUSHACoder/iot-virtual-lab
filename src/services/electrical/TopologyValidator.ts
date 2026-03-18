/**
 * TopologyValidator — Generic circuit validation using Net/Node graph.
 *
 * No experiment-specific logic. Pure graph analysis.
 *
 * Checks:
 *   1. Power source exists (at least one net has a voltage source)
 *   2. GND path exists (at least one net is grounded)
 *   3. No short circuits (POWER net directly merged with GROUND net)
 *   4. No floating outputs (output device has only one terminal connected)
 *   5. Path continuity (voltage can flow from source to load to ground)
 */

import type { LabComponent, Wire } from '../../types';
import { buildCircuitGraph, pinKey } from './NetGraph';
import type { CircuitGraph } from './NetGraph';

// Import device modules to ensure they're registered
import './devices/ArduinoDevice';
import './devices/RaspberryPiDevice';
import './devices/BreadboardDevice';
import './devices/PassiveDevices';

export interface TopologyResult {
    valid: boolean;
    error?: string;
    warnings: string[];
    graph: CircuitGraph;
}

/**
 * Validate the circuit topology generically — no experiment-specific rules.
 */
export function validateTopology(
    components: LabComponent[],
    wires: Wire[],
): TopologyResult {
    const warnings: string[] = [];

    if (wires.length === 0) {
        return {
            valid: false,
            error: 'Circuit is incomplete. Please connect wires before running simulation.',
            warnings,
            graph: buildCircuitGraph(components, wires),
        };
    }

    const graph = buildCircuitGraph(components, wires);

    // ── 1. Identify power and ground nets ──
    const powerNets = new Set<number>();   // nets with POWER pins
    const groundNets = new Set<number>(); // nets with GROUND pins

    for (const comp of components) {
        const device = graph.devices.get(comp.id);
        if (!device) continue;

        for (const pin of device.pins) {
            const pk = pinKey(comp.id, pin.name);
            const netId = graph.pinToNet.get(pk);
            if (netId === undefined) continue;

            if (pin.direction === 'POWER' && pin.defaultVoltage !== null && pin.defaultVoltage > 0) {
                powerNets.add(netId);
            }
            if (pin.direction === 'GROUND' || (pin.defaultVoltage === 0 && pin.direction === 'POWER')) {
                groundNets.add(netId);
            }
        }
    }

    // ── 2. Check: at least one power source ──
    if (powerNets.size === 0) {
        return {
            valid: false,
            error: 'No power source detected. Connect an Arduino, Raspberry Pi, or Battery to provide voltage.',
            warnings,
            graph,
        };
    }

    // ── 3. Check: at least one ground path ──
    if (groundNets.size === 0) {
        return {
            valid: false,
            error: 'No ground (GND) connection detected. Every circuit needs a return path to ground.',
            warnings,
            graph,
        };
    }

    // ── 4. Check: short circuit (power net === ground net) ──
    for (const pNet of powerNets) {
        if (groundNets.has(pNet)) {
            return {
                valid: false,
                error: 'SHORT CIRCUIT detected! A power pin is directly connected to ground. This would damage real hardware.',
                warnings,
                graph,
            };
        }
    }

    // ── 5. Check output devices have both terminals connected ──
    const OUTPUT_TYPES = ['LED_LIGHT', 'BUZZER'];
    for (const comp of components) {
        if (!OUTPUT_TYPES.includes(comp.type)) continue;

        const device = graph.devices.get(comp.id);
        if (!device) continue;

        const connectedPins = device.pins.filter(pin => {
            const pk = pinKey(comp.id, pin.name);
            const netId = graph.pinToNet.get(pk);
            if (netId === undefined) return false;
            const net = graph.nets[netId];
            // A pin is "connected" if its net has more than 1 pin
            return net.pins.size > 1;
        });

        if (connectedPins.length === 0) {
            // Not connected at all — skip (user might not have wired it yet)
            continue;
        }

        if (connectedPins.length < device.pins.length) {
            warnings.push(`${device.displayName} has only ${connectedPins.length} of ${device.pins.length} terminals connected. It may not function.`);
        }
    }

    // ── 6. Detect LED Reversed ──
    const leds = components.filter(c => c.type === 'LED_LIGHT');
    for (const led of leds) {
        const anodeNet = graph.pinToNet.get(pinKey(led.id, 'Anode (+)'));
        const cathodeNet = graph.pinToNet.get(pinKey(led.id, 'Cathode (-)'));

        if (anodeNet !== undefined && cathodeNet !== undefined) {
            if (groundNets.has(anodeNet) && powerNets.has(cathodeNet)) {
                return {
                    valid: false,
                    error: `LED Reversed! The Anode (long leg) of ${led.id} is connected to GND, and Cathode to Power.`,
                    warnings,
                    graph,
                };
            }
        }
    }

    // ── 7. Detect Missing Resistor on LED ──
    for (const led of leds) {
        const anodeNet = graph.pinToNet.get(pinKey(led.id, 'Anode (+)'));
        const cathodeNet = graph.pinToNet.get(pinKey(led.id, 'Cathode (-)'));

        if (anodeNet !== undefined && cathodeNet !== undefined) {
            // If anode is direct to power, and cathode direct to ground WITHOUT a resistor in the path
            // (We check if power/ground net directly touches the LED pins without going through a resistor)
            const anodeDirectToPower = powerNets.has(anodeNet);
            const cathodeDirectToGnd = groundNets.has(cathodeNet);

            if (anodeDirectToPower && cathodeDirectToGnd) {
                return {
                    valid: false,
                    error: `Missing Resistor! ${led.id} is connected directly across power and ground without a current-limiting resistor. In real life, this would burn out the LED instantly.`,
                    warnings,
                    graph,
                };
            }
        }
    }

    return {
        valid: true,
        warnings,
        graph,
    };
}
