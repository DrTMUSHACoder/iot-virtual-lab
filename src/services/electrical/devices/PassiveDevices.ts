/**
 * PassiveDevices — DeviceModules for LED, Resistor, Buzzer, DHT11, Battery, etc.
 *
 * These are simple 2-terminal or 3-terminal devices.
 */
import type { DeviceModule, ElectricalState } from '../DeviceModule';
import { registerDevice } from '../DeviceModule';

/* ═══════════════════════════════════════════
 * LED
 * ═══════════════════════════════════════════ */
function createLEDDevice(): DeviceModule {
    return {
        type: 'LED_LIGHT',
        displayName: 'LED',
        pins: [
            { name: 'Anode (+)', direction: 'PASSIVE', defaultVoltage: null },
            { name: 'Cathode (-)', direction: 'PASSIVE', defaultVoltage: null },
        ],
        // LED has NO internal net — current flows through it only when forward biased
        // The engine checks voltage difference across terminals
        internalNets: [
            // Forward-biased path: Anode → Cathode (modeled as very low resistance diode)
            { pins: ['Anode (+)', 'Cathode (-)'], resistance: 20 }, // ~20Ω forward resistance
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // LED activation is determined by the VoltageEngine based on
            // voltage difference across Anode/Cathode
        },
    };
}

/* ═══════════════════════════════════════════
 * RESISTOR
 * ═══════════════════════════════════════════ */
function createResistorDevice(): DeviceModule {
    return {
        type: 'RESISTOR',
        displayName: 'Resistor',
        pins: [
            { name: 'P1', direction: 'PASSIVE', defaultVoltage: null },
            { name: 'P2', direction: 'PASSIVE', defaultVoltage: null },
        ],
        internalNets: [
            // Resistor passes current through with resistance
            // Default 220Ω — can be overridden by component.value
            { pins: ['P1', 'P2'], resistance: 220 },
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // Passive — no active behavior
        },
    };
}

/* ═══════════════════════════════════════════
 * BUZZER
 * ═══════════════════════════════════════════ */
function createBuzzerDevice(): DeviceModule {
    return {
        type: 'BUZZER',
        displayName: 'Buzzer',
        pins: [
            { name: '(+)', direction: 'PASSIVE', defaultVoltage: null },
            { name: '(-)', direction: 'PASSIVE', defaultVoltage: null },
        ],
        internalNets: [
            { pins: ['(+)', '(-)'], resistance: 50 },
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // Buzzer activation determined by voltage engine
        },
    };
}

/* ═══════════════════════════════════════════
 * DHT11 SENSOR
 * ═══════════════════════════════════════════ */
function createDHT11Device(): DeviceModule {
    return {
        type: 'DHT11_SENSOR',
        displayName: 'DHT11 Temperature/Humidity Sensor',
        pins: [
            { name: 'VCC', direction: 'POWER', defaultVoltage: null },
            { name: 'DATA', direction: 'BIDIRECTIONAL', defaultVoltage: null },
            { name: 'GND', direction: 'GROUND', defaultVoltage: null },
        ],
        internalNets: [], // No internal passthrough — VCC powers the IC
        onElectricalUpdate(_state: ElectricalState): void {
            // Future: generate simulated temperature/humidity readings
        },
    };
}

/* ═══════════════════════════════════════════
 * BATTERY (5V)
 * ═══════════════════════════════════════════ */
function createBatteryDevice(): DeviceModule {
    return {
        type: 'BATTERY',
        displayName: 'Battery (5V)',
        pins: [
            { name: '(+)', direction: 'POWER', defaultVoltage: 5 },
            { name: '(-)', direction: 'GROUND', defaultVoltage: 0 },
        ],
        internalNets: [],
        onElectricalUpdate(_state: ElectricalState): void {
            // Battery is a voltage source — always outputs its rated voltage
        },
    };
}

/* ═══════════════════════════════════════════
 * POTENTIOMETER
 * ═══════════════════════════════════════════ */
function createPotentiometerDevice(): DeviceModule {
    return {
        type: 'POTENTIOMETER',
        displayName: 'Potentiometer',
        pins: [
            { name: 'Terminal 1', direction: 'PASSIVE', defaultVoltage: null },
            { name: 'Wiper', direction: 'PASSIVE', defaultVoltage: null },
            { name: 'Terminal 2', direction: 'PASSIVE', defaultVoltage: null },
        ],
        internalNets: [
            { pins: ['Terminal 1', 'Wiper'], resistance: 5000 },   // half of 10kΩ default
            { pins: ['Wiper', 'Terminal 2'], resistance: 5000 },
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // Future: wiper position adjusts resistance ratio
        },
    };
}

/* ═══════════════════════════════════════════
 * SWITCH
 * ═══════════════════════════════════════════ */
function createSwitchDevice(): DeviceModule {
    return {
        type: 'SWITCH',
        displayName: 'Switch',
        pins: [
            { name: 'Common', direction: 'PASSIVE', defaultVoltage: null },
            { name: 'Output', direction: 'PASSIVE', defaultVoltage: null },
        ],
        internalNets: [
            // When closed: 0Ω. When open: Infinity.
            // Default: closed
            { pins: ['Common', 'Output'], resistance: 0 },
        ],
        onElectricalUpdate(_state: ElectricalState): void {
            // Future: toggle state changes resistance between 0 and Infinity
        },
    };
}

/* ═══════════════════════════════════════════
 * REGISTER ALL
 * ═══════════════════════════════════════════ */
registerDevice('LED_LIGHT', createLEDDevice);
registerDevice('RESISTOR', createResistorDevice);
registerDevice('BUZZER', createBuzzerDevice);
registerDevice('DHT11_SENSOR', createDHT11Device);
registerDevice('BATTERY', createBatteryDevice);
registerDevice('POTENTIOMETER', createPotentiometerDevice);
registerDevice('SWITCH', createSwitchDevice);

export {
    createLEDDevice,
    createResistorDevice,
    createBuzzerDevice,
    createDHT11Device,
    createBatteryDevice,
    createPotentiometerDevice,
    createSwitchDevice,
};
