/**
 * BreadboardDevice — DeviceModule for a half-size breadboard (400 tie-points).
 *
 * Critical: Breadboard has INTERNAL CONNECTIVITY.
 *
 * Layout (half-size, 30 columns):
 *   Top power rail:    + (VCC) pins are all internally connected
 *   Bottom power rail: - (GND) pins are all internally connected
 *   Terminal strips:   Each column in rows A-E are internally connected (vertical group)
 *   Terminal strips:   Each column in rows F-J are internally connected (vertical group)
 *   Center channel:    Separates top half (A-E) from bottom half (F-J)
 *
 * This means:
 *   - A1, B1, C1, D1, E1 are all one net (column 1, top half)
 *   - F1, G1, H1, I1, J1 are all one net (column 1, bottom half)
 *   - All + (VCC) pins are one net
 *   - All - (GND) pins are one net
 */
import type { DeviceModule, PinDefinition, InternalNet, ElectricalState } from '../DeviceModule';
import { registerDevice } from '../DeviceModule';

const ROWS_TOP = ['A', 'B', 'C', 'D', 'E'];
const ROWS_BOTTOM = ['F', 'G', 'H', 'I', 'J'];
const COLUMNS = 30;

function createBreadboardDevice(): DeviceModule {
    const pins: PinDefinition[] = [];
    const internalNets: InternalNet[] = [];

    // ── Power Rail Pins ──
    // VCC rail (all + pins are one net)
    // All + (VCC) pins displayed with same name but different positions
    // For the engine, we treat ALL + (VCC) pins as one net
    pins.push({ name: '+ (VCC)', direction: 'PASSIVE', defaultVoltage: null });
    pins.push({ name: '- (GND)', direction: 'PASSIVE', defaultVoltage: null });

    // ── Terminal Strip Pins ──
    // Top half: rows A-E, 30 columns
    for (let col = 1; col <= COLUMNS; col++) {
        for (const row of ROWS_TOP) {
            pins.push({ name: `${row}${col}`, direction: 'PASSIVE', defaultVoltage: null });
        }
        // Internal net: all pins in this column (top half) are connected
        internalNets.push({
            pins: ROWS_TOP.map(r => `${r}${col}`),
            resistance: 0,
        });
    }

    // Bottom half: rows F-J, 30 columns
    for (let col = 1; col <= COLUMNS; col++) {
        for (const row of ROWS_BOTTOM) {
            pins.push({ name: `${row}${col}`, direction: 'PASSIVE', defaultVoltage: null });
        }
        // Internal net: all pins in this column (bottom half) are connected
        internalNets.push({
            pins: ROWS_BOTTOM.map(r => `${r}${col}`),
            resistance: 0,
        });
    }

    return {
        type: 'BREADBOARD',
        displayName: 'Breadboard (Half-Size)',
        pins,
        internalNets,

        onElectricalUpdate(_state: ElectricalState): void {
            // Breadboard is passive — no active behavior
        },
    };
}

registerDevice('BREADBOARD', createBreadboardDevice);

export { createBreadboardDevice };
