import { evaluateCircuit, validateCircuitTopology } from '../services/ElectricalEngine';
import { ArduinoSimulator } from '../services/Simulator';
import type { LabComponent, Wire } from '../types';

/**
 * Message Types
 */
export type WorkerMessage =
    | { type: 'INIT_CIRCUIT'; components: LabComponent[]; wires: Wire[]; refIdMap: Record<string, string>; experimentId?: string }
    | { type: 'START_SIMULATION' }
    | { type: 'STOP_SIMULATION' }
    | { type: 'LOAD_HEX'; hexData: Uint16Array }
    | { type: 'SET_USER_INPUT_SIGNAL'; pinName: string; value: boolean };

export type WorkerResponse =
    | { type: 'SIMULATION_STATE'; pinVoltages: Record<string, number>; activeLEDs: string[]; activeBuzzers: string[]; activeDHT11s: string[]; timestamp: number }
    | { type: 'TICK_UPDATE'; pinVoltages: Record<string, number>; activeLEDs: string[]; activeBuzzers: string[]; activeDHT11s: string[]; timestamp: number }
    | { type: 'ERROR'; message: string }
    | { type: 'SERIAL_OUTPUT'; char: string };

// Internal Worker State
let components: LabComponent[] = [];
let wires: Wire[] = [];
let refIdMap: Record<string, string> = {};
let experimentId: string | undefined;
let isSimulating = false;
let simulator: ArduinoSimulator | null = null;
let simulationSignals: Record<string, boolean> = {}; // User-driven signals
let loopInterval: ReturnType<typeof setInterval> | null = null;
const TICK_RATE_MS = 16; // ~60Hz


// ── MCU pin output states (buffered from ArduinoSimulator callback) ──
const mcuPinStates: Record<string, boolean> = {};

// ── Built-in blink state (used when no hex firmware loaded) ──
let blinkTimer = 0;
let blinkState = false;

// Setup message listener
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data;

    switch (msg.type) {
        case 'INIT_CIRCUIT':
            components = msg.components;
            wires = msg.wires;
            refIdMap = msg.refIdMap;
            experimentId = msg.experimentId;
            // When circuit changes, re-validate
            if (isSimulating) {
                const isValid = validateTopology(msg.experimentId || 'custom');
                if (!isValid) {
                    stopSimulation();
                    self.postMessage({ type: 'ERROR', message: 'Invalid circuit topology for this experiment.' });
                }
            }
            break;

        case 'LOAD_HEX':
            if (simulator) {
                simulator.stop();
            }
            simulator = new ArduinoSimulator(msg.hexData);
            // Connect MCU pin output callback to buffer states
            simulator.onPinWrite((pin, value) => {
                mcuPinStates[String(pin)] = value;
            });
            simulator.onSerialWrite((char) => {
                self.postMessage({ type: 'SERIAL_OUTPUT', char });
            });
            break;

        case 'START_SIMULATION':
            if (isSimulating) return;
            isSimulating = true;
            blinkTimer = 0;
            blinkState = false;
            if (simulator) simulator.start();
            startLoop();
            break;

        case 'STOP_SIMULATION':
            stopSimulation();
            break;

        case 'SET_USER_INPUT_SIGNAL':
            simulationSignals[msg.pinName] = msg.value;
            break;
    }
};

function validateTopology(expId: string): boolean {
    const result = validateCircuitTopology(expId, components, wires, refIdMap);
    return result.valid;
}

function startLoop() {
    if (loopInterval) clearInterval(loopInterval);

    loopInterval = setInterval(() => {
        executeTick();
    }, TICK_RATE_MS);
}

function stopSimulation() {
    isSimulating = false;
    if (simulator) simulator.stop();
    if (loopInterval) {
        clearInterval(loopInterval);
        loopInterval = null;
    }
    // Clear blink state
    blinkState = false;
    blinkTimer = 0;
}

function executeTick() {
    // 1. Build combined signals: user signals + MCU output pin states
    const combinedSignals: Record<string, boolean> = { ...simulationSignals };

    if (simulator) {
        // Merge MCU pin output states into signals
        for (const [pin, value] of Object.entries(mcuPinStates)) {
            combinedSignals[pin] = value;
        }
    } else {
        // ── No AVR firmware loaded: use built-in behavior per experiment ──
        blinkTimer++;

        switch (experimentId) {
            case 'arduino-led-blink': {
                // Toggle pin 13 at ~1Hz
                if (blinkTimer >= 30) {
                    blinkState = !blinkState;
                    blinkTimer = 0;
                }
                combinedSignals['13'] = blinkState;
                if (blinkTimer === 1) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: blinkState ? 'LED ON\n' : 'LED OFF\n' });
                }
                break;
            }

            case 'arduino-traffic-light': {
                // Cycle: Red(pin13) 3s → Yellow(pin12) 1s → Green(pin11) 3s
                // At 60 ticks/s: Red=180t, Yellow=60t, Green=180t → total 420t
                const cyclePos = blinkTimer % 420;
                combinedSignals['13'] = cyclePos < 180;                    // Red: 0-179
                combinedSignals['12'] = cyclePos >= 180 && cyclePos < 240; // Yellow: 180-239
                combinedSignals['11'] = cyclePos >= 240;                   // Green: 240-419

                if (cyclePos === 0) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: '🔴 RED\n' });
                } else if (cyclePos === 180) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: '🟡 YELLOW\n' });
                } else if (cyclePos === 240) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: '🟢 GREEN\n' });
                }
                break;
            }

            case 'arduino-pot-dimmer': {
                // Simulate a sweep: PWM on pin 9 oscillates 0→255→0
                // Pin 9 toggles at increasing frequency to simulate brightness
                const sweepCycle = blinkTimer % 120;
                const brightness = sweepCycle < 60 ? sweepCycle : 120 - sweepCycle;
                // Simulate PWM as rapid on/off proportional to brightness
                combinedSignals['9'] = (blinkTimer % 60) < brightness;

                if (blinkTimer % 60 === 0) {
                    const analogVal = Math.round((brightness / 60) * 1023);
                    const pwmVal = Math.round((brightness / 60) * 255);
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: `Analog: ${analogVal}  PWM: ${pwmVal}\n` });
                }
                break;
            }

            case 'arduino-button-led': {
                // Pin 13 reflects the user's button signal on pin D2
                const buttonPressed = simulationSignals['D2'] || simulationSignals['2'] || false;
                combinedSignals['13'] = buttonPressed;
                if (blinkTimer % 30 === 0) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: buttonPressed ? 'LED ON\n' : 'LED OFF\n' });
                }
                break;
            }

            case 'rpi-led-blink': {
                // Toggle GPIO17 at ~1Hz
                if (blinkTimer >= 30) {
                    blinkState = !blinkState;
                    blinkTimer = 0;
                }
                combinedSignals['GPIO17'] = blinkState;
                if (blinkTimer === 1) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: blinkState ? 'LED ON\n' : 'LED OFF\n' });
                }
                break;
            }

            case 'rpi-button-led': {
                // GPIO17 reflects button state on GPIO27
                const btnPressed = simulationSignals['GPIO27'] || false;
                combinedSignals['GPIO17'] = btnPressed;
                if (blinkTimer % 30 === 0) {
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: btnPressed ? 'LED ON\n' : 'LED OFF\n' });
                }
                break;
            }

            case 'arduino-dht11-sensor': {
                // Simulate temperature/humidity readings on serial
                if (blinkTimer % 120 === 0) { // Every ~2s
                    const temp = (22 + Math.random() * 6).toFixed(1);
                    const hum = (40 + Math.random() * 30).toFixed(1);
                    self.postMessage({ type: 'SERIAL_OUTPUT', char: `Temperature: ${temp}°C  Humidity: ${hum}%\n` });
                }
                // DHT11 data pin doesn't directly drive LEDs, but mark it active
                combinedSignals['2'] = true; // DATA line active
                break;
            }

            default: {
                // Generic fallback: blink pin 13
                if (blinkTimer >= 30) {
                    blinkState = !blinkState;
                    blinkTimer = 0;
                }
                combinedSignals['13'] = blinkState;
                break;
            }
        }
    }

    // 2. Evaluate electrical circuit with combined signals
    const { voltages, activeLEDs, activeBuzzers, activeDHT11s } = evaluateCircuit(
        components,
        wires,
        combinedSignals,
        true
    );

    // Diagnostic logging removed

    // 3. MCU inputs: Read computed electrical voltages and write to MCU
    if (simulator) {
        for (let i = 0; i <= 13; i++) {
            const arduino = components.find(c => c.type === 'ARDUINO_UNO');
            if (arduino) {
                const pk = `${arduino.id}::D${i}`;
                if (voltages[pk] !== undefined) {
                    const isHigh = voltages[pk] >= 2.5;
                    simulator.setDigitalInput(i, isHigh);
                }
            }
        }

        // Analog pins A0-A5
        for (let i = 0; i <= 5; i++) {
            const arduino = components.find(c => c.type === 'ARDUINO_UNO');
            if (arduino) {
                const pk = `${arduino.id}::A${i}`;
                if (voltages[pk] !== undefined) {
                    const isHigh = voltages[pk] >= 2.5;
                    simulator.setDigitalInput(i + 14, isHigh);
                }
            }
        }
    }

    // 4. Dispatch state to main thread
    self.postMessage({
        type: 'TICK_UPDATE',
        pinVoltages: voltages,
        activeLEDs: Array.from(activeLEDs),
        activeBuzzers: Array.from(activeBuzzers),
        activeDHT11s: Array.from(activeDHT11s),
        timestamp: Date.now()
    } as WorkerResponse);
}
