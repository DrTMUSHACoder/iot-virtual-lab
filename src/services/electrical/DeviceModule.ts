/**
 * DeviceModule — Standard interface for all pluggable electronic devices.
 *
 * Every device (Arduino, Raspberry Pi, LED, Resistor, ESP32, etc.)
 * implements this interface so the engine can register and simulate
 * it without hardcoded switch-case logic.
 *
 * Architecture:
 *   Rendering Layer → never touches this.
 *   Interaction Layer → never touches this.
 *   Electrical Engine → uses this to build the circuit graph.
 */

/* ─── Pin Types ─── */
export type PinDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL' | 'POWER' | 'GROUND' | 'PASSIVE';

export interface PinDefinition {
    /** Pin name as displayed in the UI (e.g. 'D13', 'GPIO17', 'Anode (+)') */
    name: string;
    /** Electrical direction */
    direction: PinDirection;
    /** Default voltage when the device is powered (null = floating) */
    defaultVoltage: number | null;
    /** Group for internal connectivity (e.g. resistor legs are in group 'passthrough') */
    group?: string;
}

/* ─── Internal Net (for devices with internal connections) ─── */
export interface InternalNet {
    /** Pins that are internally connected within this device */
    pins: string[];
    /** Resistance of this internal path in ohms (0 = short/wire, Infinity = open) */
    resistance: number;
}

/* ─── Electrical State passed to devices each tick ─── */
export interface ElectricalState {
    /** Voltage at each pin: pinName → voltage */
    pinVoltages: Record<string, number>;
    /** Current flowing through each pin (estimated): pinName → amps */
    pinCurrents: Record<string, number>;
    /** Whether simulation is active */
    isSimulating: boolean;
}

/* ─── Device Module Interface ─── */
export interface DeviceModule {
    /** Unique type identifier (matches LabComponentType) */
    readonly type: string;
    /** Human-readable name */
    readonly displayName: string;
    /** All pins this device exposes */
    readonly pins: PinDefinition[];
    /** Internal connections within the device (e.g. resistor legs, breadboard rails) */
    readonly internalNets: InternalNet[];
    /**
     * Called every simulation tick with the current electrical state.
     * Device can update its internal state (e.g. LED on/off, buzzer sound).
     * Returns any signals the device wants to produce (e.g. MCU pin outputs).
     */
    onElectricalUpdate(state: ElectricalState): Record<string, number> | void;
    /**
     * Called every MCU tick (only for MCU-type devices like Arduino/RPi).
     * Allows the device to read from/write to the CPU state.
     */
    onMCUTick?(cpuState: any): void;
}

/* ─── Device Registry ─── */
const deviceRegistry = new Map<string, () => DeviceModule>();

export function registerDevice(type: string, factory: () => DeviceModule): void {
    deviceRegistry.set(type, factory);
}

export function createDevice(type: string): DeviceModule | null {
    const factory = deviceRegistry.get(type);
    return factory ? factory() : null;
}

export function getRegisteredTypes(): string[] {
    return Array.from(deviceRegistry.keys());
}
