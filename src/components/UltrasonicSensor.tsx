
import React from 'react';
import { Pin } from './Pin';

/*
 * UltrasonicSensor — HC-SR04 ultrasonic distance sensor.
 *
 * 4 pins: VCC, Trig, Echo, GND
 * Real dimensions: 45mm × 20mm × 15mm
 * VR target: 0.045m × 0.02m × 0.015m
 */

interface UltrasonicSensorProps {
    id: string;
}

export const UltrasonicSensor: React.FC<UltrasonicSensorProps> = ({ id }) => {
    const PS = 0.00254;

    return (
        <group>
            {/* PCB body — blue */}
            <mesh position={[0, 0.008, 0]} castShadow>
                <boxGeometry args={[0.063, 0.014, 0.02]} />
                <meshStandardMaterial color="#2196f3" roughness={0.6} metalness={0.05} />
            </mesh>

            {/* Left transducer cylinder */}
            <mesh position={[-0.012, 0.005, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.006, 16]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Left transducer face */}
            <mesh position={[-0.012, 0.005, -0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.001, 16]} />
                <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Right transducer cylinder */}
            <mesh position={[0.012, 0.005, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.006, 16]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Right transducer face */}
            <mesh position={[0.012, 0.005, -0.012]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.001, 16]} />
                <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
            </mesh>

            {/* Crystal oscillator */}
            <mesh position={[0, 0.011, 0]}>
                <cylinderGeometry args={[0.003, 0.003, 0.002, 8]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* 4 header pins on bottom */}
            <Pin name="VCC" position={[-PS * 1.5, 0.005, PS * 3]} componentId={id} />
            <Pin name="Trig" position={[-PS * 0.5, 0.005, PS * 3]} componentId={id} />
            <Pin name="Echo" position={[PS * 0.5, 0.005, PS * 3]} componentId={id} />
            <Pin name="GND" position={[PS * 1.5, 0.005, PS * 3]} componentId={id} />
        </group>
    );
};
