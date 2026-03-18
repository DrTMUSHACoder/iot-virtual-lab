
import React from 'react';
import { Pin } from './Pin';

/*
 * LightSensor — LDR (Light Dependent Resistor) module.
 *
 * 3 pins: VCC, GND, AO (analog output)
 * Real dimensions: ~32mm × 14mm × 7mm (module with PCB)
 * VR target: 0.032m × 0.014m × 0.007m
 */

interface LightSensorProps {
    id: string;
}

export const LightSensor: React.FC<LightSensorProps> = ({ id }) => {
    const PS = 0.00254;

    return (
        <group>
            {/* PCB — red */}
            <mesh position={[0, 0.008, 0]} castShadow>
                <boxGeometry args={[0.045, 0.01, 0.02]} />
                <meshStandardMaterial color="#c0392b" roughness={0.6} metalness={0.1} />
            </mesh>

            {/* LDR element — brown/amber disk */}
            <mesh position={[0.006, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.004, 0.004, 0.002, 16]} />
                <meshStandardMaterial color="#e67e22" roughness={0.7} metalness={0.1} />
            </mesh>

            {/* LDR serpentine pattern */}
            <mesh position={[0.006, 0.0095, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.0005, 16]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0} />
            </mesh>

            {/* Potentiometer trimmer */}
            <mesh position={[-0.008, 0.008, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.003, 12]} />
                <meshStandardMaterial color="#2980b9" roughness={0.5} metalness={0.2} />
            </mesh>
            {/* Trimmer screw */}
            <mesh position={[-0.008, 0.01, 0]}>
                <boxGeometry args={[0.004, 0.001, 0.001]} />
                <meshStandardMaterial color="#bdc3c7" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* 3 header pins */}
            <Pin name="AO" position={[-PS, 0.005, PS * 2.5]} componentId={id} />
            <Pin name="GND" position={[0, 0.005, PS * 2.5]} componentId={id} />
            <Pin name="VCC" position={[PS, 0.005, PS * 2.5]} componentId={id} />
        </group>
    );
};
