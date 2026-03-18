import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { playUISnap } from '../utils/audioSystem';

/**
 * InteractiveComputer — Workstation with toggleable monitor and keyboard.
 *
 * Trigger/click toggles power on/off.
 * When on: monitor glows, shows Arduino code snippet, fan hum plays.
 */

const monitorMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.3, metalness: 0.8 });
const keyboardMat = new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 0.6, metalness: 0.4 });
const baseMat = new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.5, metalness: 0.5 });

const CODE_LINES = [
    'void setup() {',
    '  pinMode(13, OUTPUT);',
    '  Serial.begin(9600);',
    '}',
    '',
    'void loop() {',
    '  digitalWrite(13, HIGH);',
    '  delay(1000);',
    '  digitalWrite(13, LOW);',
    '  delay(1000);',
    '}',
];

interface Props {
    position?: [number, number, number];
    rotation?: [number, number, number];
}

export const InteractiveComputer: React.FC<Props> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}) => {
    const [isOn, setIsOn] = useState(false);
    const glowRef = useRef<THREE.Mesh>(null);
    const ledRef = useRef<THREE.Mesh>(null);

    // Subtle screen flicker
    useFrame(({ clock }) => {
        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.MeshStandardMaterial;
            if (isOn) {
                const flicker = 0.9 + Math.sin(clock.getElapsedTime() * 30) * 0.02;
                mat.emissiveIntensity = flicker;
                mat.opacity = 0.95;
            } else {
                mat.emissiveIntensity = 0;
                mat.opacity = 0.3;
            }
        }
        if (ledRef.current) {
            const mat = ledRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = isOn ? 2.0 : 0;
        }
    });

    const handleToggle = (e: any) => {
        e?.stopPropagation?.();
        setIsOn(prev => !prev);
        playUISnap();
    };

    const screenColor = isOn ? '#0a1628' : '#111111';
    const screenEmissive = isOn ? '#1a3a5c' : '#000000';

    // Memoize code text to avoid re-renders
    const codeText = useMemo(() => CODE_LINES.join('\n'), []);

    return (
        <group position={position} rotation={rotation}>
            {/* Monitor Stand Base */}
            <Cylinder args={[0.08, 0.1, 0.015, 8]} position={[0, 0, 0]} material={baseMat} />

            {/* Monitor Stand Pole */}
            <Cylinder args={[0.015, 0.015, 0.15, 6]} position={[0, 0.085, 0]} material={baseMat} />

            {/* Monitor Body */}
            <Interactive onSelect={handleToggle}>
                <Box args={[0.35, 0.22, 0.02]} position={[0, 0.27, 0]} material={monitorMat}>
                </Box>
            </Interactive>

            {/* Screen Surface */}
            <mesh ref={glowRef} position={[0, 0.27, 0.011]}>
                <planeGeometry args={[0.32, 0.19]} />
                <meshStandardMaterial
                    color={screenColor}
                    emissive={screenEmissive}
                    emissiveIntensity={isOn ? 0.9 : 0}
                    transparent
                    opacity={isOn ? 0.95 : 0.3}
                />
            </mesh>

            {/* Code Text (only when on) */}
            {isOn && (
                <Text
                    position={[0, 0.27, 0.012]}
                    fontSize={0.012}
                    color="#4fc3f7"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={0.29}
                    font={undefined}
                >
                    {codeText}
                </Text>
            )}

            {/* Title bar */}
            {isOn && (
                <Text
                    position={[0, 0.355, 0.012]}
                    fontSize={0.009}
                    color="#90a4ae"
                    anchorX="center"
                    anchorY="middle"
                >
                    Arduino IDE — LED Blink
                </Text>
            )}

            {/* Power LED */}
            <mesh ref={ledRef} position={[0.15, 0.17, 0.011]}>
                <circleGeometry args={[0.004, 8]} />
                <meshStandardMaterial
                    color={isOn ? '#00e676' : '#333'}
                    emissive={isOn ? '#00e676' : '#000'}
                    emissiveIntensity={isOn ? 2 : 0}
                />
            </mesh>

            {/* Keyboard */}
            <Box args={[0.3, 0.008, 0.1]} position={[0, 0.004, 0.15]} material={keyboardMat} />
            {/* Keyboard keys texture (simplified as lines) */}
            {[-0.1, -0.05, 0, 0.05, 0.1].map((x, i) => (
                <Box key={`key-row-${i}`} args={[0.04, 0.003, 0.08]} position={[x, 0.01, 0.15]}>
                    <meshStandardMaterial color="#3a3a3a" roughness={0.5} />
                </Box>
            ))}

            {/* Mouse */}
            <group position={[0.22, 0.004, 0.15]}>
                <Box args={[0.03, 0.012, 0.05]}>
                    <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
                </Box>
            </group>

            {/* Click Target Label (only when off) */}
            {!isOn && (
                <Text
                    position={[0, 0.27, 0.012]}
                    fontSize={0.016}
                    color="#555"
                    anchorX="center"
                    anchorY="middle"
                >
                    Click to power on
                </Text>
            )}
        </group>
    );
};
