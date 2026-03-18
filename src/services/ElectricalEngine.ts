/**
 * ElectricalEngine — Facade that delegates to the modular Net/Node engine.
 *
 * This file preserves the existing API so the rest of the app doesn't break,
 * but internally uses the new topology-driven architecture.
 *
 * Old API preserved:
 *   - evaluateCircuit(components, wires, signals, isSimulating) → CircuitResult
 *   - validateCircuitTopology(experimentId, components, wires, refIdMap) → ValidationResult
 *
 * New architecture under the hood:
 *   1. DeviceModule registry (no hardcoded pin definitions)
 *   2. NetGraph (Union-Find net builder with internal device connectivity)
 *   3. TopologyValidator (generic — no experiment-specific logic)
 *   4. VoltageEngine (net-based voltage propagation)
 */

import type { LabComponent, Wire } from '../types';
import { validateTopology } from './electrical/TopologyValidator';
import { evaluateVoltages } from './electrical/VoltageEngine';
import { buildCircuitGraph } from './electrical/NetGraph';

// Ensure all device modules are registered
import './electrical/devices/ArduinoDevice';
import './electrical/devices/RaspberryPiDevice';
import './electrical/devices/BreadboardDevice';
import './electrical/devices/PassiveDevices';

/* ─── Voltage Constants (re-exported for backward compat) ─── */
export { V_LOW, V_3V3, V_5V } from './electrical/VoltageEngine';

/* ─── CircuitResult (same shape as before) ─── */
export interface CircuitResult {
    voltages: Record<string, number>;
    activeLEDs: Set<string>;
    activeBuzzers: Set<string>;
    activeDHT11s: Set<string>;
}

/**
 * evaluateCircuit — Drop-in replacement for the old function.
 *
 * Now uses Net/Node graph internally.
 */
export function evaluateCircuit(
    components: LabComponent[],
    wires: Wire[],
    simulationSignals: Record<string, boolean>,
    isSimulating: boolean,
): CircuitResult {
    if (!isSimulating) {
        return {
            voltages: {},
            activeLEDs: new Set(),
            activeBuzzers: new Set(),
            activeDHT11s: new Set(),
        };
    }

    const graph = buildCircuitGraph(components, wires);
    const result = evaluateVoltages(components, graph, simulationSignals, isSimulating);

    return {
        voltages: result.voltages,
        activeLEDs: result.activeLEDs,
        activeBuzzers: result.activeBuzzers,
        activeDHT11s: result.activeDHT11s,
    };
}

/* ─── ValidationResult (same shape as before) ─── */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * validateCircuitTopology — Drop-in replacement.
 *
 * Now uses the generic TopologyValidator.
 * The experimentId and refIdMap are kept in the signature for backward compat
 * but the validation is NO LONGER experiment-specific.
 */
export function validateCircuitTopology(
    _experimentId: string,
    components: LabComponent[],
    wires: Wire[],
    _refIdMap: Record<string, string>,
): ValidationResult {
    const result = validateTopology(components, wires);
    return {
        valid: result.valid,
        error: result.error,
    };
}
