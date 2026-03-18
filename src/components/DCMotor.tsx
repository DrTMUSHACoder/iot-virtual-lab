
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';

/*
 * DCMotor — Small DC motor with spinning rotor animation.
 *
 * Real dimensions: ~25mm diameter × 20mm length
 * VR target: 0.028m diameter × 0.022m length
 * 2 pins: (+) and (-)
 */

interface DCMotorProps {
    id: string;
}

export const DCMotor: React.FC<DCMotorProps> = ({ id }) => {
    const rotorRef = useRef<THREE.Mesh>(null);
    const isSimulating = useLabStore(state => state.isSimulating);

    // Spin rotor when simulating
    useFrame(() => {
        if (rotorRef.current && isSimulating) {
            rotorRef.current.rotation.z += 0.15;
        }
    });

    return (
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            {/* Motor body — cylinder */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.020, 0.020, 0.030, 16]} />
                <meshStandardMaterial color="#636e72" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Front cap */}
            <mesh position={[0, -0.012, 0]}>
                <cylinderGeometry args={[0.014, 0.014, 0.002, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Back cap */}
            <mesh position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.012, 0.014, 0.003, 16]} />
                <meshStandardMaterial color="#4a5568" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Output shaft */}
            <mesh position={[0, -0.018, 0]}>
                <cylinderGeometry args={[0.001, 0.001, 0.012, 8]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.2} />
            </mesh>

            {/* Spinning rotor indicator (visible propeller) */}
            <mesh ref={rotorRef} position={[0, -0.024, 0]}>
                <boxGeometry args={[0.016, 0.001, 0.003]} />
                <meshStandardMaterial
                    color={isSimulating ? '#00d2ff' : '#94a3b8'}
                    emissive={isSimulating ? '#00d2ff' : '#000'}
                    emissiveIntensity={isSimulating ? 1 : 0}
                />
            </mesh>

            {/* Terminal tabs */}
            <mesh position={[0.006, 0.014, 0]}>
                <boxGeometry args={[0.004, 0.004, 0.001]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.2} />
            </mesh>
            <mesh position={[-0.006, 0.014, 0]}>
                <boxGeometry args={[0.004, 0.004, 0.001]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.2} />
            </mesh>

            {/* Pins */}
            <Pin name="(+)" position={[0.006, 0.018, 0]} componentId={id} />
            <Pin name="(-)" position={[-0.006, 0.018, 0]} componentId={id} />
        </group>
    );
};
