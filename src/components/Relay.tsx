
import React from 'react';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';

/*
 * Relay — 5-pin electromechanical relay (SRD-05VDC-SL-C style).
 *
 * Pins: COIL1, COIL2, COM, NC, NO
 * Real dimensions: ~19mm × 15mm × 15mm
 * VR target: 0.022m × 0.018m × 0.018m
 */

interface RelayProps {
    id: string;
}

export const Relay: React.FC<RelayProps> = ({ id }) => {
    const isSimulating = useLabStore(state => state.isSimulating);
    const PS = 0.00254;

    return (
        <group>
            {/* Relay body — blue box */}
            <mesh position={[0, 0.015, 0]} castShadow>
                <boxGeometry args={[0.030, 0.024, 0.024]} />
                <meshStandardMaterial color="#2980b9" roughness={0.6} metalness={0.1} />
            </mesh>

            {/* Top label */}
            <mesh position={[0, 0.0185, 0]}>
                <boxGeometry args={[0.018, 0.001, 0.014]} />
                <meshStandardMaterial color="#1a5276" roughness={0.8} />
            </mesh>

            {/* Indicator LED on relay */}
            <mesh position={[0.006, 0.019, 0.004]}>
                <sphereGeometry args={[0.0015, 8, 8]} />
                <meshStandardMaterial
                    color={isSimulating ? '#00ff00' : '#333'}
                    emissive={isSimulating ? '#00ff00' : '#000'}
                    emissiveIntensity={isSimulating ? 2 : 0}
                />
            </mesh>

            {/* 5 pins on bottom */}
            <Pin name="COIL1" position={[-PS * 2, 0.005, -PS]} componentId={id} />
            <Pin name="COIL2" position={[-PS * 2, 0.005, PS]} componentId={id} />
            <Pin name="COM" position={[PS * 2, 0.005, 0]} componentId={id} />
            <Pin name="NC" position={[PS * 2, 0.005, -PS * 2]} componentId={id} />
            <Pin name="NO" position={[PS * 2, 0.005, PS * 2]} componentId={id} />
        </group>
    );
};
