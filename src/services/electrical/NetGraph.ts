/**
 * NetGraph — Net/Node-based circuit graph builder.
 *
 * This is the CORE of the electrical engine.
 *
 * Instead of thinking "wire from X to Y", we think:
 *   Net_0 = [Arduino::5V, Breadboard::+(VCC)]
 *   Net_1 = [Arduino::D13, Resistor::P1]
 *   Net_2 = [Resistor::P2, LED::Anode(+)]
 *   Net_3 = [LED::Cathode(-), Arduino::GND]
 *
 * A "Net" is a set of electrically connected pins.
 * Pins in the same net are at the same voltage (ideal wires).
 *
 * Sources of connectivity:
 *   1. Explicit wires (user-placed)
 *   2. Internal device nets (e.g. breadboard column strips, Arduino GND-GND2)
 */

import type { LabComponent, Wire } from '../../types';
import type { DeviceModule } from './DeviceModule';
import { createDevice } from './DeviceModule';

/* ─── Pin Key: globally unique identifier for a pin ─── */
export function pinKey(componentId: string, pinName: string): string {
    return `${componentId}::${pinName}`;
}

/* ─── Net: a set of electrically equivalent pins ─── */
export interface Net {
    id: number;
    pins: Set<string>;       // set of pinKey strings
    voltage: number | null;  // resolved voltage (null = floating)
}

/* ─── Circuit Graph ─── */
export interface CircuitGraph {
    /** All nets in the circuit */
    nets: Net[];
    /** pinKey → net ID lookup */
    pinToNet: Map<string, number>;
    /** Device modules indexed by component ID */
    devices: Map<string, DeviceModule>;
    /** Net ID → resistance to next net (for series connections) */
    netResistances: Map<string, number>; // `netA-netB` → ohms
}

/**
 * Build the complete circuit graph from components and wires.
 *
 * Algorithm:
 *   1. Create a DeviceModule for each component
 *   2. Create initial pin entries via Union-Find
 *   3. Merge pins connected by wires
 *   4. Merge pins connected by device internal nets
 *   5. Extract final nets
 */
export function buildCircuitGraph(
    components: LabComponent[],
    wires: Wire[],
): CircuitGraph {
    // ── Union-Find for net merging ──
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    function find(x: string): string {
        if (!parent.has(x)) { parent.set(x, x); rank.set(x, 0); }
        let root = x;
        while (parent.get(root) !== root) root = parent.get(root)!;
        // Path compression
        let curr = x;
        while (curr !== root) {
            const next = parent.get(curr)!;
            parent.set(curr, root);
            curr = next;
        }
        return root;
    }

    function union(a: string, b: string): void {
        const ra = find(a), rb = find(b);
        if (ra === rb) return;
        const rankA = rank.get(ra) || 0;
        const rankB = rank.get(rb) || 0;
        if (rankA < rankB) { parent.set(ra, rb); }
        else if (rankA > rankB) { parent.set(rb, ra); }
        else { parent.set(rb, ra); rank.set(ra, rankA + 1); }
    }

    // ── 1. Create DeviceModules and register all pins ──
    const devices = new Map<string, DeviceModule>();
    const netResistances = new Map<string, number>();

    for (const comp of components) {
        const device = createDevice(comp.type);
        if (device) {
            devices.set(comp.id, device);
            // Register all pins into the union-find
            for (const pin of device.pins) {
                find(pinKey(comp.id, pin.name));
            }
        }
    }

    // ── 2. Merge pins connected by explicit wires ──
    for (const wire of wires) {
        const a = pinKey(wire.startComponentId, wire.startPin);
        const b = pinKey(wire.endComponentId, wire.endPin);
        union(a, b);
    }

    // ── 2.5. Merge pins connected via physical Breadboard auto-layout ──
    for (const comp of components) {
        if (comp.placement?.type === 'breadboard') {
            const bbId = comp.placement.refId;
            const device = devices.get(comp.id);
            if (!device) continue;

            // Map each device pin to the corresponding breadboard hole sequentially
            const pins = device.pins;
            const holes = comp.placement.holes;

            for (let i = 0; i < Math.min(pins.length, holes.length); i++) {
                const compPinKey = pinKey(comp.id, pins[i].name);
                const bbPinKey = pinKey(bbId, holes[i]);
                union(compPinKey, bbPinKey);
            }
        }
    }

    // ── 3. Merge pins connected by device internal nets ──
    for (const comp of components) {
        const device = devices.get(comp.id);
        if (!device) continue;

        for (const inet of device.internalNets) {
            if (inet.pins.length < 2) continue;

            if (inet.resistance === 0) {
                // Zero resistance = same net (direct connection)
                const first = pinKey(comp.id, inet.pins[0]);
                for (let i = 1; i < inet.pins.length; i++) {
                    union(first, pinKey(comp.id, inet.pins[i]));
                }
            } else {
                // Non-zero resistance: pins are in DIFFERENT nets but connected
                // with a resistance. We track this separately.
                for (let i = 0; i < inet.pins.length - 1; i++) {
                    const pA = pinKey(comp.id, inet.pins[i]);
                    const pB = pinKey(comp.id, inet.pins[i + 1]);
                    // Don't union — they stay in separate nets
                    // Store the resistance between these pin pairs
                    const key = `${pA}|${pB}`;
                    netResistances.set(key, inet.resistance);
                    netResistances.set(`${pB}|${pA}`, inet.resistance);
                }
            }
        }
    }

    // ── 4. Extract final nets ──
    const rootToNetId = new Map<string, number>();
    const nets: Net[] = [];
    const pinToNet = new Map<string, number>();

    for (const pk of parent.keys()) {
        const root = find(pk);
        if (!rootToNetId.has(root)) {
            const netId = nets.length;
            rootToNetId.set(root, netId);
            nets.push({ id: netId, pins: new Set(), voltage: null });
        }
        const netId = rootToNetId.get(root)!;
        nets[netId].pins.add(pk);
        pinToNet.set(pk, netId);
    }

    return { nets, pinToNet, devices, netResistances };
}

/**
 * Find which net a pin belongs to.
 */
export function getNetForPin(graph: CircuitGraph, componentId: string, pinName: string): Net | null {
    const pk = pinKey(componentId, pinName);
    const netId = graph.pinToNet.get(pk);
    if (netId === undefined) return null;
    return graph.nets[netId];
}

/**
 * Check if two pins are on the same net (electrically connected with 0 resistance).
 */
export function arePinsConnected(graph: CircuitGraph, compA: string, pinA: string, compB: string, pinB: string): boolean {
    const netA = graph.pinToNet.get(pinKey(compA, pinA));
    const netB = graph.pinToNet.get(pinKey(compB, pinB));
    if (netA === undefined || netB === undefined) return false;
    return netA === netB;
}
