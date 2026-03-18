import type { Experiment } from '../types';

/*
 * ═══════════════════════════════════════════════════════════════════
 *  EXPERIMENTS — All wiring offsets calibrated to real pin positions.
 *
 *  Pin offset reference (from component center):
 *    Arduino UNO:
 *      D13 = [-0.0385 + 0.00284*5, 0.012, -0.030]  ≈ [-0.0243, 0.012, -0.030]
 *      GND = [-0.0385 + 0.00284*3, 0.012,  0.030]  ≈ [-0.0300, 0.012,  0.030]
 *      5V  = [-0.0385 + 0.00284*2, 0.012,  0.030]  ≈ [-0.0328, 0.012,  0.030]
 *      D2  = [-0.0385 + 0.00284*2, 0.012, -0.03+0.00284] ≈ [-0.0328, 0.012, -0.027]
 *    LED:
 *      Anode  = [0.00142, 0.005, 0]
 *      Cathode = [-0.00142, 0.005, 0]
 *    Resistor:
 *      P1 = [0, 0.015, 0]  (rotated π/2 on Z, so effective Y up)
 *      P2 = [0, -0.015, 0]
 *    DHT11:
 *      VCC  = [0.00284, 0.008, 0]
 *      DATA = [0, 0.008, 0]
 *      GND  = [-0.00284, 0.008, 0]
 *    Switch:
 *      Common = [0, 0.005, 0.00284]
 *      Output = [0, 0.005, -0.00284]
 *    RPi GPIO:
 *      GPIO17 = [-0.035, 0.014, -0.027+5*0.00284] ≈ [-0.035, 0.014, -0.0128]
 * ═══════════════════════════════════════════════════════════════════
 */

// Arduino pin positions (relative to component center)
const PS = 0.00284;
const A_HW = 0.0385;
const A_HD = 0.030;
const A_PY = 0.012;

// Helper: Arduino digital pin offset
const aDigital = (pin: number): { x: number; y: number; z: number } => {
    if (pin <= 7) return { x: -A_HW + PS * pin, y: A_PY, z: -A_HD + PS };
    return { x: -A_HW + PS * (pin - 8), y: A_PY, z: -A_HD };
};

// Arduino power pin offsets (RESET, 3.3V, 5V, GND, GND2, VIN at bottom row)
const aPower = (idx: number): { x: number; y: number; z: number } => (
    { x: -A_HW + PS * idx, y: A_PY, z: A_HD }
);

// LED pin offsets
const LED_ANODE = { x: 0.00142, y: 0.005, z: 0 };
const LED_CATHODE = { x: -0.00142, y: 0.005, z: 0 };

// Resistor pin offsets (rotated, so Y axis becomes lead direction)
const R_P1 = { x: 0, y: 0.0095, z: 0 };
const R_P2 = { x: 0, y: -0.0095, z: 0 };

// DHT11 pin offsets
const DHT_VCC = { x: PS, y: 0.008, z: 0 };
const DHT_DATA = { x: 0, y: 0.008, z: 0 };
const DHT_GND = { x: -PS, y: 0.008, z: 0 };

// Switch pin offsets
const SW_COMMON = { x: 0, y: 0.005, z: PS };
const SW_OUTPUT = { x: 0, y: 0.005, z: -PS };

// RPi GPIO pin offsets
const RPI_PY = 0.014;
const RPI_HDR_X = -0.035;
const RPI_Z_START = -0.027;
const rpiLeft = (row: number) => ({ x: RPI_HDR_X, y: RPI_PY, z: RPI_Z_START + row * PS });

export const EXPERIMENTS: Experiment[] = [
    /* ═══════════════════════════════════════════════
       EXPERIMENT 1 — LED Blink (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-led-blink',
        title: 'LED Blink',
        description: 'The classic first Arduino project — blink an LED on and off every second using digital output.',
        category: 'Arduino',
        difficulty: 'Beginner',
        icon: '💡',
        components: [
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'led-1', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E14'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A14', 'A18'] } },
        ],
        wiring: [
            { startRefId: 'uno-1', startPin: 'D13', startOffset: aDigital(13), endRefId: 'bb-1', endPin: 'A12', endOffset: { x: 0, y: 0.012, z: 0 }, color: '#ff6b35' }, // We'll compute offsets dynamically in wire renderer if needed, or pass 0
            { startRefId: 'uno-1', startPin: 'GND', startOffset: aPower(3), endRefId: 'bb-1', endPin: 'B18', endOffset: { x: 0, y: 0.012, z: 0 }, color: '#2d3436' },
        ],
        code: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Digital Output Control',
            objective: 'Understand how Arduino drives an LED using HIGH and LOW digital signals through a current-limiting resistor.',
        },
        quiz: [
            {
                question: 'What happens if the 220Ω resistor is removed from the circuit?',
                options: [
                    { text: 'The LED glows brighter', correct: false },
                    { text: 'The LED burns out due to excess current', correct: true },
                    { text: 'Nothing changes', correct: false },
                    { text: 'The Arduino resets', correct: false },
                ],
                explanation: 'Without a current-limiting resistor, too much current flows through the LED, exceeding its rated maximum and permanently damaging it.',
            },
            {
                question: 'What does digitalWrite(13, HIGH) do?',
                options: [
                    { text: 'Sets pin 13 to 0V', correct: false },
                    { text: 'Sets pin 13 to 5V', correct: true },
                    { text: 'Reads the voltage on pin 13', correct: false },
                    { text: 'Configures pin 13 as input', correct: false },
                ],
                explanation: 'digitalWrite(pin, HIGH) sets the output pin to 5V (logic HIGH), which provides current to drive the LED.',
            },
            {
                question: 'Why does the LED blink instead of staying on?',
                options: [
                    { text: 'The breadboard switches it off', correct: false },
                    { text: 'The code alternates HIGH and LOW with delay()', correct: true },
                    { text: 'The resistor limits the power', correct: false },
                    { text: 'The Arduino has a built-in blink function', correct: false },
                ],
                explanation: 'The loop() function alternately writes HIGH and LOW to pin 13, with delay(1000) pausing 1 second between each change.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'The Arduino Uno, Breadboard, LED, and 220Ω Resistor are placed on the workbench. The components are inserted into the breadboard.' },
            { title: 'Enable Wiring Mode', description: 'Click "Start Wire" at the bottom of the screen. Pin connection points will appear.' },
            {
                title: 'Wire Signal D13 → Breadboard A12',
                description: '🔌 Connect Arduino Pin D13 to Breadboard hole A12. The LED Anode is in E12, so this connects them.',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D13', toRefId: 'bb-1', toPin: 'A12', wireColor: '#ff6b35' },
                hint: 'Look for pin D13 on the Arduino digital header (top row). Then find hole A12 on the breadboard.',
                highlightHoles: ['A12'],
            },
            {
                title: 'Internal Connection',
                description: 'The LED Cathode (E14) is internally connected to the Resistor (A14) by the breadboard column strip. No wire needed!',
            },
            {
                title: 'Wire Ground GND → Breadboard B18',
                description: '🔌 Connect Arduino GND to Breadboard hole B18. The Resistor P2 is in A18, so this completes the circuit ground path.',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'GND', toRefId: 'bb-1', toPin: 'B18', wireColor: '#2d3436' },
                hint: 'The GND pin is on the Arduino power header (bottom row). Connect to B18 near the resistor.',
                highlightHoles: ['B18'],
            },
            { title: 'Run Simulation', description: '✅ Circuit complete! Click "Run SIM" to start the simulation. The LED will blink on and off every second.' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 2 — Traffic Light (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-traffic-light',
        title: 'Traffic Light Controller',
        description: 'Simulate a real traffic light using 3 LEDs (Red, Yellow, Green) controlled by Arduino timing.',
        category: 'Arduino',
        difficulty: 'Beginner',
        icon: '🚦',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'led-r', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E5', 'E7'] } },
            { refId: 'led-y', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E14'] } },
            { refId: 'led-g', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E19', 'E21'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A5', 'A9'] } },
            { refId: 'r-2', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A12', 'A16'] } },
            { refId: 'r-3', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A19', 'A23'] } },
        ],
        wiring: [
            { startRefId: 'uno-1', startPin: 'D13', startOffset: aDigital(13), endRefId: 'led-r', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#e74c3c' },
            { startRefId: 'led-r', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#636e72' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'uno-1', startPin: 'D12', startOffset: aDigital(12), endRefId: 'led-y', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#f39c12' },
            { startRefId: 'led-y', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-2', endPin: 'P1', endOffset: R_P1, color: '#636e72' },
            { startRefId: 'r-2', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'uno-1', startPin: 'D11', startOffset: aDigital(11), endRefId: 'led-g', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#27ae60' },
            { startRefId: 'led-g', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-3', endPin: 'P1', endOffset: R_P1, color: '#636e72' },
            { startRefId: 'r-3', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
        ],
        code: `// Traffic Light Controller
int redPin = 13;
int yellowPin = 12;
int greenPin = 11;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
}

void loop() {
  digitalWrite(redPin, HIGH);
  delay(3000);
  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, HIGH);
  delay(1000);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, HIGH);
  delay(3000);
  digitalWrite(greenPin, LOW);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Sequential Output Control',
            objective: 'Learn to control multiple digital outputs in a timed sequence to simulate real-world traffic light behavior.',
        },
        quiz: [
            {
                question: 'Why does each LED need its own resistor?',
                options: [
                    { text: 'To make the circuit look neat', correct: false },
                    { text: 'Each LED needs independent current limiting to prevent damage', correct: true },
                    { text: 'Sharing a resistor would make LEDs brighter', correct: false },
                    { text: 'The Arduino requires separate resistors', correct: false },
                ],
                explanation: 'Each LED has its own current path. A shared resistor would cause inconsistent brightness and could damage LEDs when multiple are on simultaneously.',
            },
            {
                question: 'In a real traffic light, why is there a yellow phase?',
                options: [
                    { text: 'To test if the LED works', correct: false },
                    { text: 'To warn drivers of an upcoming change', correct: true },
                    { text: 'Because yellow uses less power', correct: false },
                    { text: 'It is purely decorative', correct: false },
                ],
                explanation: 'The yellow (amber) phase provides a transition warning so drivers can prepare to stop or clear the intersection safely.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, 3 LEDs (Red, Yellow, Green), 3 × 220Ω Resistors, Breadboard.' },
            { title: 'Enable Wiring Mode', description: 'Click "Start Wire" to reveal all pin connection points.' },
            {
                title: 'Wire D13 → Red LED',
                description: '🔌 Connect Arduino Pin D13 to the Red LED Anode (+).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D13', toRefId: 'led-r', toPin: 'Anode (+)', wireColor: '#e74c3c' }
            },
            {
                title: 'Wire Red Cathode → R1',
                description: '🔌 Connect Red LED Cathode (-) to Resistor R1 (P1).',
                expectedConnection: { fromRefId: 'led-r', fromPin: 'Cathode (-)', toRefId: 'r-1', toPin: 'P1', wireColor: '#636e72' }
            },
            {
                title: 'Wire R1 → GND',
                description: '🔌 Connect Resistor R1 (P2) to Arduino GND.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire D12 → Yellow LED',
                description: '🔌 Connect Pin D12 to Yellow LED Anode (+).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D12', toRefId: 'led-y', toPin: 'Anode (+)', wireColor: '#f39c12' }
            },
            {
                title: 'Wire Yellow Cathode → R2',
                description: '🔌 Connect Yellow LED Cathode (-) to R2 (P1).',
                expectedConnection: { fromRefId: 'led-y', fromPin: 'Cathode (-)', toRefId: 'r-2', toPin: 'P1', wireColor: '#636e72' }
            },
            {
                title: 'Wire R2 → GND',
                description: '🔌 Connect R2 (P2) to Arduino GND.',
                expectedConnection: { fromRefId: 'r-2', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire D11 → Green LED',
                description: '🔌 Connect Pin D11 to Green LED Anode (+).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D11', toRefId: 'led-g', toPin: 'Anode (+)', wireColor: '#27ae60' }
            },
            {
                title: 'Wire Green Cathode → R3',
                description: '🔌 Connect Green LED Cathode (-) to R3 (P1).',
                expectedConnection: { fromRefId: 'led-g', fromPin: 'Cathode (-)', toRefId: 'r-3', toPin: 'P1', wireColor: '#636e72' }
            },
            {
                title: 'Wire R3 → GND',
                description: '🔌 Connect R3 (P2) to Arduino GND.',
                expectedConnection: { fromRefId: 'r-3', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            { title: 'Run Simulation', description: '✅ All done! Click "Run SIM" to see the traffic light cycle!' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 3 — LED Brightness Control (Potentiometer)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-pot-dimmer',
        title: 'LED Brightness Control',
        description: 'Control LED brightness using a potentiometer and analogRead() + analogWrite() (PWM).',
        category: 'Arduino',
        difficulty: 'Beginner',
        icon: '🔆',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'led-1', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E14'] } },
            { refId: 'pot-1', type: 'POTENTIOMETER', placement: { type: 'breadboard', refId: 'bb-1', holes: ['J5', 'J6', 'J7'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A14', 'A18'] } },
        ],
        wiring: [
            { startRefId: 'uno-1', startPin: 'D9', startOffset: aDigital(9), endRefId: 'led-1', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#ff6b35' },
            { startRefId: 'led-1', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#4ecdc4' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'pot-1', startPin: 'A', startOffset: { x: PS, y: 0.005, z: PS }, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
            { startRefId: 'pot-1', startPin: 'B', startOffset: { x: -PS, y: 0.005, z: PS }, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'pot-1', startPin: 'Wiper', startOffset: { x: 0, y: 0.005, z: PS }, endRefId: 'uno-1', endPin: 'A0', endOffset: { x: -A_HW, y: A_PY, z: A_HD - PS }, color: '#9b59b6' },
        ],
        code: `int potPin = A0;
int ledPin = 9;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int val = analogRead(potPin);
  int brightness = map(val, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);
  Serial.print("Analog: ");
  Serial.print(val);
  Serial.print("  PWM: ");
  Serial.println(brightness);
  delay(100);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Analog Input & PWM Output',
            objective: 'Learn how analogRead() converts voltage to a digital value and analogWrite() uses PWM to vary brightness.',
        },
        quiz: [
            {
                question: 'What range does analogRead() return on Arduino?',
                options: [
                    { text: '0 to 100', correct: false },
                    { text: '0 to 1023', correct: true },
                    { text: '0 to 255', correct: false },
                    { text: '0 to 5', correct: false },
                ],
                explanation: 'The Arduino has a 10-bit ADC, so analogRead() returns values from 0 (0V) to 1023 (5V).',
            },
            {
                question: 'What does PWM stand for?',
                options: [
                    { text: 'Power Width Modulation', correct: false },
                    { text: 'Pulse Width Modulation', correct: true },
                    { text: 'Pin Wave Mode', correct: false },
                    { text: 'Phase Width Modulation', correct: false },
                ],
                explanation: 'PWM (Pulse Width Modulation) rapidly switches a pin on and off. The duty cycle ratio controls average power, simulating analog output.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, Breadboard, LED, 220Ω Resistor, Potentiometer.' },
            { title: 'Enable Wiring Mode', description: 'Click "Start Wire" to reveal pins.' },
            {
                title: 'Wire D9 → LED',
                description: '🔌 Connect Arduino PWM Pin D9 to LED Anode (+).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D9', toRefId: 'led-1', toPin: 'Anode (+)', wireColor: '#ff6b35' }
            },
            {
                title: 'Wire LED → Resistor',
                description: '🔌 Connect LED Cathode (-) to Resistor P1.',
                expectedConnection: { fromRefId: 'led-1', fromPin: 'Cathode (-)', toRefId: 'r-1', toPin: 'P1', wireColor: '#4ecdc4' }
            },
            {
                title: 'Wire Resistor → GND',
                description: '🔌 Connect Resistor P2 to GND.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire Pot A → 5V',
                description: '🔌 Connect Potentiometer pin A to Arduino 5V.',
                expectedConnection: { fromRefId: 'pot-1', fromPin: 'A', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' }
            },
            {
                title: 'Wire Pot B → GND',
                description: '🔌 Connect Potentiometer pin B to Arduino GND.',
                expectedConnection: { fromRefId: 'pot-1', fromPin: 'B', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire Wiper → A0',
                description: '🔌 Connect Potentiometer Wiper to Arduino A0.',
                expectedConnection: { fromRefId: 'pot-1', fromPin: 'Wiper', toRefId: 'uno-1', toPin: 'A0', wireColor: '#9b59b6' }
            },
            { title: 'Run Simulation', description: '✅ Done! Run SIM and click the potentiometer knob to change the LED brightness.' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 4 — Button-Controlled LED
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-button-led',
        title: 'Button-Controlled LED',
        description: 'Use a tactile push button to toggle an LED on and off with digitalRead() input.',
        category: 'Arduino',
        difficulty: 'Beginner',
        icon: '🔘',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'led-1', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E14'] } },
            { refId: 'sw-1', type: 'SWITCH', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E5', 'F5'] } }, // spans across the center trench
            { refId: 'r-1', type: 'RESISTOR', value: '220', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A14', 'A18'] } }, // Current limiting
            { refId: 'r-2', type: 'RESISTOR', value: '10k', placement: { type: 'breadboard', refId: 'bb-1', holes: ['J5', 'J9'] } }, // Pull-down
        ],
        wiring: [
            { startRefId: 'uno-1', startPin: 'D13', startOffset: aDigital(13), endRefId: 'led-1', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#ff6b35' },
            { startRefId: 'led-1', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#4ecdc4' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'sw-1', startPin: 'Common', startOffset: SW_COMMON, endRefId: 'uno-1', endPin: 'D2', endOffset: aDigital(2), color: '#3498db' },
            { startRefId: 'sw-1', startPin: 'Output', startOffset: SW_OUTPUT, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
            { startRefId: 'r-2', startPin: 'P1', startOffset: R_P1, endRefId: 'uno-1', endPin: 'D2', endOffset: aDigital(2), color: '#9b59b6' },
            { startRefId: 'r-2', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
        ],
        code: `int buttonPin = 2;
int ledPin = 13;
bool ledState = false;
bool lastButton = false;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  bool current = digitalRead(buttonPin);
  if (current && !lastButton) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState ? HIGH : LOW);
    Serial.println(ledState ? "LED ON" : "LED OFF");
  }
  lastButton = current;
  delay(50);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Digital Input & Debouncing',
            objective: 'Learn how digitalRead() detects button presses and how edge detection prevents multiple triggers.',
        },
        quiz: [
            {
                question: 'Why is a pull-down resistor needed with the button?',
                options: [
                    { text: 'To make the button click louder', correct: false },
                    { text: 'To ensure a defined LOW state when the button is not pressed', correct: true },
                    { text: 'To increase button voltage', correct: false },
                    { text: 'To protect the Arduino from overcurrent', correct: false },
                ],
                explanation: 'Without a pull-down resistor, the input pin floats when the button is open, reading random HIGH/LOW values. The 10kΩ resistor holds it at a stable LOW.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, Breadboard, LED, Switch, 220Ω Resistor (for LED), 10kΩ Pull-down Resistor.' },
            { title: 'Start Wires', description: 'Click "Start Wire" to enter wiring mode.' },
            {
                title: 'Wire D13 → LED',
                description: '🔌 Connect D13 to LED Anode (+).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D13', toRefId: 'led-1', toPin: 'Anode (+)', wireColor: '#ff6b35' }
            },
            {
                title: 'Wire LED → R1',
                description: '🔌 Connect LED Cathode (-) to R1 (P1).',
                expectedConnection: { fromRefId: 'led-1', fromPin: 'Cathode (-)', toRefId: 'r-1', toPin: 'P1', wireColor: '#4ecdc4' }
            },
            {
                title: 'Wire R1 → GND',
                description: '🔌 Complete LED ground path.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire Button → D2',
                description: '🔌 Connect Switch Common to D2.',
                expectedConnection: { fromRefId: 'sw-1', fromPin: 'Common', toRefId: 'uno-1', toPin: 'D2', wireColor: '#3498db' }
            },
            {
                title: 'Wire Button → 5V',
                description: '🔌 Connect Switch Output to 5V.',
                expectedConnection: { fromRefId: 'sw-1', fromPin: 'Output', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' }
            },
            {
                title: 'Wire Pull-down R2 → D2',
                description: '🔌 Connect 10kΩ pull-down R2 (P1) to D2.',
                expectedConnection: { fromRefId: 'r-2', fromPin: 'P1', toRefId: 'uno-1', toPin: 'D2', wireColor: '#9b59b6' }
            },
            {
                title: 'Wire R2 → GND',
                description: '🔌 Connect R2 (P2) to GND.',
                expectedConnection: { fromRefId: 'r-2', fromPin: 'P2', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            { title: 'Run & Press Button', description: '✅ Done! Run SIM and click the switch to toggle the LED!' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 5 — Raspberry Pi LED Blink (GPIO)
       ═══════════════════════════════════════════════ */
    {
        id: 'rpi-led-blink',
        title: 'RPi LED Blink',
        description: 'Blink an LED using Raspberry Pi GPIO output with Python.',
        category: 'Raspberry Pi',
        difficulty: 'Beginner',
        icon: '🍓',
        components: [
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'rpi-1', type: 'RASPBERRY_PI', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'led-1', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E15', 'E17'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '330', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A17', 'A21'] } },
        ],
        wiring: [
            { startRefId: 'rpi-1', startPin: 'GPIO17', startOffset: rpiLeft(5), endRefId: 'led-1', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#e67e22' },
            { startRefId: 'led-1', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#636e72' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'rpi-1', endPin: 'GND', endOffset: rpiLeft(4), color: '#2d3436' },
        ],
        code: `import RPi.GPIO as GPIO
import time

LED_PIN = 17

GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)

try:
    while True:
        GPIO.output(LED_PIN, True)
        print("LED ON")
        time.sleep(1)
        GPIO.output(LED_PIN, False)
        print("LED OFF")
        time.sleep(1)
except KeyboardInterrupt:
    GPIO.cleanup()`,
        codeLanguage: 'python',
        learning: {
            concept: 'GPIO Output with Raspberry Pi',
            objective: 'Understand BCM pin numbering and Python GPIO library for controlling hardware outputs.',
        },
        quiz: [
            {
                question: 'What does GPIO.BCM mode mean?',
                options: [
                    { text: 'Use physical board pin numbers', correct: false },
                    { text: 'Use Broadcom SOC channel numbers', correct: true },
                    { text: 'Use binary coded mode', correct: false },
                    { text: 'Use a custom numbering scheme', correct: false },
                ],
                explanation: 'BCM mode uses the Broadcom chip GPIO numbers (e.g., GPIO17), not the physical pin header positions (e.g., pin 11).',
            },
            {
                question: 'Why is GPIO.cleanup() called in the except block?',
                options: [
                    { text: 'To restart the Pi', correct: false },
                    { text: 'To reset all GPIO pins to a safe state', correct: true },
                    { text: 'To save the program', correct: false },
                    { text: 'It is not necessary', correct: false },
                ],
                explanation: 'GPIO.cleanup() resets all pins used by the program to input mode, preventing shorts or leftover outputs when the program exits.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Raspberry Pi, Breadboard, LED, 330Ω Resistor.' },
            { title: 'Enable Wiring', description: 'Click "Start Wire" to begin.' },
            {
                title: 'Wire GPIO17 → LED',
                description: '🔌 Connect RPi GPIO17 to LED Anode (+).',
                expectedConnection: { fromRefId: 'rpi-1', fromPin: 'GPIO17', toRefId: 'led-1', toPin: 'Anode (+)', wireColor: '#e67e22' }
            },
            {
                title: 'Wire LED → Resistor',
                description: '🔌 Connect LED Cathode (-) to Resistor P1.',
                expectedConnection: { fromRefId: 'led-1', fromPin: 'Cathode (-)', toRefId: 'r-1', toPin: 'P1', wireColor: '#636e72' }
            },
            {
                title: 'Wire Resistor → GND',
                description: '🔌 Connect Resistor P2 to RPi GND.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'rpi-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            { title: 'Run Simulation', description: '✅ Done! Click "Run on Pi (Simulated)" to see the LED blink!' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 6 — Raspberry Pi Button + LED
       ═══════════════════════════════════════════════ */
    {
        id: 'rpi-button-led',
        title: 'RPi Button + LED',
        description: 'Read a button press on Raspberry Pi GPIO and toggle an LED with Python.',
        category: 'Raspberry Pi',
        difficulty: 'Intermediate',
        icon: '🔲',
        components: [
            { refId: 'rpi-1', type: 'RASPBERRY_PI', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'led-1', type: 'LED_LIGHT', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E14'] } },
            { refId: 'sw-1', type: 'SWITCH', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E5', 'F5'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '330', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A14', 'A18'] } },
            { refId: 'r-2', type: 'RESISTOR', value: '10k', placement: { type: 'breadboard', refId: 'bb-1', holes: ['J5', 'J9'] } },
        ],
        wiring: [
            { startRefId: 'rpi-1', startPin: 'GPIO17', startOffset: rpiLeft(5), endRefId: 'led-1', endPin: 'Anode (+)', endOffset: LED_ANODE, color: '#e67e22' },
            { startRefId: 'led-1', startPin: 'Cathode (-)', startOffset: LED_CATHODE, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#636e72' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'rpi-1', endPin: 'GND', endOffset: rpiLeft(4), color: '#2d3436' },
            { startRefId: 'sw-1', startPin: 'Common', startOffset: SW_COMMON, endRefId: 'rpi-1', endPin: 'GPIO27', endOffset: rpiLeft(6), color: '#3498db' },
            { startRefId: 'sw-1', startPin: 'Output', startOffset: SW_OUTPUT, endRefId: 'rpi-1', endPin: '3.3V', endOffset: rpiLeft(0), color: '#e74c3c' },
            { startRefId: 'r-2', startPin: 'P1', startOffset: R_P1, endRefId: 'rpi-1', endPin: 'GPIO27', endOffset: rpiLeft(6), color: '#9b59b6' },
            { startRefId: 'r-2', startPin: 'P2', startOffset: R_P2, endRefId: 'rpi-1', endPin: 'GND', endOffset: rpiLeft(4), color: '#2d3436' },
        ],
        code: `import RPi.GPIO as GPIO
import time

LED_PIN = 17
BTN_PIN = 27
led_state = False

GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.setup(BTN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

try:
    while True:
        if GPIO.input(BTN_PIN):
            led_state = not led_state
            GPIO.output(LED_PIN, led_state)
            print("LED", "ON" if led_state else "OFF")
            time.sleep(0.3)
        time.sleep(0.05)
except KeyboardInterrupt:
    GPIO.cleanup()`,
        codeLanguage: 'python',
        learning: {
            concept: 'GPIO Input & Output Combined',
            objective: 'Learn to read digital input from a button and control output to an LED using Raspberry Pi GPIO.',
        },
        quiz: [
            {
                question: 'Why use 3.3V instead of 5V for the button on Raspberry Pi?',
                options: [
                    { text: 'To save power', correct: false },
                    { text: 'RPi GPIO pins are 3.3V-tolerant only — 5V can damage them', correct: true },
                    { text: '3.3V is easier to wire', correct: false },
                    { text: 'There is no difference', correct: false },
                ],
                explanation: 'Raspberry Pi GPIO operates at 3.3V logic. Applying 5V directly to a GPIO input pin can permanently damage the SoC.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Raspberry Pi, Breadboard, LED, Switch, 330Ω Resistor (LED), 10kΩ Pull-down.' },
            { title: 'Start Wiring', description: 'Click "Start Wire".' },
            {
                title: 'Wire GPIO17 → LED',
                description: '🔌 Connect GPIO17 to LED Anode (+).',
                expectedConnection: { fromRefId: 'rpi-1', fromPin: 'GPIO17', toRefId: 'led-1', toPin: 'Anode (+)', wireColor: '#e67e22' }
            },
            {
                title: 'Wire LED → Resistor',
                description: '🔌 Connect LED Cathode (-) to R1 P1.',
                expectedConnection: { fromRefId: 'led-1', fromPin: 'Cathode (-)', toRefId: 'r-1', toPin: 'P1', wireColor: '#636e72' }
            },
            {
                title: 'Wire R1 → GND',
                description: '🔌 Connect R1 P2 to RPi GND.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'rpi-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire Button → GPIO27',
                description: '🔌 Connect Switch Common to GPIO27.',
                expectedConnection: { fromRefId: 'sw-1', fromPin: 'Common', toRefId: 'rpi-1', toPin: 'GPIO27', wireColor: '#3498db' }
            },
            {
                title: 'Wire Button → 3.3V',
                description: '🔌 Connect Switch Output to 3.3V.',
                expectedConnection: { fromRefId: 'sw-1', fromPin: 'Output', toRefId: 'rpi-1', toPin: '3.3V', wireColor: '#e74c3c' }
            },
            {
                title: 'Wire Pull-down → GPIO27',
                description: '🔌 Connect 10kΩ R2 (P1) to GPIO27.',
                expectedConnection: { fromRefId: 'r-2', fromPin: 'P1', toRefId: 'rpi-1', toPin: 'GPIO27', wireColor: '#9b59b6' }
            },
            {
                title: 'Wire R2 → GND',
                description: '🔌 Connect R2 (P2) to RPi GND.',
                expectedConnection: { fromRefId: 'r-2', fromPin: 'P2', toRefId: 'rpi-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            { title: 'Run & Press Button', description: '✅ All wired! Click "Run on Pi (Simulated)", then click the switch to toggle the LED!' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 7 — DHT11 Temperature & Humidity Sensor (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-dht11-sensor',
        title: 'DHT11 Sensor Reading',
        description: 'Read temperature and humidity data from a DHT11 sensor and display values on the serial monitor.',
        category: 'Arduino',
        difficulty: 'Intermediate',
        icon: '🌡',
        components: [
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'dht-1', type: 'DHT11_SENSOR', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E5', 'E6', 'E7', 'E8'] } }, // Adjust holes natively based on DHT pin count if 3 or 4
            { refId: 'r-1', type: 'RESISTOR', value: '10k', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A10', 'A14'] } },
        ],
        wiring: [
            { startRefId: 'dht-1', startPin: 'VCC', startOffset: DHT_VCC, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
            { startRefId: 'dht-1', startPin: 'GND', startOffset: DHT_GND, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'dht-1', startPin: 'DATA', startOffset: DHT_DATA, endRefId: 'uno-1', endPin: 'D2', endOffset: aDigital(2), color: '#3498db' },
            { startRefId: 'dht-1', startPin: 'DATA', startOffset: DHT_DATA, endRefId: 'r-1', endPin: 'P1', endOffset: R_P1, color: '#9b59b6' },
            { startRefId: 'r-1', startPin: 'P2', startOffset: R_P2, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
        ],
        code: `#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("DHT11 Sensor Ready");
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[ERROR] Failed to read DHT11!");
    return;
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C  Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  delay(2000);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Sensor Data Acquisition',
            objective: 'Learn how to use a digital sensor library to read environmental data and display it via serial communication.',
        },
        quiz: [
            {
                question: 'Why does the DHT11 need a pull-up resistor on the DATA line?',
                options: [
                    { text: 'To increase the voltage', correct: false },
                    { text: 'To ensure reliable signal levels on the open-drain communication bus', correct: true },
                    { text: 'To reduce noise on the power line', correct: false },
                    { text: 'The resistor is optional', correct: false },
                ],
                explanation: 'The DHT11 uses a single-wire open-drain protocol. The pull-up resistor ensures the line returns to HIGH when neither device is driving it LOW.',
            },
            {
                question: 'What does isnan() check for in the code?',
                options: [
                    { text: 'If the number is negative', correct: false },
                    { text: 'If the reading failed and returned Not-A-Number', correct: true },
                    { text: 'If the sensor is disconnected', correct: false },
                    { text: 'If the value is zero', correct: false },
                ],
                explanation: 'When the DHT11 fails to respond, the library returns NaN (Not-A-Number). isnan() detects this to handle errors gracefully.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, DHT11 Sensor (3 pins: VCC, DATA, GND), Breadboard, and 10kΩ Pull-up Resistor.' },
            { title: 'Enable Wiring Mode', description: 'Click "Start Wire" to reveal all pin connection points on each component.' },
            {
                title: 'Wire DHT11 VCC → 5V',
                description: '🔌 Connect the DHT11 VCC pin to Arduino 5V. This provides power to the sensor.',
                expectedConnection: { fromRefId: 'dht-1', fromPin: 'VCC', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' }
            },
            {
                title: 'Wire DHT11 GND → GND',
                description: '🔌 Connect the DHT11 GND pin to Arduino GND. This completes the power circuit.',
                expectedConnection: { fromRefId: 'dht-1', fromPin: 'GND', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' }
            },
            {
                title: 'Wire DATA → D2',
                description: '🔌 Connect the DHT11 DATA pin to Arduino Pin D2. This is the digital signal line.',
                expectedConnection: { fromRefId: 'dht-1', fromPin: 'DATA', toRefId: 'uno-1', toPin: 'D2', wireColor: '#3498db' }
            },
            {
                title: 'Wire DATA → Pull-up Resistor',
                description: '🔌 Connect DHT11 DATA pin to 10kΩ Resistor P1. This is a pull-up resistor for reliable signal.',
                expectedConnection: { fromRefId: 'dht-1', fromPin: 'DATA', toRefId: 'r-1', toPin: 'P1', wireColor: '#9b59b6' }
            },
            {
                title: 'Wire Pull-up → 5V',
                description: '🔌 Connect 10kΩ Resistor P2 to Arduino 5V. This completes the pull-up resistor circuit.',
                expectedConnection: { fromRefId: 'r-1', fromPin: 'P2', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' }
            },
            { title: 'Run & Monitor', description: '✅ Circuit complete! Click "Run SIM" and open the Serial Monitor (📟 Serial button) to see live temperature and humidity readings.' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 8 — Buzzer Alarm (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-buzzer-alarm',
        title: 'Buzzer Alarm',
        description: 'Make a piezo buzzer beep on and off using Arduino digital output — hear real audio feedback!',
        category: 'Arduino',
        difficulty: 'Beginner',
        icon: '🔔',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'bz-1', type: 'BUZZER', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E12', 'E13'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '100', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A12', 'A8'] } },
        ],
        wiring: [
            { startRefId: 'uno-1', startPin: 'D8', startOffset: aDigital(8), endRefId: 'bb-1', endPin: 'A8', endOffset: { x: 0, y: 0.018, z: 0 }, color: '#e67e22' },
            { startRefId: 'uno-1', startPin: 'GND', startOffset: aPower(3), endRefId: 'bb-1', endPin: 'B13', endOffset: { x: 0, y: 0.018, z: 0 }, color: '#2d3436' },
        ],
        code: `int buzzerPin = 8;

void setup() {
  pinMode(buzzerPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Buzzer Alarm Ready");
}

void loop() {
  digitalWrite(buzzerPin, HIGH);
  Serial.println("BEEP!");
  delay(500);
  digitalWrite(buzzerPin, LOW);
  Serial.println("...");
  delay(500);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Audio Output with Piezo Buzzer',
            objective: 'Learn how digital HIGH/LOW signals drive a piezo buzzer to produce audible tones.',
        },
        quiz: [
            {
                question: 'What type of signal does a piezo buzzer need to produce sound?',
                options: [
                    { text: 'Constant DC voltage', correct: false },
                    { text: 'An oscillating (switching) signal', correct: true },
                    { text: 'Analog voltage', correct: false },
                    { text: 'No signal — it generates its own', correct: false },
                ],
                explanation: 'A piezo buzzer vibrates when voltage alternates. The faster the switching, the higher the pitch. Our code toggles HIGH/LOW at ~1Hz for a beeping effect.',
            },
            {
                question: 'Why is a 100Ω resistor used in series with the buzzer?',
                options: [
                    { text: 'To increase the volume', correct: false },
                    { text: 'To limit current and protect the Arduino pin', correct: true },
                    { text: 'To change the frequency', correct: false },
                    { text: 'The resistor is optional', correct: false },
                ],
                explanation: 'Arduino GPIO pins can supply up to 40mA. The resistor ensures the buzzer doesn\'t draw more current than the pin can safely provide.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, Breadboard, Piezo Buzzer, 100Ω Resistor.' },
            { title: 'Enable Wiring Mode', description: 'Click "Wiring ON" to reveal pin connection points.' },
            {
                title: 'Wire D8 → Breadboard A8',
                description: '🔌 Connect Arduino Pin D8 to Breadboard hole A8. This sends the signal through the resistor to the buzzer.',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D8', toRefId: 'bb-1', toPin: 'A8', wireColor: '#e67e22' },
                hint: 'Find D8 on the Arduino digital header (top row, second from left).',
                highlightHoles: ['A8'],
            },
            {
                title: 'Wire GND → Breadboard B13',
                description: '🔌 Connect Arduino GND to Breadboard hole B13. This completes the buzzer ground path.',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'GND', toRefId: 'bb-1', toPin: 'B13', wireColor: '#2d3436' },
                hint: 'GND is on the Arduino power header (bottom row).',
                highlightHoles: ['B13'],
            },
            { title: 'Run Simulation', description: '✅ Done! Click "Simulate" to hear the buzzer beep on and off! 🔊' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 9 — Ultrasonic Distance Sensor (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-ultrasonic',
        title: 'Ultrasonic Distance Sensor',
        description: 'Measure distances using the HC-SR04 ultrasonic sensor and display readings on the Serial Monitor.',
        category: 'Arduino',
        difficulty: 'Intermediate',
        icon: '📏',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'us-1', type: 'ULTRASONIC_SENSOR', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E8', 'E9', 'E10', 'E11'] } },
        ],
        wiring: [
            { startRefId: 'us-1', startPin: 'VCC', startOffset: { x: -PS * 1.5, y: 0.005, z: PS * 3 }, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
            { startRefId: 'us-1', startPin: 'Trig', startOffset: { x: -PS * 0.5, y: 0.005, z: PS * 3 }, endRefId: 'uno-1', endPin: 'D9', endOffset: aDigital(9), color: '#3498db' },
            { startRefId: 'us-1', startPin: 'Echo', startOffset: { x: PS * 0.5, y: 0.005, z: PS * 3 }, endRefId: 'uno-1', endPin: 'D10', endOffset: aDigital(10), color: '#f39c12' },
            { startRefId: 'us-1', startPin: 'GND', startOffset: { x: PS * 1.5, y: 0.005, z: PS * 3 }, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
        ],
        code: `int trigPin = 9;
int echoPin = 10;

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.begin(9600);
  Serial.println("Ultrasonic Sensor Ready");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  float distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  delay(500);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Ultrasonic Distance Measurement',
            objective: 'Learn how the HC-SR04 uses echo timing to calculate distances, and how pulseIn() measures signal duration.',
        },
        quiz: [
            {
                question: 'How does the HC-SR04 sensor measure distance?',
                options: [
                    { text: 'Using infrared light', correct: false },
                    { text: 'By sending ultrasonic pulses and timing the echo return', correct: true },
                    { text: 'Using a laser beam', correct: false },
                    { text: 'With a pressure sensor', correct: false },
                ],
                explanation: 'The HC-SR04 emits a 40kHz ultrasonic burst from the Trig pin. When the echo bounces back, the Echo pin goes HIGH for a duration proportional to the distance.',
            },
            {
                question: 'Why is the duration multiplied by 0.034 and divided by 2?',
                options: [
                    { text: 'To convert to inches', correct: false },
                    { text: 'Speed of sound is 0.034 cm/µs, divided by 2 because sound travels there and back', correct: true },
                    { text: 'To account for sensor error', correct: false },
                    { text: 'It\'s an arbitrary calibration constant', correct: false },
                ],
                explanation: 'Sound travels at ~343 m/s = 0.034 cm/µs. The measured duration is for the round trip (to target and back), so we halve it.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, Breadboard, HC-SR04 Ultrasonic Sensor (4 pins: VCC, Trig, Echo, GND).' },
            { title: 'Enable Wiring', description: 'Click "Wiring ON" to reveal connection points.' },
            {
                title: 'Wire VCC → 5V',
                description: '🔌 Connect the sensor VCC pin to Arduino 5V for power.',
                expectedConnection: { fromRefId: 'us-1', fromPin: 'VCC', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' },
            },
            {
                title: 'Wire Trig → D9',
                description: '🔌 Connect the Trig pin to Arduino D9. This sends the ultrasonic pulse.',
                expectedConnection: { fromRefId: 'us-1', fromPin: 'Trig', toRefId: 'uno-1', toPin: 'D9', wireColor: '#3498db' },
            },
            {
                title: 'Wire Echo → D10',
                description: '🔌 Connect the Echo pin to Arduino D10. This receives the return signal.',
                expectedConnection: { fromRefId: 'us-1', fromPin: 'Echo', toRefId: 'uno-1', toPin: 'D10', wireColor: '#f39c12' },
            },
            {
                title: 'Wire GND → GND',
                description: '🔌 Connect sensor GND to Arduino GND.',
                expectedConnection: { fromRefId: 'us-1', fromPin: 'GND', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' },
            },
            { title: 'Run & Monitor', description: '✅ All wired! Click "Simulate" and open Serial Monitor to see distance readings in cm.' },
        ],
    },

    /* ═══════════════════════════════════════════════
       EXPERIMENT 10 — Gas Sensor Alert (Arduino)
       ═══════════════════════════════════════════════ */
    {
        id: 'arduino-gas-alert',
        title: 'Gas Sensor Alert',
        description: 'Read analog values from an MQ-series gas sensor and trigger a buzzer alarm when gas concentration exceeds a threshold.',
        category: 'Arduino',
        difficulty: 'Intermediate',
        icon: '🛢',
        components: [
            { refId: 'uno-1', type: 'ARDUINO_UNO', position: { x: -0.15, y: 0.8, z: 0 } },
            { refId: 'bb-1', type: 'BREADBOARD', position: { x: 0.15, y: 0.8, z: 0 } },
            { refId: 'gs-1', type: 'GAS_SENSOR', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E5', 'E6', 'E7', 'E8'] } },
            { refId: 'bz-1', type: 'BUZZER', placement: { type: 'breadboard', refId: 'bb-1', holes: ['E18', 'E19'] } },
            { refId: 'r-1', type: 'RESISTOR', value: '100', placement: { type: 'breadboard', refId: 'bb-1', holes: ['A18', 'A14'] } },
        ],
        wiring: [
            { startRefId: 'gs-1', startPin: 'VCC', startOffset: { x: -PS * 1.5, y: 0.005, z: PS * 3.5 }, endRefId: 'uno-1', endPin: '5V', endOffset: aPower(2), color: '#e74c3c' },
            { startRefId: 'gs-1', startPin: 'GND', startOffset: { x: -PS * 0.5, y: 0.005, z: PS * 3.5 }, endRefId: 'uno-1', endPin: 'GND', endOffset: aPower(3), color: '#2d3436' },
            { startRefId: 'gs-1', startPin: 'AO', startOffset: { x: PS * 1.5, y: 0.005, z: PS * 3.5 }, endRefId: 'uno-1', endPin: 'A0', endOffset: { x: -A_HW, y: A_PY, z: A_HD - PS }, color: '#9b59b6' },
            { startRefId: 'uno-1', startPin: 'D8', startOffset: aDigital(8), endRefId: 'bb-1', endPin: 'A14', endOffset: { x: 0, y: 0.018, z: 0 }, color: '#e67e22' },
            { startRefId: 'uno-1', startPin: 'GND', startOffset: aPower(3), endRefId: 'bb-1', endPin: 'B19', endOffset: { x: 0, y: 0.018, z: 0 }, color: '#2d3436' },
        ],
        code: `int gasPin = A0;
int buzzerPin = 8;
int threshold = 400;

void setup() {
  pinMode(buzzerPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Gas Sensor Alert System Ready");
}

void loop() {
  int gasValue = analogRead(gasPin);
  Serial.print("Gas Level: ");
  Serial.print(gasValue);

  if (gasValue > threshold) {
    digitalWrite(buzzerPin, HIGH);
    Serial.println(" ⚠ ALERT! Gas detected!");
  } else {
    digitalWrite(buzzerPin, LOW);
    Serial.println(" ✓ Normal");
  }

  delay(500);
}`,
        codeLanguage: 'cpp',
        learning: {
            concept: 'Analog Sensor + Threshold Alert',
            objective: 'Learn to read analog sensor data with analogRead(), compare against a threshold, and trigger an output alarm.',
        },
        quiz: [
            {
                question: 'What does analogRead(A0) return when the gas sensor detects high concentration?',
                options: [
                    { text: 'A value close to 0', correct: false },
                    { text: 'A high value (closer to 1023)', correct: true },
                    { text: 'Always exactly 512', correct: false },
                    { text: 'A negative number', correct: false },
                ],
                explanation: 'MQ-series sensors output higher voltage (closer to 5V) at higher gas concentrations. The Arduino ADC maps 0-5V to 0-1023.',
            },
            {
                question: 'What is the purpose of the threshold variable?',
                options: [
                    { text: 'To set the maximum volume of the buzzer', correct: false },
                    { text: 'To define the gas level at which the alarm triggers', correct: true },
                    { text: 'To calibrate the sensor voltage', correct: false },
                    { text: 'To set the sampling rate', correct: false },
                ],
                explanation: 'The threshold (400 out of 1023) defines the boundary between "safe" and "alert" gas levels. Values above it trigger the buzzer alarm.',
            },
        ],
        steps: [
            { title: 'Observe Components', description: 'Identify: Arduino Uno, Breadboard, MQ Gas Sensor (4 pins), Piezo Buzzer, 100Ω Resistor.' },
            { title: 'Enable Wiring', description: 'Click "Wiring ON" to begin connecting.' },
            {
                title: 'Wire Gas VCC → 5V',
                description: '🔌 Power the gas sensor by connecting VCC to Arduino 5V.',
                expectedConnection: { fromRefId: 'gs-1', fromPin: 'VCC', toRefId: 'uno-1', toPin: '5V', wireColor: '#e74c3c' },
            },
            {
                title: 'Wire Gas GND → GND',
                description: '🔌 Connect Gas Sensor GND to Arduino GND.',
                expectedConnection: { fromRefId: 'gs-1', fromPin: 'GND', toRefId: 'uno-1', toPin: 'GND', wireColor: '#2d3436' },
            },
            {
                title: 'Wire Gas AO → A0',
                description: '🔌 Connect Gas Sensor Analog Output (AO) to Arduino A0 for analog reading.',
                expectedConnection: { fromRefId: 'gs-1', fromPin: 'AO', toRefId: 'uno-1', toPin: 'A0', wireColor: '#9b59b6' },
            },
            {
                title: 'Wire D8 → Buzzer (via Resistor)',
                description: '🔌 Connect Arduino D8 to Breadboard A14 (connected to resistor → buzzer).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'D8', toRefId: 'bb-1', toPin: 'A14', wireColor: '#e67e22' },
                highlightHoles: ['A14'],
            },
            {
                title: 'Wire GND → Buzzer Ground',
                description: '🔌 Connect Arduino GND to Breadboard B19 (buzzer ground).',
                expectedConnection: { fromRefId: 'uno-1', fromPin: 'GND', toRefId: 'bb-1', toPin: 'B19', wireColor: '#2d3436' },
                highlightHoles: ['B19'],
            },
            { title: 'Run & Monitor', description: '✅ Circuit complete! Click "Simulate" — watch the Serial Monitor for gas readings. When levels exceed 400, the buzzer sounds! 🔊' },
        ],
    },
];
