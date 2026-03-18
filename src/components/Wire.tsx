
import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLabStore } from '../store/useLabStore';
import type { Wire as WireType } from '../types';

/*
 * Wire — Realistic jumper wire with:
 *   - CubicBezierCurve3 with natural gravity sag
 *   - DuPont-style box connector tips at both ends
 *   - drawRange growth animation (no geometry rebuild per frame)
 *   - Timed glow flash on mount
 *   - 6 radial segments for VR performance
 */

/** Realistic jumper wire color palette */
export const JUMPER_COLORS = [
    '#ff0000', // red
    '#000000', // black
    '#0066ff', // blue
    '#ffff00', // yellow
    '#00aa00', // green
    '#ff8800', // orange
] as const;

/** Pick a random jumper wire color. Call ONCE at wire creation, not in render. */
export function pickRandomWireColor(): string {
    return JUMPER_COLORS[Math.floor(Math.random() * JUMPER_COLORS.length)];
}

interface WireProps {
    wire?: WireType;
    start: [number, number, number];
    end: [number, number, number];
    color: string;
}

/* ── Constants ── */
const TUBE_SEGMENTS = 48;       // curve resolution
const TUBE_RADIAL = 6;        // radial faces (perf-safe for VR)
const TUBE_RADIUS = 0.0012;   // ~1.2mm wire diameter
const TIP_SIZE: [number, number, number] = [0.003, 0.004, 0.003]; // DuPont connector box

export const Wire: React.FC<WireProps> = ({ wire, start, end, color }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshStandardMaterial>(null);
    const tipStartRef = useRef<THREE.Group>(null);
    const tipEndRef = useRef<THREE.Group>(null);

    /* ── Animation state ── */
    const [animProgress, setAnimProgress] = useState(0);
    const animDone = useRef(false);

    /* ── Build curve + geometry ONCE when start/end change ── */
    const { geometry, curveObj, totalVertices } = useMemo(() => {
        const s = new THREE.Vector3(...start);
        const e = new THREE.Vector3(...end);

        // ── Gravity-sag cubic bezier ──
        const mid = s.clone().add(e).multiplyScalar(0.5);
        const distance = s.distanceTo(e);
        const liftHeight = Math.min(distance * 0.4, 0.05);   // pull upward
        const sagAmount = Math.min(distance * 0.15, 0.02);   // mid sag

        const cp1 = s.clone().lerp(mid, 0.35);
        cp1.y += liftHeight;

        const cp2 = e.clone().lerp(mid, 0.35);
        cp2.y += liftHeight;

        // Slight midpoint sag for gravity droop
        mid.y -= sagAmount;
        // We DON'T use mid directly — the cubic control points create the shape.
        // But we DO nudge cp1/cp2 downward slightly toward mid for natural droop:
        cp1.y -= sagAmount * 0.25;
        cp2.y -= sagAmount * 0.25;

        const curve = new THREE.CubicBezierCurve3(s, cp1, cp2, e);
        const geo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, TUBE_RADIUS, TUBE_RADIAL, false);

        // Store total index count for drawRange animation
        const total = geo.index ? geo.index.count : geo.attributes.position.count;

        return { geometry: geo, curveObj: curve, totalVertices: total };
    }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

    /* ── drawRange growth animation ── */
    useFrame((_, delta) => {
        if (animDone.current) return;

        setAnimProgress(prev => {
            const next = Math.min(prev + delta * 5, 1); // ~200ms full animation
            if (next >= 1) animDone.current = true;
            return next;
        });

        if (geometry) {
            const count = Math.floor(totalVertices * animProgress);
            geometry.setDrawRange(0, count);
        }
    });

    /* ── Show full wire once animation completes ── */
    useEffect(() => {
        if (animDone.current && geometry) {
            geometry.setDrawRange(0, totalVertices);
        }
    }, [animProgress, geometry, totalVertices]);

    /* ── Glow flash on mount (timed, not per-frame) ── */
    useEffect(() => {
        if (matRef.current) {
            matRef.current.emissiveIntensity = 2.5;
            const timer = setTimeout(() => {
                if (matRef.current) {
                    matRef.current.emissiveIntensity = 0;
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, []);

    /* ── Connector tip orientations (align to wire direction) ── */
    useEffect(() => {
        if (!curveObj) return;

        // Start tip: look along initial tangent
        if (tipStartRef.current) {
            const tangent = curveObj.getTangent(0).normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0), tangent
            );
            tipStartRef.current.quaternion.copy(q);
        }

        // End tip: look along final tangent (reversed)
        if (tipEndRef.current) {
            const tangent = curveObj.getTangent(1).normalize();
            const q = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0), tangent
            );
            tipEndRef.current.quaternion.copy(q);
        }
    }, [curveObj]);

    /* ── Simulation glow for active wires ── */
    const isSimulating = useLabStore(state => state.isSimulating);
    const voltages = useLabStore(state => state.pinVoltages);

    const isActive = useMemo(() => {
        if (!isSimulating || !wire) return false;
        const key = `${wire.startComponentId}::${wire.startPin}`;
        const v = voltages[key];
        return v !== undefined && v > 0.1;
    }, [isSimulating, voltages, wire]);

    // Persistent emissive when simulating active wire (override glow flash)
    useEffect(() => {
        if (matRef.current && animDone.current) {
            matRef.current.emissiveIntensity = isActive ? 1.5 : 0;
        }
    }, [isActive]);

    return (
        <group>
            {/* ═══ WIRE TUBE ═══ */}
            <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial
                    ref={matRef}
                    color={color}
                    roughness={0.35}
                    metalness={0.15}
                    emissive={color}
                    emissiveIntensity={0}
                />
            </mesh>

            {/* ═══ CONNECTOR TIP — START ═══ */}
            <group ref={tipStartRef} position={start}>
                <mesh>
                    <boxGeometry args={TIP_SIZE} />
                    <meshStandardMaterial
                        color={color}
                        roughness={0.5}
                        metalness={0.1}
                    />
                </mesh>
            </group>

            {/* ═══ CONNECTOR TIP — END ═══ */}
            <group ref={tipEndRef} position={end}>
                <mesh>
                    <boxGeometry args={TIP_SIZE} />
                    <meshStandardMaterial
                        color={color}
                        roughness={0.5}
                        metalness={0.1}
                    />
                </mesh>
            </group>
        </group>
    );
};
