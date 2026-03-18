
import React from 'react';
import { Box, Cylinder } from '@react-three/drei';
import { Pin } from './Pin';

/*
 * Battery (9V Block) — Calibrated.
 *
 * Real dimensions : 48.5mm × 26.5mm × 17.5mm
 * VR target       : 0.054m × 0.030m × 0.020m
 * Terminal spacing : ~12.7mm (snap connectors)
 */

interface BatteryProps {
    id: string;
}

export const Battery: React.FC<BatteryProps> = ({ id }) => {
    return (
        <group>
            {/* Body — 54mm × 30mm × 20mm VR */}
            <Box args={[0.07, 0.040, 0.028]} position={[0, 0.025, 0]}>
                <meshStandardMaterial color="#111" roughness={0.2} metalness={0.8} />
            </Box>

            {/* Label area */}
            <Box args={[0.040, 0.031, 0.021]} position={[0, 0.015, 0]}>
                <meshStandardMaterial color="#fbbf24" />
            </Box>

            {/* (+) Terminal — smaller snap connector */}
            <Cylinder args={[0.003, 0.003, 0.005, 8]} position={[0.012, 0.031, 0]}>
                <meshStandardMaterial color="#aaa" metalness={1} />
            </Cylinder>

            {/* (-) Terminal — larger snap connector */}
            <Cylinder args={[0.004, 0.004, 0.005, 6]} position={[-0.012, 0.031, 0]}>
                <meshStandardMaterial color="#aaa" metalness={1} />
            </Cylinder>

            {/* Pin anchors at terminal tips */}
            <Pin name="(+)" position={[0.015, 0.05, 0]} componentId={id} />
            <Pin name="(-)" position={[-0.015, 0.05, 0]} componentId={id} />
        </group>
    );
};
