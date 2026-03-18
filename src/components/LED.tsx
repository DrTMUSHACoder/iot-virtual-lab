
import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useLabStore } from '../store/useLabStore';
import { Pin } from './Pin';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * LED (5mm through-hole) — Calibrated to real dimensions.
 *
 * Real dimensions:
 *   Dome diameter : 5mm → 0.0056m VR
 *   Total height  : 8.7mm → 0.0097m VR
 *   Lead spacing  : 2.54mm → 0.00284m VR
 *   Lead length   : ~20mm (trimmed in breadboard use)
 *
 * Hierarchy:
 *   LED_Root
 *    ├── VisualMesh (GLB dome)
 *    ├── BasePlate (flat disc)
 *    ├── Pins (Anode +, Cathode -)
 *    ├── EmissionHalo (transparent sphere)
 *    ├── InnerCore (bright sphere)
 *    └── PointLight
 */

interface LEDProps {
    id: string;
    color?: string;
}

// Lead spacing = 2.54mm × 1.12
const LEAD_SPACING = 0.002;

export const LED: React.FC<LEDProps> = ({ id, color = 'red' }) => {
    const { scene } = useGLTF('/models/led_light.glb');
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    const simulationSignals = useLabStore(state => state.simulationSignals);
    const pinVoltages = useLabStore(state => state.pinVoltages);
    const isSimulating = useLabStore(state => state.isSimulating);

    // Voltage-driven activation (from electrical engine tick)
    const anodeKey = `${id}::Anode (+)`;
    const cathodeKey = `${id}::Cathode (-)`;
    const anodeV = pinVoltages[anodeKey];
    const cathodeV = pinVoltages[cathodeKey];
    // Use threshold-based check: anode > 1.5V and cathode < 0.5V (accounts for solver imprecision)
    const isVoltageActive = isSimulating && anodeV !== undefined && cathodeV !== undefined && anodeV > 1.5 && cathodeV < 0.5;
    // Signal-based activation (legacy: direct pin 13 toggle)
    const isSignalActive = simulationSignals['13'] || false;
    // Component value check (set by worker's activeLEDs via _setTickUpdate)
    const comp = useLabStore(state => state.components.find(c => c.id === id));
    const isValueActive = isSimulating && comp?.value === 'ON';
    const isOn = isVoltageActive || isSignalActive || isValueActive;



    // Smooth intensity lerp
    const intensityRef = useRef(0);
    const haloRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame(() => {
        const target = isOn ? 1 : 0;
        intensityRef.current += (target - intensityRef.current) * 0.1;

        if (haloRef.current) {
            const mat = haloRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = intensityRef.current * 0.45;
            mat.emissiveIntensity = intensityRef.current * 2.0;
        }

        if (lightRef.current) {
            lightRef.current.intensity = intensityRef.current * 2.5;
        }
    });

    const ledColor = color === 'red' ? '#ff2200' :
        color === 'green' ? '#00ff44' :
            color === 'blue' ? '#0066ff' :
                color === 'yellow' ? '#ffcc00' :
                    color === 'white' ? '#ffffff' : color;

    // LED dome height ≈ 10mm total
    const DOME_Y = 0.012;

    return (
        <group>
            {/* VisualMesh — GLB dome scaled for visibility */}
            <primitive
                object={clonedScene}
                scale={0.012}
                position={[0, 0.016, 0]}
                receiveShadow
            />

            {/* Plastic base disc — 1.6mm thick, 5.6mm diameter */}
            <mesh position={[0, 0.007, 0]}>
                <cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
                <meshStandardMaterial color="#222" />
            </mesh>

            {/* Lead wires from base down into breadboard */}
            <mesh position={[LEAD_SPACING, -0.002, 0]}>
                <cylinderGeometry args={[0.0004, 0.0004, 0.012, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>
            <mesh position={[-LEAD_SPACING, -0.002, 0]}>
                <cylinderGeometry args={[0.0004, 0.0004, 0.012, 4]} />
                <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.15} />
            </mesh>

            {/* Pins down at breadboard surface level */}
            <Pin name="Anode (+)" position={[LEAD_SPACING, -0.001, 0]} componentId={id} />
            <Pin name="Cathode (-)" position={[-LEAD_SPACING, -0.001, 0]} componentId={id} />

            {/* Emission Halo — 8mm radius sphere */}
            <mesh ref={haloRef} position={[0, DOME_Y, 0]}>
                <sphereGeometry args={[0.008, 16, 16]} />
                <meshStandardMaterial
                    color={ledColor}
                    emissive={ledColor}
                    emissiveIntensity={0}
                    transparent={true}
                    opacity={0}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Inner bright core — 3mm */}
            <mesh position={[0, DOME_Y, 0]} visible={isOn}>
                <sphereGeometry args={[0.003, 12, 12]} />
                <meshStandardMaterial
                    color={ledColor}
                    emissive={ledColor}
                    emissiveIntensity={3}
                    transparent={true}
                    opacity={0.9}
                />
            </mesh>

            {/* Dynamic point light */}
            <pointLight
                ref={lightRef}
                position={[0, DOME_Y, 0]}
                intensity={0}
                color={ledColor}
                distance={0.15}
                decay={2}
            />
        </group>
    );
};
