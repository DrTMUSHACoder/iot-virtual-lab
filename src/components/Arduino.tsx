
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Pin } from './Pin';

/*
 * Arduino UNO R3 — Precisely calibrated pin positions.
 *
 * Pins are placed using HARDCODED offsets measured from the board center,
 * matching the actual black header socket holes visible in the 3D model.
 *
 * Model transform: scale 0.28, position Y=0.012, rotation X=-PI/2
 *
 * After calibration the pin sockets sit at:
 *   PIN_Y  = 0.018      ← top surface of the board (just above PCB)
 *   Digital header (D0-D13):  Z = -HALF_D + DIG_Z_INSET  (near edge)
 *   Power/Analog header:      Z = +HALF_D - PWR_Z_INSET  (far edge)
 *
 * To re-calibrate:
 *   1. Enable Labels in the toolbar
 *   2. Zoom in on the Arduino board
 *   3. Adjust DIG_Z_INSET / PWR_Z_INSET / PIN_Y until pins sit IN the sockets
 */

interface ArduinoProps {
    id: string;
    position?: [number, number, number];
}

// ── Physical board constants (scaled to match model) ──────────────────────
const MODEL_SCALE   = 0.28;
const MODEL_OFFSET_Y = 0.012;

// Pin-to-pin pitch: 2.54mm in real life, scaled to model units
const PS = 0.00406;

// Y height at the top SURFACE of the PCB (where header sockets sit)
// Tune this value up/down until pins sit flush in the sockets
const PIN_Y = 0.019;

// Half-dimensions of the Arduino UNO at scale 0.28
// Real UNO: 68.6mm × 53.4mm → at 0.28 scale: ~0.096 × ~0.075 (half = ~0.048 × ~0.038)
const HALF_W = 0.048;   // half of board width  (X axis)
const HALF_D = 0.038;   // half of board depth  (Z axis)

// Z inset from the board edges to where the header row sits
// Digital header (D0–D13) is near ONE edge, Power/Analog near the OTHER
const DIG_Z  = -HALF_D + 0.003;   // digital header row (near -Z edge)
const PWR_Z  =  HALF_D - 0.003;   // power+analog header row (near +Z edge)

// X start position for D0 (TX) — rightmost when USB is on left
// Real UNO digital header starts ~24mm from right edge
const DIG_X_START = HALF_W - PS * 0.5;   // rightmost pin (D0/TX)

// X start for Power header
const PWR_X_START = -HALF_W + PS * 3.0;

export const Arduino: React.FC<ArduinoProps> = ({ id }) => {
    const { scene } = useGLTF('/models/arduino_uno.glb');
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return (
        <group>
            {/* VisualMesh — rotated -90° on X so the board lies flat */}
            <primitive
                object={clonedScene}
                scale={MODEL_SCALE}
                position={[0, MODEL_OFFSET_Y, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            />

            {/* ══════════════════════════════════════════════════════════════
                DIGITAL HEADER  D0–D13
                Physical location: along the long edge of the board closest
                to the USB connector side (-Z side in our coordinate space).
                Pins run right→left: D0(TX) at far right, D13 at far left.
            ══════════════════════════════════════════════════════════════ */}
            <group name="DigitalPins">
                {/* Right cluster: D0–D7 */}
                <Pin name="D0(TX)" position={[DIG_X_START - PS * 0,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D1(RX)" position={[DIG_X_START - PS * 1,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D2"     position={[DIG_X_START - PS * 2,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D3"     position={[DIG_X_START - PS * 3,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D4"     position={[DIG_X_START - PS * 4,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D5"     position={[DIG_X_START - PS * 5,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D6"     position={[DIG_X_START - PS * 6,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D7"     position={[DIG_X_START - PS * 7,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                {/* Left cluster: D8–D13 + AREF/GND (gap ~1 pitch between groups) */}
                <Pin name="D8"     position={[DIG_X_START - PS * 9,  PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D9"     position={[DIG_X_START - PS * 10, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D10"    position={[DIG_X_START - PS * 11, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D11"    position={[DIG_X_START - PS * 12, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D12"    position={[DIG_X_START - PS * 13, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="D13"    position={[DIG_X_START - PS * 14, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="GND"    position={[DIG_X_START - PS * 15, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="AREF"   position={[DIG_X_START - PS * 16, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="SDA"    position={[DIG_X_START - PS * 17, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
                <Pin name="SCL"    position={[DIG_X_START - PS * 18, PIN_Y, DIG_Z]} componentId={id} showShaft={false} />
            </group>

            {/* ══════════════════════════════════════════════════════════════
                POWER HEADER  IOREF→VIN
                Physical location: along the opposite long edge (+Z side).
                Left side of the power header.
            ══════════════════════════════════════════════════════════════ */}
            <group name="PowerPins">
                <Pin name="IOREF"  position={[PWR_X_START + PS * 0, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="RESET"  position={[PWR_X_START + PS * 1, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="3.3V"   position={[PWR_X_START + PS * 2, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="5V"     position={[PWR_X_START + PS * 3, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="GND2"   position={[PWR_X_START + PS * 4, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="GND3"   position={[PWR_X_START + PS * 5, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="VIN"    position={[PWR_X_START + PS * 6, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
            </group>

            {/* ══════════════════════════════════════════════════════════════
                ANALOG HEADER  A0–A5
                Physical location: same edge as Power header, right of Power.
            ══════════════════════════════════════════════════════════════ */}
            <group name="AnalogPins">
                <Pin name="A0" position={[PWR_X_START + PS * 8,  PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="A1" position={[PWR_X_START + PS * 9,  PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="A2" position={[PWR_X_START + PS * 10, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="A3" position={[PWR_X_START + PS * 11, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="A4" position={[PWR_X_START + PS * 12, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
                <Pin name="A5" position={[PWR_X_START + PS * 13, PIN_Y, PWR_Z]} componentId={id} showShaft={false} />
            </group>
        </group>
    );
};
