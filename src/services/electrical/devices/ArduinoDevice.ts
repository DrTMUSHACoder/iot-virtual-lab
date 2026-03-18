/**
 * ArduinoDevice — DeviceModule implementation for Arduino UNO R3.
 */
import type { DeviceModule, PinDefinition, ElectricalState } from '../DeviceModule';
import { registerDevice } from '../DeviceModule';

const V_5V = 5;
const V_3V3 = 3.3;
const V_LOW = 0;

const DIGITAL_PINS: PinDefinition[] = Array.from({ length: 14 }, (_, i) => ({
    name: `D${i}`,
    direction: 'BIDIRECTIONAL' as const,
    defaultVoltage: null, // floating until MCU drives them
}));

const ANALOG_PINS: PinDefinition[] = Array.from({ length: 6 }, (_, i) => ({
    name: `A${i}`,
    direction: 'INPUT' as const,
    defaultVoltage: null,
}));

const POWER_PINS: PinDefinition[] = [
    { name: '5V', direction: 'POWER', defaultVoltage: V_5V },
    { name: '3.3V', direction: 'POWER', defaultVoltage: V_3V3 },
    { name: 'GND', direction: 'GROUND', defaultVoltage: V_LOW },
    { name: 'GND2', direction: 'GROUND', defaultVoltage: V_LOW },
    { name: 'VIN', direction: 'POWER', defaultVoltage: null },
    { name: 'RESET', direction: 'INPUT', defaultVoltage: V_5V },
];

function createArduinoDevice(): DeviceModule {
    return {
        type: 'ARDUINO_UNO',
        displayName: 'Arduino UNO R3',
        pins: [...POWER_PINS, ...DIGITAL_PINS, ...ANALOG_PINS],

        // Arduino has internal connections: all GND pins share a net
        internalNets: [
            { pins: ['GND', 'GND2'], resistance: 0 },
        ],

        onElectricalUpdate(_state: ElectricalState): Record<string, number> | void {
            // The Arduino's digital pins are driven by the MCU.
            // This method can be used to read analog inputs in the future.
            // For now, MCU output signals are injected externally via onMCUTick.
        },

        onMCUTick(_cpuState: any): void {
            // Future: read portB/portD registers from cpuState
            // and produce pin voltages accordingly.
        },
    };
}

registerDevice('ARDUINO_UNO', createArduinoDevice);

export { createArduinoDevice };
