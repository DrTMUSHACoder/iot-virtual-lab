
import React from 'react';
import { Pin } from './Pin';

/*
 * Capacitor — Electrolytic capacitor with polarity markings.
 *
 * Real dimensions: 5mm diameter × 11mm height (100µF)
 * VR target: 0.006m diameter × 0.013m height
 * Pin spacing: 2.54mm → 0.00284m
 */

interface CapacitorProps {
    id: string;
}

const PS = 0.00284;

export const Capacitor: React.FC<CapacitorProps> = ({ id }) => {
    return (
        <group>
            {/* Body — electrolytic cylinder */}
            <mesh position={[0, 0.012, 0]}>
                <cylinderGeometry args={[0.0045, 0.0045, 0.018, 16]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.2} roughness={0.6} />
            </mesh>

            {/* Top marking */}
            <mesh position={[0, 0.015, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.001, 16]} />
                <meshStandardMaterial color="#2d2d4e" metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Polarity stripe (silver band on negative side) */}
            <mesh position={[-0.0028, 0.008, 0]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.0005, 0.012, 0.004]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Value label band */}
            <mesh position={[0, 0.008, 0.0031]}>
                <planeGeometry args={[0.004, 0.006]} />
                <meshStandardMaterial color="#4a6fa5" metalness={0.1} roughness={0.8} />
            </mesh>

            {/* Pins */}
            <Pin name="(+)" position={[PS * 0.5, 0.005, 0]} componentId={id} />
            <Pin name="(-)" position={[-PS * 0.5, 0.005, 0]} componentId={id} />
        </group>
    );
};
