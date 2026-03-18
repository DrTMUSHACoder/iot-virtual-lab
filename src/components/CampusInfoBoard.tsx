import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';

/**
 * CampusInfoBoard — Interactive campus map billboard.
 *
 * Shows a map of the campus with labeled buildings.
 * On hover/trigger, highlights building info.
 */

const postMat = new THREE.MeshStandardMaterial({ color: '#78909c', roughness: 0.4, metalness: 0.6 });

interface BuildingLabel {
    name: string;
    pos: [number, number];
    color: string;
}

const BUILDINGS: BuildingLabel[] = [
    { name: 'Main Academic Block', pos: [-0.3, 0.25], color: '#4fc3f7' },
    { name: 'IoT Lab', pos: [0.1, 0.1], color: '#66bb6a' },
    { name: 'Library', pos: [0.35, 0.25], color: '#ffa726' },
    { name: 'Cafeteria', pos: [-0.25, -0.1], color: '#ef5350' },
    { name: 'Sports Ground', pos: [0.3, -0.15], color: '#ab47bc' },
    { name: 'Parking Area', pos: [-0.1, -0.25], color: '#fdd835' },
    { name: 'Admin Office', pos: [0.25, 0.0], color: '#26c6da' },
];

interface Props {
    position?: [number, number, number];
    rotation?: [number, number, number];
}

export const CampusInfoBoard: React.FC<Props> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}) => {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const frameRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (frameRef.current) {
            const mat = frameRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = selectedIdx !== null ? 0.3 : 0.1;
        }
    });

    return (
        <group position={position} rotation={rotation}>
            {/* Support Posts */}
            <Box args={[0.06, 2.2, 0.06]} position={[-0.55, 1.1, 0]} material={postMat} />
            <Box args={[0.06, 2.2, 0.06]} position={[0.55, 1.1, 0]} material={postMat} />

            {/* Board Background */}
            <mesh ref={frameRef} position={[0, 1.8, 0]}>
                <boxGeometry args={[1.2, 0.85, 0.04]} />
                <meshStandardMaterial
                    color="#0d1b2a"
                    emissive="#00d2ff"
                    emissiveIntensity={0.1}
                    roughness={0.2}
                />
            </mesh>

            {/* Title */}
            <Text
                position={[0, 2.15, 0.025]}
                fontSize={0.05}
                color="#00d2ff"
                anchorX="center"
                anchorY="middle"
                fontWeight={700}
            >
                CAMPUS MAP
            </Text>

            <Text
                position={[0, 2.08, 0.025]}
                fontSize={0.022}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
            >
                Ramachandra College of Engineering
            </Text>

            {/* Building Dots + Labels */}
            {BUILDINGS.map((b, i) => (
                <group key={b.name} position={[b.pos[0], 1.78 + b.pos[1], 0.025]}>
                    <Interactive
                        onSelect={() => setSelectedIdx(selectedIdx === i ? null : i)}
                    >
                        <mesh>
                            <circleGeometry args={[selectedIdx === i ? 0.025 : 0.018, 12]} />
                            <meshStandardMaterial
                                color={b.color}
                                emissive={b.color}
                                emissiveIntensity={selectedIdx === i ? 1.5 : 0.5}
                            />
                        </mesh>
                    </Interactive>
                    <Text
                        position={[0, -0.035, 0]}
                        fontSize={selectedIdx === i ? 0.022 : 0.016}
                        color={selectedIdx === i ? '#ffffff' : '#94a3b8'}
                        anchorX="center"
                        anchorY="top"
                    >
                        {b.name}
                    </Text>
                </group>
            ))}

            {/* Selected Building Info */}
            {selectedIdx !== null && (
                <group position={[0, 1.4, 0.025]}>
                    <Box args={[0.9, 0.12, 0.005]}>
                        <meshStandardMaterial
                            color="#0f172a"
                            transparent
                            opacity={0.9}
                        />
                    </Box>
                    <Text
                        position={[0, 0, 0.004]}
                        fontSize={0.028}
                        color={BUILDINGS[selectedIdx].color}
                        anchorX="center"
                        anchorY="middle"
                        fontWeight={700}
                    >
                        {BUILDINGS[selectedIdx].name}
                    </Text>
                </group>
            )}
        </group>
    );
};
