
import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';



/*
 * Resistor (1/4W axial through-hole) — Calibrated.
 *
 * Real dimensions:
 *   Body : 6.3mm × 2.5mm diameter
 *   Lead : 0.6mm diameter, 25mm length (trimmed)
 *   Total: ~38mm lead-to-lead
 *
 * VR target:
 *   Body : 0.007m × 0.003m radius
 *   Lead : 0.0007m radius, 0.015m length
 */

interface ResistorProps {
    id: string;
}

const COLOR_MAP: Record<number, string> = {
    0: 'black', 1: '#8B4513', 2: '#ff0000', 3: '#ffa500',
    4: '#ffff00', 5: '#008000', 6: '#0000ff', 7: '#ee82ee',
    8: '#808080', 9: '#ffffff'
};

const MULTIPLIER_COLORS: Record<number, string> = {
    ...COLOR_MAP,
    [-1]: '#ffd700',
    [-2]: '#c0c0c0',
};

export const Resistor: React.FC<ResistorProps> = ({ id }) => {
    const components = useLabStore(state => state.components);
    const component = components.find(c => c.id === id);
    const rawValue = component?.value || "220";

    // ── Component-owned breadboard lift ──
    // If this resistor is snapped to a breadboard, sink it by 6mm so the leads 
    // go into the breadboard holes and the body rests on top.
    const isOnBreadboard = (component as any)?.placement?.type === 'breadboard';
    const yLift = isOnBreadboard ? 0.008 : 0.005;

    const resistorData = useMemo(() => {
        let numVal = 0;
        const v = rawValue.toLowerCase().trim();
        if (v.endsWith('k')) numVal = parseFloat(v) * 1000;
        else if (v.endsWith('m')) numVal = parseFloat(v) * 1000000;
        else numVal = parseFloat(v);

        if (isNaN(numVal) || numVal <= 0) return { bands: ['#888', '#888', '#888'], valueLabel: rawValue };

        const exponent = Math.floor(Math.log10(numVal));
        const multiplier = exponent - 1;
        const significants = Math.round(numVal / Math.pow(10, multiplier));

        let finalSignificants = significants;
        let finalMultiplier = multiplier;
        if (finalSignificants >= 100) {
            finalSignificants /= 10;
            finalMultiplier += 1;
        }

        const d1 = Math.floor(finalSignificants / 10);
        const d2 = finalSignificants % 10;

        return {
            bands: [
                COLOR_MAP[d1] || 'brown',
                COLOR_MAP[d2] || 'black',
                MULTIPLIER_COLORS[finalMultiplier] || 'red'
            ],
            valueLabel: rawValue.toUpperCase() + (v.match(/[km]/) ? "" : " Ω")
        };
    }, [rawValue]);

    // Dimensions
    const PITCH = 0.00254; // 2.54mm breadboard pitch
    const PINS_SPACING = PITCH * 4; // Resistor spans 4 holes = 10.16mm (from -5.08 to +5.08)
    const PIN_X = PINS_SPACING / 2; // 0.00508
    const BODY_LENGTH = 0.01; // 10mm
    const BODY_HALF = BODY_LENGTH / 2; // 5mm

    // The vertical down-leads go from Y=0 to Y=0.006.
    // The horizontal leads go from X=BODY_HALF to X=PIN_X at Y=0.006.
    // The body spans from X=-BODY_HALF to X=BODY_HALF at Y=0.006.

    return (
        <group position={[0, yLift, 0]}>
            {/* Body — 7mm long, 3mm radius, oriented along X axis */}
            <mesh position={[0, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.003, 0.003, BODY_LENGTH, 12]} />
                <meshStandardMaterial color="#d1b280" roughness={0.7} />
            </mesh>

            {/* Color Bands — each 1mm wide, 0.3mm proud */}
            <mesh position={[-0.0022, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0033, 0.0033, 0.001, 12]} />
                <meshStandardMaterial color={resistorData.bands[0]} />
            </mesh>
            <mesh position={[-0.001, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0033, 0.0033, 0.001, 12]} />
                <meshStandardMaterial color={resistorData.bands[1]} />
            </mesh>
            <mesh position={[0.0002, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0033, 0.0033, 0.001, 12]} />
                <meshStandardMaterial color={resistorData.bands[2]} />
            </mesh>

            {/* Tolerance band */}
            <mesh position={[0.0022, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0033, 0.0033, 0.001, 12]} />
                <meshStandardMaterial color="#ffd700" />
            </mesh>

            {/* ── Lead Wires (Bent Staple Shape) ── */}
            {/* Left Horizontal Lead */}
            <mesh position={[-(PIN_X + BODY_HALF) / 2, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0004, 0.0004, PIN_X - BODY_HALF, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* Right Horizontal Lead */}
            <mesh position={[(PIN_X + BODY_HALF) / 2, 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0004, 0.0004, PIN_X - BODY_HALF, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* Left Vertical Lead (Goes down) */}
            <mesh position={[-PIN_X, 0.003, 0]}>
                <cylinderGeometry args={[0.0006, 0.0006, 0.008, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* Right Vertical Lead (Goes down) */}
            <mesh position={[PIN_X, 0.003, 0]}>
                <cylinderGeometry args={[0.0006, 0.0006, 0.008, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>

            {/* Value label (Native VR Text) */}
            <Text
                position={[0, 0.010, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.004}
                color="#fbbf24"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.0004}
                outlineColor="#000000"
            >
                {resistorData.valueLabel}
            </Text>

            {/* Pin anchors at the bottom tips of the leads */}
            <Pin name="P1" position={[-PIN_X, 0, 0]} componentId={id} />
            <Pin name="P2" position={[PIN_X, 0, 0]} componentId={id} />
        </group>
    );
};
