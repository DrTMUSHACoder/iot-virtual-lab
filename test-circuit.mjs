/**
 * Standalone test: Does the electrical engine produce correct voltages
 * for the LED Blink experiment circuit?
 * 
 * Circuit: Arduino D13 → LED Anode(+) → LED Cathode(-) → Resistor P1 → Resistor P2 → Arduino GND
 * Signal: combinedSignals['13'] = true (pin 13 HIGH)
 * 
 * Expected:
 *   - Arduino D13 net → 5V
 *   - LED Anode net → 5V (same net as D13 via wire)
 *   - LED Cathode net → ~0V (resistor pulls to ground)
 *   - Resistor P2 / Arduino GND net → 0V
 *   - activeLEDs should contain the LED component ID
 * 
 * Run: node test-circuit.mjs
 */

// We can't import TS directly. Let's manually simulate what the engine does.
// This test verifies the LOGIC, not the runtime imports.

console.log("=== LED Blink Circuit Test ===");
console.log("");

// Simulate the circuit topology
const components = [
    { id: 'arduino-1', type: 'ARDUINO_UNO', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { id: 'led-1', type: 'LED_LIGHT', position: { x: 0.15, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
    { id: 'resistor-1', type: 'RESISTOR', position: { x: 0.2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, value: '220' },
    { id: 'breadboard-1', type: 'BREADBOARD', position: { x: 0.1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
];

const wires = [
    { id: 'w1', startComponentId: 'arduino-1', startPin: 'D13', startOffset: { x: 0, y: 0, z: 0 }, endComponentId: 'led-1', endPin: 'Anode (+)', endOffset: { x: 0, y: 0, z: 0 }, color: '#ff0000' },
    { id: 'w2', startComponentId: 'led-1', startPin: 'Cathode (-)', startOffset: { x: 0, y: 0, z: 0 }, endComponentId: 'resistor-1', endPin: 'P1', endOffset: { x: 0, y: 0, z: 0 }, color: '#00ff00' },
    { id: 'w3', startComponentId: 'resistor-1', startPin: 'P2', startOffset: { x: 0, y: 0, z: 0 }, endComponentId: 'arduino-1', endPin: 'GND', endOffset: { x: 0, y: 0, z: 0 }, color: '#000000' },
];

const signals = { '13': true };

console.log("Components:", components.length);
console.log("Wires:", wires.length);
console.log("Signals:", JSON.stringify(signals));
console.log("");

// Now trace what the engine SHOULD do:
// 1. buildCircuitGraph creates union-find
// 2. Merges pins connected by wires:
//    Wire 1: arduino-1::D13 ∪ led-1::Anode (+) → same net
//    Wire 2: led-1::Cathode (-) ∪ resistor-1::P1 → same net
//    Wire 3: resistor-1::P2 ∪ arduino-1::GND → same net
// 3. Internal nets:
//    Arduino: GND ∪ GND2 (0Ω)
//    LED: Anode (+) ↔ Cathode (-) (20Ω) — DIFFERENT nets, connected by resistance
//    Resistor: P1 ↔ P2 (220Ω) — DIFFERENT nets, connected by resistance
//    Breadboard: various internal connections (not relevant to this circuit)

// After union-find, the nets are:
// Net A: {arduino-1::D13, led-1::Anode (+)}  — connected by wire
// Net B: {led-1::Cathode (-), resistor-1::P1} — connected by wire
// Net C: {resistor-1::P2, arduino-1::GND, arduino-1::GND2} — connected by wire + internal net

// Resistances between nets:
// Net A ↔ Net B: 20Ω (LED internal)
// Net B ↔ Net C: 220Ω (Resistor internal)

console.log("Expected Net Structure:");
console.log("  Net A: [D13, LED Anode]");
console.log("  Net B: [LED Cathode, Resistor P1]");
console.log("  Net C: [Resistor P2, Arduino GND, Arduino GND2]");
console.log("");

// 4. evaluateVoltages:
//    Step 1 - Seed sources:
//      Arduino 5V pin → 5V (but not connected to any wire in this circuit)
//      Arduino GND pin → 0V → Net C gets voltage = 0
//      Signal '13' = true → Arduino D13 net → 5V → Net A gets voltage = 5

console.log("Voltage Seeding:");
console.log("  Net A (D13): 5V (from signal '13' = true)");
console.log("  Net C (GND): 0V (from Arduino GND pin)");
console.log("  Net B: initially unknown");
console.log("");

// Step 2 - Gauss-Seidel relaxation:
//   Net B is connected to Net A (5V) via 20Ω, and to Net C (0V) via 220Ω
//   Net B voltage = (5V/20Ω + 0V/220Ω) / (1/20Ω + 1/220Ω)
//   = (0.25 + 0) / (0.05 + 0.004545)
//   = 0.25 / 0.054545
//   = 4.583V

const gA = 1 / 20;   // conductance to Net A
const gC = 1 / 220;  // conductance to Net C
const vA = 5;      // Net A voltage
const vC = 0;      // Net C voltage
const vB = (gA * vA + gC * vC) / (gA + gC);

console.log("Gauss-Seidel Solver:");
console.log(`  G_to_A = 1/20Ω = ${gA.toFixed(4)}`);
console.log(`  G_to_C = 1/220Ω = ${gC.toFixed(4)}`);
console.log(`  V_B = (${gA.toFixed(4)}×${vA} + ${gC.toFixed(4)}×${vC}) / (${gA.toFixed(4)} + ${gC.toFixed(4)})`);
console.log(`  V_B = ${vB.toFixed(3)}V`);
console.log("");

// Step 3 - LED activation check:
const anodeV = vA;     // Net A = 5V
const cathodeV = vB;   // Net B = ~4.58V (LED cathode is in Net B!)
const vDrop = anodeV - cathodeV;
const LED_FORWARD_VOLTAGE = 1.8;

console.log("LED Activation Check:");
console.log(`  Anode voltage:   ${anodeV.toFixed(2)}V`);
console.log(`  Cathode voltage: ${cathodeV.toFixed(2)}V`);
console.log(`  Voltage drop:    ${vDrop.toFixed(2)}V`);
console.log(`  Forward threshold: ${LED_FORWARD_VOLTAGE}V`);
console.log(`  LED would be active: ${vDrop >= LED_FORWARD_VOLTAGE}`);
console.log("");

// NOW check the LED.tsx threshold:
// isVoltageActive = anodeV > 1.5 && cathodeV < 0.5
console.log("LED.tsx Threshold Check:");
console.log(`  anodeV (${anodeV.toFixed(2)}) > 1.5: ${anodeV > 1.5}`);
console.log(`  cathodeV (${cathodeV.toFixed(2)}) < 0.5: ${cathodeV < 0.5}`);
console.log(`  isVoltageActive: ${anodeV > 1.5 && cathodeV < 0.5}`);
console.log("");

if (cathodeV >= 0.5) {
    console.log("🔴 BUG FOUND: LED.tsx cathode threshold (< 0.5) FAILS!");
    console.log("   Cathode voltage is " + cathodeV.toFixed(2) + "V, not near 0V");
    console.log("   This is because LED Cathode is in Net B, which has voltage ~4.58V");
    console.log("   The Gauss-Seidel solver treats the LED as a resistor (20Ω) between nets,");
    console.log("   so Net B gets pulled toward 5V (low resistance path to 5V Net A).");
    console.log("");
    console.log("   FIX: The LED.tsx should NOT check cathode < 0.5.");
    console.log("   Instead, it should check the voltage DROP (anode - cathode >= 1.8V)");
    console.log("   OR rely on activeLEDs from the VoltageEngine.");
}

console.log("");
console.log("=== ALSO checking VoltageEngine LED activation (activeLEDs) ===");
console.log(`  VoltageEngine checks: vDrop = ${anodeV.toFixed(2)} - ${cathodeV.toFixed(2)} = ${vDrop.toFixed(2)}V`);
console.log(`  vDrop >= 1.8: ${vDrop >= 1.8}`);
if (vDrop < 1.8) {
    console.log("🔴 BUG: VoltageEngine also won't add LED to activeLEDs!");
    console.log("   Drop is only " + vDrop.toFixed(2) + "V, below 1.8V threshold");
    console.log("   This means component.value will never be 'ON'");
} else {
    console.log("✅ VoltageEngine would add LED to activeLEDs");
}
