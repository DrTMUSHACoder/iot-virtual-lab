
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * GhostPreview — Translucent glowing indicator for expected wire endpoints.
 *
 * Renders a pulsing translucent sphere at a target position to guide
 * the student on where the next connection should go.
 *
 * Colors:
 *   Green  → correct target (expected pin)
 *   Blue   → interactable area
 *   Red    → incorrect / warning
 */

interface GhostPreviewProps {
    position: [number, number, number];
    color?: string;
    size?: number;
    visible?: boolean;
}

export const GhostPreview: React.FC<GhostPreviewProps> = ({
    position,
    color = '#00e676',
    size = 0.008,
    visible = true
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // Pulsing animation
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        const pulse = Math.sin(t * 3) * 0.3 + 0.7; // 0.4 to 1.0

        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = pulse * 0.4;
            mat.emissiveIntensity = pulse * 2;
            meshRef.current.scale.setScalar(0.9 + pulse * 0.2);
        }

        if (ringRef.current) {
            const mat = ringRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = pulse * 0.6;
            ringRef.current.rotation.z += 0.02;
        }
    });

    if (!visible) return null;

    return (
        <group position={position}>
            {/* Glowing sphere */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[size, 16, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Outer ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[size * 1.2, size * 1.5, 24]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.0}
                    transparent
                    opacity={0.4}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Point light for glow effect */}
            <pointLight
                color={color}
                intensity={0.3}
                distance={0.05}
                decay={2}
            />
        </group>
    );
};

/*
 * ArrowGuide — Animated directional arrow pointing toward a target.
 */
interface ArrowGuideProps {
    from: [number, number, number];
    to: [number, number, number];
    color?: string;
    visible?: boolean;
}

export const ArrowGuide: React.FC<ArrowGuideProps> = ({
    from,
    to,
    color = '#00e676',
    visible = true
}) => {
    const groupRef = useRef<THREE.Group>(null);

    // Bobbing animation
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const t = clock.getElapsedTime();
            const bob = Math.sin(t * 4) * 0.003;
            groupRef.current.position.y = from[1] + 0.02 + bob;
        }
    });

    const direction = useMemo(() => {
        const dir = new THREE.Vector3(
            to[0] - from[0],
            0, // keep horizontal
            to[2] - from[2]
        ).normalize();
        return dir;
    }, [from, to]);

    const rotation = useMemo(() => {
        const angle = Math.atan2(direction.x, direction.z);
        return [0, angle, 0] as [number, number, number];
    }, [direction]);

    if (!visible) return null;

    return (
        <group ref={groupRef} position={[from[0], from[1] + 0.02, from[2]]} rotation={rotation}>
            {/* Arrow shaft */}
            <mesh position={[0, 0, 0.006]}>
                <boxGeometry args={[0.002, 0.002, 0.012]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.7}
                />
            </mesh>
            {/* Arrow head */}
            <mesh position={[0, 0, 0.014]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.004, 0.008, 6]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.7}
                />
            </mesh>
        </group>
    );
};
