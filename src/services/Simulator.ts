import {
    CPU,
    AVRTimer,
    avrInstruction,
    AVRIOPort,
    portBConfig,
    portCConfig,
    portDConfig,
    AVRUSART,
    usart0Config,
    timer0Config,
    timer1Config,
    timer2Config
} from 'avr8js';

// Standard Arduino UNO CPU frequency is 16MHz
const CPU_FREQ_HZ = 16_000_000;
// We target a ~60Hz simulation loop for interactive responsiveness
const SPANS_PER_SECOND = 60;
const CYCLES_PER_SPAN = Math.floor(CPU_FREQ_HZ / SPANS_PER_SECOND);

export class ArduinoSimulator {
    private cpu: CPU;
    private portB: AVRIOPort;
    private portC: AVRIOPort;
    private portD: AVRIOPort;
    private usart: AVRUSART;

    private running = false;
    private flash: Uint16Array;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    // Pin states: 0 to 13, plus A0-A5 (14-19)
    private pinStates = new Array(20).fill(false);

    // Callbacks
    private onPinChangeCallback?: (pin: number, value: boolean) => void;
    private onSerialCallback?: (char: string) => void;

    constructor(hexData: Uint16Array) {
        this.flash = hexData;
        this.cpu = new CPU(this.flash);

        // Timers
        new AVRTimer(this.cpu, timer0Config);
        new AVRTimer(this.cpu, timer1Config);
        new AVRTimer(this.cpu, timer2Config);

        // GPIO Ports
        this.portB = new AVRIOPort(this.cpu, portBConfig); // Pins 8-13
        this.portC = new AVRIOPort(this.cpu, portCConfig); // Analog A0-A5 (14-19)
        this.portD = new AVRIOPort(this.cpu, portDConfig); // Pins 0-7

        // USART (Serial)
        this.usart = new AVRUSART(this.cpu, usart0Config, CPU_FREQ_HZ);
        this.usart.onByteTransmit = (data) => {
            if (this.onSerialCallback) {
                this.onSerialCallback(String.fromCharCode(data));
            }
        };

        // Listen for internal MCU state changes to drive outputs
        this.setupPortListeners();
    }

    private setupPortListeners() {
        // Port D (Pins 0-7)
        this.portD.addListener((value) => {
            for (let i = 0; i < 8; i++) {
                this.updatePinState(i, (value & (1 << i)) !== 0);
            }
        });

        // Port B (Pins 8-13)
        this.portB.addListener((value) => {
            for (let i = 0; i < 6; i++) {
                this.updatePinState(i + 8, (value & (1 << i)) !== 0);
            }
        });

        // Port C (Analog 0-5 => Pins 14-19)
        this.portC.addListener((value) => {
            for (let i = 0; i < 6; i++) {
                this.updatePinState(i + 14, (value & (1 << i)) !== 0);
            }
        });
    }

    private updatePinState(pin: number, state: boolean) {
        if (this.pinStates[pin] !== state) {
            this.pinStates[pin] = state;
            if (this.onPinChangeCallback) {
                this.onPinChangeCallback(pin, state);
            }
        }
    }

    /** Write logic level to Arduino input pin */
    public setDigitalInput(pin: number, state: boolean) {
        // Find correct port and bit based on pin number
        if (pin >= 0 && pin <= 7) {
            this.setPortBit(this.portD, pin, state);
        } else if (pin >= 8 && pin <= 13) {
            this.setPortBit(this.portB, pin - 8, state);
        } else if (pin >= 14 && pin <= 19) {
            this.setPortBit(this.portC, pin - 14, state);
        }
    }

    private setPortBit(port: AVRIOPort, bit: number, state: boolean) {
        // Set PIN register directly to override input states
        const currentPinReg = this.cpu.data[port.portConfig.PIN];
        if (state) {
            this.cpu.data[port.portConfig.PIN] = currentPinReg | (1 << bit);
        } else {
            this.cpu.data[port.portConfig.PIN] = currentPinReg & ~(1 << bit);
        }
    }

    public onPinWrite(callback: (pin: number, value: boolean) => void) {
        this.onPinChangeCallback = callback;
    }

    public onSerialWrite(callback: (char: string) => void) {
        this.onSerialCallback = callback;
    }

    public start() {
        if (this.running) return;
        this.running = true;

        // Fixed tick interval: Target 60Hz update rate
        const intervalMs = 1000 / SPANS_PER_SECOND;
        this.intervalId = setInterval(() => this.executeTick(), intervalMs);
    }

    public stop() {
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private executeTick() {
        if (!this.running) return;

        // Run until cycle limit or breakpoint
        const stopCycle = this.cpu.cycles + CYCLES_PER_SPAN;
        while (this.cpu.cycles < stopCycle) {
            avrInstruction(this.cpu);
            this.cpu.tick(); // advance timers/peripherals
        }
    }
}
