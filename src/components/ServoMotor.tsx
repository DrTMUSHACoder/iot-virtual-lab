
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';

/*
 * ServoMotor — SG90 style micro servo with animated horn.
 *
 * Real dimensions: 23mm × 12mm × 22mm
 * VR target: 0.025m × 0.014m × 0.024m
 * 3 pins: VCC (red), GND (brown), Signal (orange)
 */

interface ServoMotorProps {
    id: string;
}

export const ServoMotor: React.FC<ServoMotorProps> = ({ id }) => {
    const hornRef = useRef<THREE.Group>(null);
    const isSimulating = useLabStore(state => state.isSimulating);

    // Animate horn back and forth when simulating
    useFrame(({ clock }) => {
        if (hornRef.current && isSimulating) {
            const t = clock.getElapsedTime();
            hornRef.current.rotation.y = Math.sin(t * 2) * (Math.PI / 3); // ±60 degrees
        }
    });

    return (
        <group>
            {/* Body */}
            <mesh position={[0, 0.012, 0]}>
                <boxGeometry args={[0.035, 0.020, 0.035]} />
                <meshStandardMaterial color="#2563eb" metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Mounting ears */}
            <mesh position={[0, 0.003, 0]}>
                <boxGeometry args={[0.033, 0.003, 0.024]} />
                <meshStandardMaterial color="#2563eb" metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Output shaft cylinder */}
            <mesh position={[0.008, 0.016, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.003, 12]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.3} />
            </mesh>

            {/* Animated horn */}
            <group ref={hornRef} position={[0.008, 0.018, 0]}>
                <mesh position={[0, 0, 0.008]}>
                    <boxGeometry args={[0.003, 0.002, 0.018]} />
                    <meshStandardMaterial color="#f1f5f9" metalness={0.1} roughness={0.7} />
                </mesh>
                {/* Horn tip circle */}
                <mesh position={[0, 0, 0.016]}>
                    <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
                    <meshStandardMaterial color="#f1f5f9" metalness={0.1} roughness={0.7} />
                </mesh>
            </group>

            {/* Label */}
            <mesh position={[0, 0.008, 0.0125]}>
                <planeGeometry args={[0.016, 0.006]} />
                <meshStandardMaterial color="#1e40af" metalness={0.1} roughness={0.8} />
            </mesh>

            {/* Wire harness */}
            <mesh position={[-0.012, 0.003, 0.008]}>
                <boxGeometry args={[0.003, 0.003, 0.008]} />
                <meshStandardMaterial color="#636e72" metalness={0.1} roughness={0.8} />
            </mesh>

            {/* Pins: VCC, Signal, GND */}
            <Pin name="VCC" position={[-0.018, 0.005, 0.018]} componentId={id} />
            <Pin name="Signal" position={[-0.018, 0.005, 0.014]} componentId={id} />
            <Pin name="GND" position={[-0.018, 0.005, 0.010]} componentId={id} />
        </group>
    );
};
