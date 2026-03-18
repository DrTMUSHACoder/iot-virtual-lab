
import React from 'react';
import { Pin } from './Pin';

/*
 * GasSensor — MQ-series gas sensor module (MQ-2 / MQ-135 style).
 *
 * 4 pins: VCC, GND, AO, DO
 * Real dimensions: ~32mm × 20mm × 22mm (with heater element)
 * VR target: 0.032m × 0.02m × 0.022m
 */

interface GasSensorProps {
    id: string;
}

export const GasSensor: React.FC<GasSensorProps> = ({ id }) => {
    const PS = 0.00254;

    return (
        <group>
            {/* PCB body — dark blue */}
            <mesh position={[0, 0.008, 0]} castShadow>
                <boxGeometry args={[0.045, 0.012, 0.028]} />
                <meshStandardMaterial color="#1a237e" roughness={0.6} metalness={0.1} />
            </mesh>

            {/* Sensor can — steel cylinder */}
            <mesh position={[0, 0.022, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.015, 16]} />
                <meshStandardMaterial color="#b0bec5" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Mesh cap on sensor */}
            <mesh position={[0, 0.023, 0]}>
                <cylinderGeometry args={[0.0085, 0.008, 0.002, 16]} />
                <meshStandardMaterial color="#78909c" metalness={0.5} roughness={0.5} wireframe />
            </mesh>

            {/* Heater pins visible through mesh */}
            <mesh position={[0, 0.02, 0]}>
                <torusGeometry args={[0.004, 0.0005, 6, 16]} />
                <meshStandardMaterial color="#ff5722" emissive="#ff5722" emissiveIntensity={0.3} />
            </mesh>

            {/* Potentiometer trimmer */}
            <mesh position={[-0.01, 0.011, 0.005]}>
                <cylinderGeometry args={[0.0025, 0.0025, 0.003, 12]} />
                <meshStandardMaterial color="#2196f3" roughness={0.5} metalness={0.2} />
            </mesh>

            {/* 4 header pins */}
            <Pin name="VCC" position={[-PS * 1.5, 0.005, PS * 3.5]} componentId={id} />
            <Pin name="GND" position={[-PS * 0.5, 0.005, PS * 3.5]} componentId={id} />
            <Pin name="DO" position={[PS * 0.5, 0.005, PS * 3.5]} componentId={id} />
            <Pin name="AO" position={[PS * 1.5, 0.005, PS * 3.5]} componentId={id} />
        </group>
    );
};
