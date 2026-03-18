import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { playUISnap } from '../utils/audioSystem';

/**
 * InteractiveDoor — Animated pivot door for lab/corridor/outside.
 *
 * Trigger/click toggles open (90°) / closed (0°).
 * Pivot on the left edge of the door.
 */

const doorMat = new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.7, metalness: 0.1 });
const frameMat = new THREE.MeshStandardMaterial({ color: '#78909c', roughness: 0.4, metalness: 0.5 });
const handleMat = new THREE.MeshStandardMaterial({ color: '#bdbdbd', roughness: 0.3, metalness: 0.8 });

interface Props {
    position?: [number, number, number];
    rotation?: [number, number, number];
    openAngle?: number;
    doorWidth?: number;
    doorHeight?: number;
}

export const InteractiveDoor: React.FC<Props> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    openAngle = Math.PI / 2,
    doorWidth = 0.9,
    doorHeight = 2.1,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pivotRef = useRef<THREE.Group>(null);
    const targetAngle = useRef(0);

    useFrame((_, delta) => {
        if (!pivotRef.current) return;
        targetAngle.current = isOpen ? openAngle : 0;
        const curr = pivotRef.current.rotation.y;
        const diff = targetAngle.current - curr;
        if (Math.abs(diff) > 0.01) {
            pivotRef.current.rotation.y += diff * Math.min(1, delta * 4);
        }
    });

    const handleToggle = (e: any) => {
        e?.stopPropagation?.();
        setIsOpen(prev => !prev);
        playUISnap();
    };

    const halfW = doorWidth / 2;

    return (
        <group position={position} rotation={rotation}>
            {/* Door Frame */}
            <Box args={[doorWidth + 0.12, doorHeight + 0.06, 0.08]} position={[0, doorHeight / 2, 0]} material={frameMat} />

            {/* Door Panel — pivot on left edge */}
            <group ref={pivotRef} position={[-halfW, 0, 0]}>
                <Interactive onSelect={handleToggle}>
                    <Box args={[doorWidth, doorHeight, 0.05]} position={[halfW, doorHeight / 2, 0]} material={doorMat} />
                </Interactive>

                {/* Door Handle */}
                <Box args={[0.03, 0.12, 0.04]} position={[doorWidth - 0.1, doorHeight * 0.45, 0.04]} material={handleMat} />
                <Box args={[0.03, 0.12, 0.04]} position={[doorWidth - 0.1, doorHeight * 0.45, -0.04]} material={handleMat} />
            </group>
        </group>
    );
};
