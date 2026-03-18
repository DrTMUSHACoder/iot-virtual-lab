/**
 * RaspberryPiDevice — DeviceModule for Raspberry Pi 4.
 */
import type { DeviceModule, PinDefinition, ElectricalState } from '../DeviceModule';
import { registerDevice } from '../DeviceModule';

const V_5V = 5;
const V_3V3 = 3.3;
const V_LOW = 0;

// Official 40-pin GPIO pinout
const GPIO_PIN_DEFS: PinDefinition[] = [
    { name: '3.3V', direction: 'POWER', defaultVoltage: V_3V3 },
    { name: '5V', direction: 'POWER', defaultVoltage: V_5V },
    { name: 'GPIO 2', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 3', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 4', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GND', direction: 'GROUND', defaultVoltage: V_LOW },
    { name: 'GPIO 14', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 15', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 17', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 18', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 27', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 22', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 23', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 24', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 10', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 9', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 25', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 11', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 8', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 7', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 0', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 1', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 5', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 6', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 12', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 13', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 19', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 16', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 26', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 20', direction: 'BIDIRECTIONAL', defaultVoltage: null },
    { name: 'GPIO 21', direction: 'BIDIRECTIONAL', defaultVoltage: null },
];

function createRaspberryPiDevice(): DeviceModule {
    return {
        type: 'RASPBERRY_PI',
        displayName: 'Raspberry Pi 4',
        pins: GPIO_PIN_DEFS,
        // All GND pins are internally connected on the Pi
        internalNets: [
            { pins: ['GND'], resistance: 0 },
            // Note: the Pi has multiple physical GND pins but in our current
            // 3D model they appear with unique names. If we add GND-2 etc, add them here.
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // Future: read GPIO states from the Pi's virtual CPU
        },
        onMCUTick(_cpuState: any): void {
            // Future: integration with a Python runtime or GPIO simulator
        },
    };
}

registerDevice('RASPBERRY_PI', createRaspberryPiDevice);

export { createRaspberryPiDevice };
