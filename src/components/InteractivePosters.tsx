import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';

/**
 * InteractivePosters — Educational wall posters that expand on interaction.
 *
 * Each poster shows a topic title. On trigger/hover, an overlay panel
 * appears with detailed content.
 */

const overlayBg = new THREE.MeshStandardMaterial({
    color: '#0a1628',
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
});

interface PosterData {
    title: string;
    content: string[];
    accent: string;
}

const POSTERS: PosterData[] = [
    {
        title: "Ohm's Law",
        content: [
            'V = I x R',
            '',
            'Voltage (V) = Current (I) x Resistance (R)',
            '',
            'Key relationships:',
            '  - Increase R → Decrease I',
            '  - Increase V → Increase I',
            '',
            'Units: Volts, Amps, Ohms',
        ],
        accent: '#4fc3f7',
    },
    {
        title: 'LED Polarity',
        content: [
            'Anode (+) → Long leg → Power',
            'Cathode (-) → Short leg → Ground',
            '',
            'Always use a resistor!',
            '  220-330 Ohm typical',
            '',
            'Forward voltage:',
            '  Red: 1.8V  Green: 2.1V',
            '  Blue: 3.0V  White: 3.2V',
        ],
        accent: '#ff7043',
    },
    {
        title: 'Arduino Pins',
        content: [
            'Digital Pins: D0-D13',
            '  - INPUT / OUTPUT / PWM',
            '',
            'Analog Pins: A0-A5',
            '  - 10-bit ADC (0-1023)',
            '',
            'Power Pins:',
            '  5V, 3.3V, GND, VIN',
            '',
            'Special: SDA, SCL, TX, RX',
        ],
        accent: '#66bb6a',
    },
];

interface SinglePosterProps {
    data: PosterData;
    position: [number, number, number];
    rotation?: [number, number, number];
}

const SinglePoster: React.FC<SinglePosterProps> = ({ data, position, rotation = [0, 0, 0] }) => {
    const [expanded, setExpanded] = useState(false);
    const [hovered, setHovered] = useState(false);
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.MeshStandardMaterial;
            const target = hovered || expanded ? 0.6 : 0.1;
            mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.1;
        }
    });

    return (
        <group position={position} rotation={rotation}>
            {/* Poster background */}
            <Interactive
                onSelect={() => setExpanded(!expanded)}
                onHover={() => setHovered(true)}
                onBlur={() => setHovered(false)}
            >
                <Box args={[0.5, 0.65, 0.01]}>
                    <meshStandardMaterial color="#1e293b" roughness={0.3} />
                </Box>
            </Interactive>

            {/* Border glow */}
            <mesh ref={glowRef} position={[0, 0, -0.002]}>
                <planeGeometry args={[0.52, 0.67]} />
                <meshStandardMaterial
                    color={data.accent}
                    emissive={data.accent}
                    emissiveIntensity={0.1}
                    transparent
                    opacity={0.5}
                />
            </mesh>

            {/* Title */}
            <Text
                position={[0, 0.24, 0.008]}
                fontSize={0.04}
                color={data.accent}
                anchorX="center"
                anchorY="middle"
                fontWeight={700}
            >
                {data.title}
            </Text>

            {/* Subtitle hint */}
            <Text
                position={[0, 0.18, 0.008]}
                fontSize={0.018}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
            >
                {expanded ? 'Tap to close' : 'Tap to learn more'}
            </Text>

            {/* Expanded overlay */}
            {expanded && (
                <group position={[0, -0.08, 0.02]}>
                    <Box args={[0.46, 0.4, 0.005]} material={overlayBg} />
                    <Text
                        position={[0, 0, 0.004]}
                        fontSize={0.02}
                        color="#e2e8f0"
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={0.42}
                        lineHeight={1.5}
                    >
                        {data.content.join('\n')}
                    </Text>
                </group>
            )}
        </group>
    );
};

interface PostersProps {
    positions: [number, number, number][];
    rotations?: [number, number, number][];
}

export const InteractivePosters: React.FC<PostersProps> = ({ positions, rotations }) => {
    return (
        <group>
            {POSTERS.map((poster, i) => (
                <SinglePoster
                    key={poster.title}
                    data={poster}
                    position={positions[i] || [0, 1.5, 0]}
                    rotation={rotations?.[i]}
                />
            ))}
        </group>
    );
};
