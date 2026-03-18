
import React from 'react';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';

/*
 * SevenSegment — Single-digit 7-segment display (common cathode).
 *
 * 10 pins: a, b, c, d, e, f, g, DP, VCC, GND
 * Real dimensions: 19mm × 12.5mm × 8mm
 * VR target: 0.019m × 0.0125m × 0.008m
 */

interface SevenSegmentProps {
    id: string;
}

// Segment layout (A-G + DP):
//  ─A─
// |   |
// F   B
// |   |
//  ─G─
// |   |
// E   C
// |   |
//  ─D─  .DP

const SEGMENT_ON = '#ff3333';
const SEGMENT_OFF = '#330000';

const segDefs: { name: string; pos: [number, number, number]; size: [number, number, number] }[] = [
    { name: 'A', pos: [0, 0.007, 0], size: [0.008, 0.001, 0.0015] },
    { name: 'B', pos: [0.004, 0.0045, 0], size: [0.0015, 0.005, 0.0015] },
    { name: 'C', pos: [0.004, -0.002, 0], size: [0.0015, 0.005, 0.0015] },
    { name: 'D', pos: [0, -0.005, 0], size: [0.008, 0.001, 0.0015] },
    { name: 'E', pos: [-0.004, -0.002, 0], size: [0.0015, 0.005, 0.0015] },
    { name: 'F', pos: [-0.004, 0.0045, 0], size: [0.0015, 0.005, 0.0015] },
    { name: 'G', pos: [0, 0.001, 0], size: [0.008, 0.001, 0.0015] },
];

export const SevenSegment: React.FC<SevenSegmentProps> = ({ id }) => {
    const isSimulating = useLabStore(state => state.isSimulating);
    const PS = 0.00254;

    // When simulating, show "8" (all segments on) as a demo
    const segOn = isSimulating;

    return (
        <group>
            {/* Display housing — black */}
            <mesh position={[0, 0.010, 0]} castShadow>
                <boxGeometry args={[0.026, 0.012, 0.018]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0} />
            </mesh>

            {/* Display window */}
            <mesh position={[0, 0.0082, 0]}>
                <boxGeometry args={[0.014, 0.001, 0.01]} />
                <meshStandardMaterial color="#0d0d0d" roughness={0.95} />
            </mesh>

            {/* Segments */}
            {segDefs.map(seg => (
                <mesh key={seg.name} position={[seg.pos[0], seg.pos[1] + 0.009, seg.pos[2]]}>
                    <boxGeometry args={seg.size} />
                    <meshStandardMaterial
                        color={segOn ? SEGMENT_ON : SEGMENT_OFF}
                        emissive={segOn ? SEGMENT_ON : '#000'}
                        emissiveIntensity={segOn ? 2 : 0}
                    />
                </mesh>
            ))}

            {/* DP dot */}
            <mesh position={[0.006, 0.004, 0]}>
                <sphereGeometry args={[0.001, 6, 6]} />
                <meshStandardMaterial
                    color={segOn ? SEGMENT_ON : SEGMENT_OFF}
                    emissive={segOn ? SEGMENT_ON : '#000'}
                    emissiveIntensity={segOn ? 2 : 0}
                />
            </mesh>

            {/* 5 bottom pins */}
            <Pin name="a" position={[-PS * 2, 0.005, PS * 2]} componentId={id} />
            <Pin name="b" position={[-PS, 0.005, PS * 2]} componentId={id} />
            <Pin name="GND" position={[0, 0.005, PS * 2]} componentId={id} />
            <Pin name="c" position={[PS, 0.005, PS * 2]} componentId={id} />
            <Pin name="d" position={[PS * 2, 0.005, PS * 2]} componentId={id} />

            {/* 5 top pins */}
            <Pin name="e" position={[-PS * 2, 0.005, -PS * 2]} componentId={id} />
            <Pin name="f" position={[-PS, 0.005, -PS * 2]} componentId={id} />
            <Pin name="VCC" position={[0, 0.005, -PS * 2]} componentId={id} />
            <Pin name="g" position={[PS, 0.005, -PS * 2]} componentId={id} />
            <Pin name="DP" position={[PS * 2, 0.005, -PS * 2]} componentId={id} />
        </group>
    );
};
