import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import { useAssistantStore } from '../../store/useAssistantStore';
import type { AssistantMode } from '../../store/useAssistantStore';

/* ═══════════════════════════════════════════════════════════════════
   LabMate AI — Industry-Grade VR Holographic Assistant
   ═══════════════════════════════════════════════════════════════════

   Visual structure (all procedural, no GLBs):
     1. Projection Base (CylinderGeometry, rotating segments)
     2. Energy Column (faint beam connecting base → core)
     3. AI Core (SphereGeometry, breathing animation)
     4. Orbit Rings (3× TorusGeometry, gyroscopic rotation)
     5. Particle Field (InstancedMesh, 120 orbiting particles)
     6. Subtitle Panel (glass panel, shows spoken text)

   Performance budget:
     ≤ 4 draw calls for geometry
     ≤ 150 instanced particles (single draw call)
     No shadows, no dynamic lights, emissive only
   ═══════════════════════════════════════════════════════════════════ */

const PARTICLE_COUNT = 120;

// Pre-compute random particle orbit data
const particleData = new Float32Array(PARTICLE_COUNT * 4); // [orbitRadius, orbitSpeed, orbitPhase, yOffset]
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleData[i * 4 + 0] = 0.05 + Math.random() * 0.06;     // orbit radius
    particleData[i * 4 + 1] = 0.3 + Math.random() * 0.8;       // orbit speed
    particleData[i * 4 + 2] = Math.random() * Math.PI * 2;      // phase offset
    particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.08;    // y offset from core
}

interface LabMateAIProps {
    position: [number, number, number];
}

// Color scheme per mode
const MODE_COLORS: Record<AssistantMode, string> = {
    idle: '#00d2ff',
    explaining: '#00ffcc',
    warning: '#ff6b35',
    scanning: '#bd93f9',
    disabled: '#4a5568',
};

export const LabMateAI: React.FC<LabMateAIProps> = ({ position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const ring3Ref = useRef<THREE.Mesh>(null);
    const particlesRef = useRef<THREE.InstancedMesh>(null);
    const columnRef = useRef<THREE.Mesh>(null);
    const baseRef = useRef<THREE.Group>(null);

    const { camera } = useThree();
    const { mode, message, isVisible } = useAssistantStore();

    const targetColor = useMemo(() => new THREE.Color(MODE_COLORS[mode] || MODE_COLORS.idle), [mode]);
    const tempObj = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);

    // Create shared hologram materials (cached via useMemo)
    const hologramMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00d2ff',
        emissive: '#00d2ff',
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.8,
    }), []);

    const wireframeMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00d2ff',
        emissive: '#00d2ff',
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
    }), []);

    const particleMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#00d2ff',
        transparent: true,
        opacity: 0.6,
    }), []);

    // ── Frame Loop ──
    useFrame(({ clock }, delta) => {
        if (!groupRef.current || !isVisible) return;
        const t = clock.getElapsedTime();

        // ┌─ 1. Idle hover (gentle bob) ─┐
        groupRef.current.position.y = position[1] + Math.sin(t * 1.8) * 0.012;

        // ┌─ 2. Face the camera (Y-axis only to stay upright) ─┐
        if (baseRef.current) {
            const dir = new THREE.Vector3();
            dir.subVectors(camera.position, groupRef.current.getWorldPosition(new THREE.Vector3()));
            const angle = Math.atan2(dir.x, dir.z);
            baseRef.current.rotation.y = angle;
        }

        // ┌─ 3. Ring rotations (gyroscopic speeds vary by mode) ─┐
        const speedMul = mode === 'warning' ? 2.5 : mode === 'explaining' ? 1.5 : 1.0;
        if (ring1Ref.current) {
            ring1Ref.current.rotation.y += delta * 0.5 * speedMul;
            ring1Ref.current.rotation.x += delta * 0.3 * speedMul;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.x += delta * 0.7 * speedMul;
            ring2Ref.current.rotation.z += delta * 0.4 * speedMul;
        }
        if (ring3Ref.current) {
            ring3Ref.current.rotation.z += delta * 0.3 * speedMul;
            ring3Ref.current.rotation.y -= delta * 0.6 * speedMul;
        }

        // ┌─ 4. Core pulse animation ─┐
        let coreScale = 1.0;
        if (mode === 'explaining') {
            coreScale = 1.0 + Math.sin(t * 12) * 0.12;
        } else if (mode === 'warning') {
            coreScale = 1.0 + Math.random() * 0.18; // Glitchy
        } else if (mode === 'scanning') {
            coreScale = 1.0 + Math.sin(t * 6) * 0.08;
        } else {
            coreScale = 1.0 + Math.sin(t * 2.5) * 0.04; // Calm breathing
        }

        if (coreRef.current) {
            coreRef.current.scale.setScalar(coreScale);

            // Smooth color transitions
            const mat = coreRef.current.material as THREE.MeshStandardMaterial;
            mat.color.lerp(targetColor, 0.08);
            mat.emissive.lerp(targetColor, 0.08);
        }

        // Sync ring colors
        [ring1Ref, ring2Ref, ring3Ref].forEach(ref => {
            const rMat = ref.current?.material as THREE.MeshStandardMaterial | undefined;
            if (rMat) {
                rMat.color.lerp(targetColor, 0.08);
                rMat.emissive.lerp(targetColor, 0.08);
            }
        });

        // ┌─ 5. Particle field (orbiting around core) ─┐
        if (particlesRef.current) {
            tempColor.copy(targetColor);
            particleMat.color.lerp(tempColor, 0.1);

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const radius = particleData[i * 4 + 0];
                const speed = particleData[i * 4 + 1] * speedMul;
                const phase = particleData[i * 4 + 2];
                const yOff = particleData[i * 4 + 3];

                const angle = t * speed + phase;
                tempObj.position.set(
                    Math.cos(angle) * radius,
                    yOff + Math.sin(t * 1.5 + phase) * 0.01,
                    Math.sin(angle) * radius,
                );
                tempObj.scale.setScalar(0.0008 + Math.sin(t * 3 + phase) * 0.0003);
                tempObj.updateMatrix();
                particlesRef.current.setMatrixAt(i, tempObj.matrix);
            }
            particlesRef.current.instanceMatrix.needsUpdate = true;
        }

        // ┌─ 6. Energy column opacity pulse ─┐
        if (columnRef.current) {
            const colMat = columnRef.current.material as THREE.MeshBasicMaterial;
            colMat.opacity = 0.08 + Math.sin(t * 4) * 0.04;
            colMat.color.lerp(targetColor, 0.05);
        }
    });

    if (!isVisible) return null;

    return (
        <group position={[position[0], 0, position[2]]}>
            {/* ── Projection Base (rotating cyan ring on table) ── */}
            <group ref={baseRef} position={[0, position[1] - 0.16, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.008, 32]} />
                    <meshStandardMaterial
                        color={targetColor}
                        emissive={targetColor}
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.3}
                    />
                </mesh>
                {/* Inner ring detail */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <ringGeometry args={[0.06, 0.08, 32]} />
                    <meshBasicMaterial color={targetColor} transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            </group>

            {/* ── Energy Column (faint beam base → core) ── */}
            <mesh ref={columnRef} position={[0, position[1] - 0.08, 0]}>
                <cylinderGeometry args={[0.003, 0.01, 0.15, 8]} />
                <meshBasicMaterial color={targetColor} transparent opacity={0.1} />
            </mesh>

            {/* ── Floating Hologram Group (bobs up and down) ── */}
            <group ref={groupRef} position={[0, position[1], 0]}>
                {/* AI Core */}
                <mesh ref={coreRef} material={hologramMat}>
                    <sphereGeometry args={[0.04, 32, 32]} />
                </mesh>

                {/* Orbit Ring 1 */}
                <mesh ref={ring1Ref} material={hologramMat}>
                    <torusGeometry args={[0.06, 0.002, 16, 64]} />
                </mesh>

                {/* Orbit Ring 2 (wireframe) */}
                <mesh ref={ring2Ref} material={wireframeMat}>
                    <torusGeometry args={[0.075, 0.003, 8, 32]} />
                </mesh>

                {/* Orbit Ring 3 */}
                <mesh ref={ring3Ref} material={hologramMat}>
                    <torusGeometry args={[0.09, 0.001, 16, 64]} />
                </mesh>

                {/* ── Particle Field (InstancedMesh — single draw call) ── */}
                <instancedMesh
                    ref={particlesRef}
                    args={[undefined, undefined, PARTICLE_COUNT]}
                    material={particleMat}
                >
                    <sphereGeometry args={[1, 6, 6]} />
                </instancedMesh>

                {/* ── Subtitle Panel (glass background) ── */}
                {message && (
                    <Billboard position={[0, 0.18, 0]}>
                        {/* Glass background */}
                        <mesh position={[0, 0, -0.002]}>
                            <planeGeometry args={[0.44, 0.1]} />
                            <meshBasicMaterial
                                color={mode === 'warning' ? '#1a0500' : '#050d18'}
                                transparent
                                opacity={0.85}
                            />
                        </mesh>
                        {/* Border glow */}
                        <mesh position={[0, 0, -0.003]}>
                            <planeGeometry args={[0.448, 0.108]} />
                            <meshBasicMaterial
                                color={MODE_COLORS[mode]}
                                transparent
                                opacity={0.35}
                            />
                        </mesh>
                        {/* Text */}
                        <Text
                            position={[0, 0, 0]}
                            fontSize={0.016}
                            color="#ffffff"
                            maxWidth={0.4}
                            textAlign="center"
                            anchorX="center"
                            anchorY="middle"
                            lineHeight={1.3}
                            raycast={() => null}
                        >
                            {message}
                        </Text>
                        {/* Mode indicator dot */}
                        <mesh position={[-0.2, 0.038, 0]}>
                            <circleGeometry args={[0.005, 16]} />
                            <meshBasicMaterial color={MODE_COLORS[mode]} />
                        </mesh>
                        <Text
                            position={[-0.185, 0.038, 0]}
                            fontSize={0.009}
                            color={MODE_COLORS[mode]}
                            anchorX="left"
                            anchorY="middle"
                            raycast={() => null}
                        >
                            {mode === 'explaining' ? 'SPEAKING' :
                                mode === 'warning' ? 'WARNING' :
                                    mode === 'scanning' ? 'SCANNING' : 'LABMATE AI'}
                        </Text>
                    </Billboard>
                )}
            </group>
        </group>
    );
};
