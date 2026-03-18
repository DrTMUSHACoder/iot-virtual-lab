import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { playUISnap, playUIError } from '../utils/audioSystem';

/**
 * CircuitChallenge — Wall-mounted circuit puzzle board.
 *
 * Shows a target circuit (LED + Resistor + Power). User clicks
 * connection nodes in correct order. Green glow on success, red on error.
 */

const boardMat = new THREE.MeshStandardMaterial({ color: '#1a237e', roughness: 0.3, metalness: 0.1 });

const NODES = [
    { id: 'VCC', label: '5V', pos: [-0.25, 0.15] as [number, number], color: '#f44336' },
    { id: 'R1_A', label: 'R1-A', pos: [-0.08, 0.15] as [number, number], color: '#ff9800' },
    { id: 'R1_B', label: 'R1-B', pos: [0.08, 0.15] as [number, number], color: '#ff9800' },
    { id: 'LED_A', label: 'LED+', pos: [0.08, -0.05] as [number, number], color: '#4caf50' },
    { id: 'LED_K', label: 'LED-', pos: [0.25, -0.05] as [number, number], color: '#4caf50' },
    { id: 'GND', label: 'GND', pos: [0.25, 0.15] as [number, number], color: '#607d8b' },
];

// Correct wiring order: VCC → R1_A, R1_B → LED_A, LED_K → GND
const CORRECT_PAIRS = [
    ['VCC', 'R1_A'],
    ['R1_B', 'LED_A'],
    ['LED_K', 'GND'],
];

interface Props {
    position?: [number, number, number];
    rotation?: [number, number, number];
}

export const CircuitChallenge: React.FC<Props> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}) => {
    const [connections, setConnections] = useState<string[][]>([]);
    const [pendingNode, setPendingNode] = useState<string | null>(null);
    const [flashColor, setFlashColor] = useState<string | null>(null);
    const flashRef = useRef<THREE.Mesh>(null);

    const isComplete = connections.length === CORRECT_PAIRS.length;

    useFrame(() => {
        if (flashRef.current && flashColor) {
            const mat = flashRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity *= 0.95;
            if (mat.emissiveIntensity < 0.02) {
                setFlashColor(null);
            }
        }
    });

    const handleNodeClick = (nodeId: string) => {
        if (isComplete) return;

        if (!pendingNode) {
            setPendingNode(nodeId);
            return;
        }

        if (pendingNode === nodeId) {
            setPendingNode(null);
            return;
        }

        // Check if this pair is the correct next connection
        const nextPairIdx = connections.length;
        if (nextPairIdx < CORRECT_PAIRS.length) {
            const expected = CORRECT_PAIRS[nextPairIdx];
            const match =
                (pendingNode === expected[0] && nodeId === expected[1]) ||
                (pendingNode === expected[1] && nodeId === expected[0]);

            if (match) {
                setConnections(prev => [...prev, [pendingNode!, nodeId]]);
                setFlashColor('#00e676');
                playUISnap();
            } else {
                setFlashColor('#f44336');
                playUIError();
            }
        }

        setPendingNode(null);
    };

    const isNodeConnected = (nodeId: string) =>
        connections.some(pair => pair.includes(nodeId));

    return (
        <group position={position} rotation={rotation}>
            {/* Board */}
            <Box args={[0.75, 0.55, 0.02]} material={boardMat} />

            {/* Flash overlay */}
            {flashColor && (
                <mesh ref={flashRef} position={[0, 0, 0.012]}>
                    <planeGeometry args={[0.73, 0.53]} />
                    <meshStandardMaterial
                        color={flashColor}
                        emissive={flashColor}
                        emissiveIntensity={1}
                        transparent
                        opacity={0.15}
                    />
                </mesh>
            )}

            {/* Title */}
            <Text
                position={[0, 0.22, 0.012]}
                fontSize={0.03}
                color="#00d2ff"
                anchorX="center"
                anchorY="middle"
                fontWeight={700}
            >
                Circuit Challenge
            </Text>

            <Text
                position={[0, 0.18, 0.012]}
                fontSize={0.016}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
            >
                {isComplete
                    ? 'Challenge Complete!'
                    : `Connect: ${CORRECT_PAIRS[connections.length]?.[0] || ''} → ${CORRECT_PAIRS[connections.length]?.[1] || ''}`}
            </Text>

            {/* Nodes */}
            {NODES.map(node => {
                const connected = isNodeConnected(node.id);
                const isPending = pendingNode === node.id;
                return (
                    <group key={node.id} position={[node.pos[0], node.pos[1], 0.012]}>
                        <Interactive onSelect={() => handleNodeClick(node.id)}>
                            <mesh>
                                <circleGeometry args={[0.028, 12]} />
                                <meshStandardMaterial
                                    color={connected ? '#00e676' : isPending ? '#ffd54f' : node.color}
                                    emissive={connected ? '#00e676' : isPending ? '#ffd54f' : node.color}
                                    emissiveIntensity={connected ? 1.5 : isPending ? 1.2 : 0.4}
                                />
                            </mesh>
                        </Interactive>
                        <Text
                            position={[0, -0.04, 0]}
                            fontSize={0.016}
                            color={connected ? '#a5d6a7' : '#b0bec5'}
                            anchorX="center"
                            anchorY="top"
                        >
                            {node.label}
                        </Text>
                    </group>
                );
            })}

            {/* Connection lines */}
            {connections.map((pair, i) => {
                const n1 = NODES.find(n => n.id === pair[0]);
                const n2 = NODES.find(n => n.id === pair[1]);
                if (!n1 || !n2) return null;
                return (
                    <mesh key={`wire-${i}`} position={[0, 0, 0.011]}>
                        <planeGeometry args={[
                            Math.sqrt((n2.pos[0] - n1.pos[0]) ** 2 + (n2.pos[1] - n1.pos[1]) ** 2),
                            0.006,
                        ]} />
                        <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.8} />
                    </mesh>
                );
            })}

            {/* Progress bar */}
            <Box args={[0.6, 0.015, 0.005]} position={[0, -0.2, 0.012]}>
                <meshStandardMaterial color="#1e293b" />
            </Box>
            <Box
                args={[0.6 * (connections.length / CORRECT_PAIRS.length), 0.015, 0.006]}
                position={[
                    -0.3 + 0.3 * (connections.length / CORRECT_PAIRS.length),
                    -0.2,
                    0.013,
                ]}
            >
                <meshStandardMaterial
                    color={isComplete ? '#00e676' : '#00d2ff'}
                    emissive={isComplete ? '#00e676' : '#00d2ff'}
                    emissiveIntensity={0.5}
                />
            </Box>

            {/* Complete badge */}
            {isComplete && (
                <Text
                    position={[0, -0.08, 0.015]}
                    fontSize={0.035}
                    color="#00e676"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight={700}
                >
                    PASSED
                </Text>
            )}
        </group>
    );
};
