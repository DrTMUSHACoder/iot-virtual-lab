
import React from 'react';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';
import { Text } from '@react-three/drei';

/*
 * LCD1602 — 16×2 Character LCD with I2C backpack.
 *
 * 4 I2C pins: VCC, GND, SDA, SCL
 * Real dimensions: 80mm × 36mm × 12mm
 * VR target: 0.08m × 0.036m × 0.012m
 */

interface LCD1602Props {
    id: string;
}

export const LCD1602: React.FC<LCD1602Props> = ({ id }) => {
    const isSimulating = useLabStore(state => state.isSimulating);
    const PS = 0.00254;

    return (
        <group>
            {/* PCB base — green */}
            <mesh position={[0, 0.008, 0]} castShadow>
                <boxGeometry args={[0.096, 0.008, 0.043]} />
                <meshStandardMaterial color="#2d6a3f" roughness={0.7} metalness={0.1} />
            </mesh>

            {/* LCD screen area — dark with backlight */}
            <mesh position={[0, 0.0065, 0]}>
                <boxGeometry args={[0.064, 0.001, 0.024]} />
                <meshStandardMaterial
                    color={isSimulating ? '#0a3d0a' : '#1a1a2e'}
                    emissive={isSimulating ? '#00ff88' : '#000'}
                    emissiveIntensity={isSimulating ? 0.3 : 0}
                />
            </mesh>

            {/* LCD bezel */}
            <mesh position={[0, 0.012, 0]}>
                <boxGeometry args={[0.08, 0.0006, 0.033]} />
                <meshStandardMaterial color="#333" roughness={0.9} metalness={0} />
            </mesh>

            {/* Display text overlay when running */}
            {isSimulating && (
                <Text
                    position={[0, 0.0075, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    fontSize={0.008}
                    color="#00ff88"
                    font="/fonts/FiraCode-Regular.ttf"
                    anchorX="center"
                    anchorY="middle"
                    lineHeight={1.5}
                >
                    {'Hello, World!\nIOT Lab v1.0'}
                </Text>
            )}

            {/* I2C Backpack pins */}
            <Pin name="VCC" position={[-0.036, 0.005, -PS * 2]} componentId={id} />
            <Pin name="GND" position={[-0.024, 0.005, -PS * 2]} componentId={id} />
            <Pin name="SDA" position={[-0.012, 0.005, -PS * 2]} componentId={id} />
            <Pin name="SCL" position={[0, 0.005, -PS * 2]} componentId={id} />
        </group>
    );
};
