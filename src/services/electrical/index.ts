/**
 * Electrical Engine — Barrel export.
 *
 * This module re-exports the modular electrical engine components.
 * Import from here instead of individual files.
 */

// Ensure all device modules are registered
import './devices/ArduinoDevice';
import './devices/RaspberryPiDevice';
import './devices/BreadboardDevice';
import './devices/PassiveDevices';

// Core exports
export type { DeviceModule, PinDefinition, InternalNet, ElectricalState } from './DeviceModule';
export { registerDevice, createDevice, getRegisteredTypes } from './DeviceModule';

export type { Net, CircuitGraph } from './NetGraph';
export { buildCircuitGraph, pinKey, getNetForPin, arePinsConnected } from './NetGraph';

export type { TopologyResult } from './TopologyValidator';
export { validateTopology } from './TopologyValidator';

export type { CircuitEvaluation } from './VoltageEngine';
export { evaluateVoltages, V_LOW, V_3V3, V_5V } from './VoltageEngine';
