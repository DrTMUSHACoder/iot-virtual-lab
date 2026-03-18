
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Pin } from './Pin';

/*
 * Breadboard — Half-size (400 tie-points), scaled for visibility.
 *
 * Real dimensions : 83mm × 55mm × 10mm
 * VR scale ×1.5  : ~125mm × 82mm
 *
 * Layout:
 *   Power rails (+/-) top and bottom
 *   Terminal strips: rows A–E and F–J, 30 columns
 *   Center channel gap
 */

interface BreadboardProps {
    id: string;
}


export const Breadboard: React.FC<BreadboardProps> = ({ id }) => {
    const { scene } = useGLTF('/models/arduino_breadboard_-_low_poly.glb');

    const boardModel = useMemo(() => {
        if (!scene) return null;
        const s = scene.clone();
        s.traverse((node) => {
            if (!(node as any).isMesh) return;
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        });
        return s;
    }, [scene]);


    return (
        <group>
            {boardModel ? (
                <primitive
                    object={boardModel}
                    scale={0.00035} // Balanced size — clear but not oversized
                    position={[0, 0, 0]}
                />
            ) : (
                <mesh position={[0, 0.005, 0]} receiveShadow>
                    <boxGeometry args={[0.125, 0.011, 0.082]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>
            )}

            {/* ═══ POWER RAILS (3 anchors per rail on full-size boards) ═══ */}
            <group name="PowerRails">
                {/* Top power rails (-Z side) */}
                <Pin name="+ (VCC_T)" position={[-0.076, 0.018, -0.024]} componentId={id} showShaft={false} />
                <Pin name="+ (VCC_T)" position={[0, 0.018, -0.024]} componentId={id} showShaft={false} />
                <Pin name="+ (VCC_T)" position={[0.076, 0.018, -0.024]} componentId={id} showShaft={false} />

                <Pin name="- (GND_T)" position={[-0.076, 0.018, -0.021]} componentId={id} showShaft={false} />
                <Pin name="- (GND_T)" position={[0, 0.018, -0.021]} componentId={id} showShaft={false} />
                <Pin name="- (GND_T)" position={[0.076, 0.018, -0.021]} componentId={id} showShaft={false} />

                {/* Bottom power rails (+Z side) */}
                <Pin name="+ (VCC_B)" position={[-0.076, 0.018, 0.024]} componentId={id} showShaft={false} />
                <Pin name="+ (VCC_B)" position={[0, 0.018, 0.024]} componentId={id} showShaft={false} />
                <Pin name="+ (VCC_B)" position={[0.076, 0.018, 0.024]} componentId={id} showShaft={false} />

                <Pin name="- (GND_B)" position={[-0.076, 0.018, 0.021]} componentId={id} showShaft={false} />
                <Pin name="- (GND_B)" position={[0, 0.018, 0.021]} componentId={id} showShaft={false} />
                <Pin name="- (GND_B)" position={[0.076, 0.018, 0.021]} componentId={id} showShaft={false} />
            </group>

            {/* ═══ TERMINAL STRIPS ═══ */}
            <group name="TerminalStrips">
                {Array.from({ length: 63 }).map((_, c) => {
                    const colNum = c + 1;
                    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(row => {
                        const holeId = `${row}${colNum}`;
                        const pos = getBreadboardHoleLocalPosition(holeId);
                        if (!pos) return null;
                        return (
                            <Pin key={holeId} name={holeId} position={[pos.x, pos.y, pos.z]} componentId={id} showShaft={false} />
                        );
                    });
                })}
            </group>
        </group>
    );
};

export function getBreadboardHoleLocalPosition(holeId: string): THREE.Vector3 | null {
    const PITCH = 0.0036; // Increased pitch for scaled breadboard (2.54mm * 1.4)
    const PIN_Y = 0.018;

    const match = holeId.match(/^([A-J])(\d+)$/i);
    if (!match) return null;

    const rowLetter = match[1].toUpperCase();
    const rowNum = parseInt(match[2], 10); // 1 to 63

    if (rowNum < 1 || rowNum > 63) return null;

    // The breadboard origin (0,0,0) is at the geometric center.
    // Row 32 is the exact center along the X axis (63 rows total)
    // Positive X is towards row 63, negative X is towards row 1.
    const rowOffsetX = (rowNum - 32) * PITCH;

    // Columns A-J are along the Z axis.
    // Gap in the middle between E and F.
    // Center is between E and F.
    const gap = 3 * PITCH; // distance from E to F

    let colOffsetZ = 0;
    const colIndex = rowLetter.charCodeAt(0) - 'A'.charCodeAt(0); // 0 to 9

    if (colIndex <= 4) { // A to E (0 to 4)
        // E (4) is closest to center on the negative Z side
        colOffsetZ = -(gap / 2) - ((4 - colIndex) * PITCH);
    } else { // F to J (5 to 9)
        // F (5) is closest to center on the positive Z side
        colOffsetZ = (gap / 2) + ((colIndex - 5) * PITCH);
    }

    return new THREE.Vector3(rowOffsetX, PIN_Y, colOffsetZ);
};

export function getNearestBreadboardHoleLocal(localX: number, localZ: number): THREE.Vector3 | null {
    const PITCH = 0.0036;
    const gap = 3 * PITCH;

    // Snap X to nearest row (1 to 63)
    const rowFloat = (localX / PITCH) + 32;
    const rowNum = Math.max(1, Math.min(63, Math.round(rowFloat)));
    const snappedX = (rowNum - 32) * PITCH;

    // Snap Z to nearest column (A-J)
    let snappedZ = 0;
    if (localZ < 0) {
        // Snap to A-E
        const distFromE = (-localZ - (gap / 2)) / PITCH;
        const colSteps = Math.max(0, Math.min(4, Math.round(distFromE))); // 0=E, 4=A
        snappedZ = -(gap / 2) - (colSteps * PITCH);
    } else {
        // Snap to F-J
        const distFromF = (localZ - (gap / 2)) / PITCH;
        const colSteps = Math.max(0, Math.min(4, Math.round(distFromF))); // 0=F, 4=J
        snappedZ = (gap / 2) + (colSteps * PITCH);
    }

    const dist = Math.sqrt((localX - snappedX) ** 2 + (localZ - snappedZ) ** 2);
    if (dist > 0.005) return null; // 5mm threshold

    return new THREE.Vector3(snappedX, 0.018, snappedZ);
}

useGLTF.preload('/models/arduino_breadboard_-_low_poly.glb');
