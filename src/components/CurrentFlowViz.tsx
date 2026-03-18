
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLabStore } from '../store/useLabStore';

/*
 * CurrentFlowViz — Animated particles flowing along active wires.
 *
 * Shows electric current as glowing particles moving from positive
 * to negative terminals along the wire curves.
 *
 * Performance: Uses InstancedMesh to render up to MAX_PARTICLES
 * particles in a single draw call (VR-safe at 90fps).
 */

const MAX_PARTICLES = 200;
const PARTICLE_SIZE = 0.0015;
const PARTICLES_PER_WIRE = 12;
const SPEED = 0.8; // curve parameter speed per second

interface CurrentFlowVizProps {
    wirePositions: Array<{
        start: [number, number, number];
        end: [number, number, number];
        active: boolean;
        particleColor?: string;
    }>;
}

const colorTemp = new THREE.Color();

export const CurrentFlowViz: React.FC<CurrentFlowVizProps> = ({ wirePositions }) => {
    const showCurrentFlow = useLabStore(state => state.showCurrentFlow);
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Pre-build curves for active wires
    const { curves, totalParticles } = useMemo(() => {
        if (!showCurrentFlow) return { curves: [], totalParticles: 0 };

        const activeWires = wirePositions.filter(w => w.active);
        const c: { curve: THREE.CubicBezierCurve3, color: string }[] = [];

        for (const wire of activeWires) {
            const s = new THREE.Vector3(...wire.start);
            const e = new THREE.Vector3(...wire.end);
            const mid = s.clone().add(e).multiplyScalar(0.5);
            const dist = s.distanceTo(e);
            const lift = Math.min(dist * 0.4, 0.05);
            const sag = Math.min(dist * 0.15, 0.02);

            const cp1 = s.clone().lerp(mid, 0.35);
            cp1.y += lift;
            cp1.y -= sag * 0.25;

            const cp2 = e.clone().lerp(mid, 0.35);
            cp2.y += lift;
            cp2.y -= sag * 0.25;

            c.push({
                curve: new THREE.CubicBezierCurve3(s, cp1, cp2, e),
                color: wire.particleColor || '#ffee00'
            });
        }

        return {
            curves: c,
            totalParticles: Math.min(c.length * PARTICLES_PER_WIRE, MAX_PARTICLES)
        };
    }, [wirePositions, showCurrentFlow]);

    // Animate particles along curves
    useFrame(({ clock }) => {
        if (!meshRef.current || !showCurrentFlow || curves.length === 0) return;

        const t = clock.getElapsedTime();
        let idx = 0;

        for (let ci = 0; ci < curves.length && idx < totalParticles; ci++) {
            const { curve, color } = curves[ci];
            const perWire = Math.min(PARTICLES_PER_WIRE, totalParticles - idx);

            colorTemp.set(color);

            for (let pi = 0; pi < perWire; pi++) {
                const phase = (pi / perWire + t * SPEED) % 1;
                const point = curve.getPoint(phase);

                dummy.position.copy(point);
                dummy.scale.setScalar(0.8 + Math.sin(t * 6 + pi) * 0.3);
                dummy.updateMatrix();

                meshRef.current.setMatrixAt(idx, dummy.matrix);
                meshRef.current.setColorAt(idx, colorTemp);
                idx++;
            }
        }

        // Hide unused instances
        for (let i = idx; i < MAX_PARTICLES; i++) {
            dummy.position.set(0, -100, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    if (!showCurrentFlow || curves.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
            <sphereGeometry args={[PARTICLE_SIZE, 6, 6]} />
            <meshStandardMaterial
                transparent
                opacity={0.9}
                depthWrite={false}
                vertexColors={true}
                emissive="#ffffff"
                emissiveIntensity={1.5}
            />
        </instancedMesh>
    );
};
