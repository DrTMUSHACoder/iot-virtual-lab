
import React, { useState, useMemo, useRef } from 'react';
import { useLabStore } from '../store/useLabStore';
import { Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { pickRandomWireColor } from './Wire';
import { playUISnap, playUIHover } from '../utils/audioSystem';
import { AudioService } from '../services/AudioService';

interface PinProps {
    name: string;
    position: [number, number, number];
    componentId: string;
    showShaft?: boolean;
}

/**
 * Individual Physical Pin — Professional snap anchor system.
 *
 * Architecture:
 *   1. Metallic pin shaft — visible, extends UPWARD from board surface
 *   2. Invisible snap anchor — sphere collider for wiring interaction
 *   3. Hover tooltip — billboard label (always faces camera), one at a time
 *
 * Each pin has:
 *   - Own unique ID: componentId::pinName
 *   - Own invisible collider (no visual glow)
 *   - Own snap position
 *   - Independent hover detection
 *   - No overlap with adjacent pins
 */
export const Pin: React.FC<PinProps> = ({ name, position, componentId, showShaft = true }) => {
    const interactionMode = useLabStore(state => state.interactionMode);
    const setInteractionMode = useLabStore(state => state.setInteractionMode);
    const pendingWireStart = useLabStore(state => state.pendingWireStart);
    const setPendingWire = useLabStore(state => state.setPendingWire);
    const addWire = useLabStore(state => state.addWire);
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const currentStep = useLabStore(state => state.currentStep);
    const refIdMap = useLabStore(state => state.refIdMap);
    const validateConnection = useLabStore(state => state.validateConnection);
    const components = useLabStore(state => state.components);
    const { isPresenting, controllers } = useXR();

    const [hovered, setHovered] = useState(false);
    const ringRef = useRef<THREE.Mesh>(null);
    const anchorRef = useRef<THREE.Object3D>(null);

    // ── Pin category classification ──
    const pinInfo = useMemo(() => {
        const n = name.toUpperCase().replace(/\s/g, '');
        if (n.includes('5V') || n.includes('VCC') || n.includes('VIN') || n.includes('PWR') || n.includes('(+)'))
            return { color: '#ff4b5c', category: 'POWER', tooltip: `Power — ${name}` };
        if (n.includes('3.3V') || n.includes('3V3'))
            return { color: '#ff8c00', category: 'POWER_3V', tooltip: `Power — ${name}` };
        if (n.includes('GND') || n.includes('GROUND') || n.includes('(-)') || n === 'G')
            return { color: '#607d8b', category: 'GND', tooltip: `Ground (GND)` };
        if (n === 'RESET')
            return { color: '#e17055', category: 'RESET', tooltip: 'Reset' };
        if (n === 'AREF')
            return { color: '#fdcb6e', category: 'AREF', tooltip: 'Analog Reference (AREF)' };
        if (n.includes('SDA') || n.includes('SCL') || n.includes('MISO') || n.includes('MOSI') || n.includes('SCK'))
            return { color: '#a29bfe', category: 'COMM', tooltip: `Communication — ${name}` };
        if (n.startsWith('RX') || n.startsWith('TX'))
            return { color: '#a29bfe', category: 'COMM', tooltip: `Serial — ${name}` };
        if (/^A\d+$/.test(n))
            return { color: '#fab1a0', category: 'ANALOG', tooltip: `Analog Pin ${n.slice(1)} (${name})` };
        if (/^D\d+$/.test(n))
            return { color: '#55efc4', category: 'GPIO', tooltip: `Digital Pin ${n.slice(1)} (${name})` };
        if (/^GPIO/.test(n))
            return { color: '#55efc4', category: 'GPIO', tooltip: `GPIO — ${name}` };
        if (n.includes('ANODE') || n.includes('CATHODE'))
            return { color: '#fdcb6e', category: 'LED', tooltip: name };
        return { color: '#55efc4', category: 'GPIO', tooltip: name };
    }, [name]);

    // ── Guided experiment state ──
    const pinState = useMemo(() => {
        if (!activeExperiment) return 'normal';
        const step = activeExperiment.steps[currentStep];
        if (!step?.expectedConnection) return 'normal';
        const ec = step.expectedConnection;
        const fromCId = refIdMap[ec.fromRefId];
        const toCId = refIdMap[ec.toRefId];
        if ((componentId === fromCId && name === ec.fromPin) ||
            (componentId === toCId && name === ec.toPin)) {
            return 'expected';
        }
        return 'dimmed';
    }, [activeExperiment, currentStep, componentId, name, refIdMap]);

    // Pulse for expected pins
    useFrame(({ clock }) => {
        if (ringRef.current && pinState === 'expected') {
            const s = Math.sin(clock.getElapsedTime() * 4) * 0.15 + 0.85;
            ringRef.current.scale.setScalar(s);
        }
    });

    const isPending = pendingWireStart?.componentId === componentId && pendingWireStart?.pinName === name;
    const isDimmed = pinState === 'dimmed' && !isPending;

    // ── Click / VR-select handler ──
    const handleClick = (e: any) => {
        e.stopPropagation?.();

        const comp = components.find((c) => c.id === componentId);
        if (!comp || !anchorRef.current) return;

        // Obtain exact world position of the tip of the pin
        const worldPos = new THREE.Vector3();
        anchorRef.current.getWorldPosition(worldPos);

        // Push anchor outward along pin's up direction (3mm) so wire
        // attaches at the tip, not the mesh center / side
        const pinUp = new THREE.Vector3(0, 1, 0);
        anchorRef.current.getWorldDirection(pinUp);
        worldPos.add(pinUp.multiplyScalar(0.003));

        // ── Compute offset relative to the DraggableControl group's
        //    ACTUAL world position (not the stale store comp.position).
        //    Walk up scene graph to find the component root group.
        let componentGroup: THREE.Object3D | null = anchorRef.current;
        while (componentGroup && componentGroup.parent) {
            // DraggableControl renders <group ref={groupRef}> which is the
            // top-level parent before the scene. We detect it by checking
            // if the parent's parent is the scene or an Interactive wrapper.
            if (componentGroup.parent.type === 'Scene' ||
                componentGroup.parent.parent?.type === 'Scene') {
                break;
            }
            componentGroup = componentGroup.parent;
        }

        const groupWorldPos = new THREE.Vector3();
        if (componentGroup) {
            componentGroup.getWorldPosition(groupWorldPos);
        } else {
            // Fallback: use store position
            groupWorldPos.set(comp.position.x, comp.position.y, comp.position.z);
        }

        const offset = {
            x: worldPos.x - groupWorldPos.x,
            y: worldPos.y - groupWorldPos.y,
            z: worldPos.z - groupWorldPos.z
        };

        // ✅ VR: auto-enter WIRE mode on pin tap. No dashboard required.
        if (isPresenting) {
            if (!pendingWireStart) {
                // First tap — start wire and auto-switch to WIRE mode
                setInteractionMode('WIRE');
                setPendingWire({ componentId, pinName: name, position: offset });
                playUIHover();
            } else if (pendingWireStart.componentId !== componentId) {
                // Second tap (different component) — complete wire
                const wireData = {
                    startComponentId: pendingWireStart.componentId,
                    startPin: pendingWireStart.pinName,
                    startOffset: pendingWireStart.position,
                    endComponentId: componentId,
                    endPin: name,
                    endOffset: offset,
                    color: pickRandomWireColor()
                };
                if (activeExperiment) {
                    const isValid = validateConnection(wireData);
                    if (isValid) {
                        const step = activeExperiment.steps[currentStep];
                        if (step?.expectedConnection) wireData.color = step.expectedConnection.wireColor;
                        addWire(wireData);
                        playUISnap();
                    }
                } else {
                    addWire(wireData);
                    playUISnap();
                    AudioService.playWireConnect();
                }
                setPendingWire(null);
                // Auto-revert to MOVE mode after completing a wire
                setInteractionMode('MOVE');

                // Safe haptic pulse for VR feedback
                try {
                    const ctrl = controllers.find(c => c?.inputSource?.handedness === 'right') ?? controllers[0];
                    const actuator = (ctrl?.inputSource as any)?.gamepad?.hapticActuators?.[0];
                    if (actuator) actuator.pulse(0.5, 50);
                } catch { /* haptics not supported */ }
            }
            return;
        }

        // Desktop: only works when explicitly in WIRE mode
        if (interactionMode !== 'WIRE' || isDimmed) return;

        if (!pendingWireStart) {
            setPendingWire({
                componentId, pinName: name,
                position: offset
            });
        } else if (pendingWireStart.componentId !== componentId) {
            const wireData = {
                startComponentId: pendingWireStart.componentId,
                startPin: pendingWireStart.pinName,
                startOffset: pendingWireStart.position,
                endComponentId: componentId,
                endPin: name,
                endOffset: offset,
                color: pickRandomWireColor()
            };
            if (activeExperiment) {
                const isValid = validateConnection(wireData);
                if (isValid) {
                    const step = activeExperiment.steps[currentStep];
                    if (step?.expectedConnection) wireData.color = step.expectedConnection.wireColor;
                    addWire(wireData);
                    playUISnap();
                    AudioService.playWireConnect();
                }
            } else {
                addWire(wireData);
                playUISnap();
                AudioService.playWireConnect();
            }
            setPendingWire(null);
        }
    };

    // Strictly ONLY show tooltip if explicitly hovered
    const showLabel = hovered;

    const pinMaterial = useMemo(() => {
        const color = (pinInfo.category === 'POWER' || pinInfo.category === 'POWER_3V') ? '#daa520' : '#c0c0c0';
        const opacity = isDimmed ? 0.15 : 1.0;
        return new THREE.MeshStandardMaterial({
            color,
            metalness: 0.8,
            roughness: 0.4,
            transparent: opacity < 1,
            opacity,
        });
    }, [pinInfo.category, isDimmed]);

    // ── VR-OPTIMIZED GEOMETRY CONSTANTS ──
    const SHAFT_H = 0.016;           // +30% taller for physical realism
    const SHAFT_W = 0.0035;          // wider shaft closer to physical dupont square
    const SHAFT_Y = SHAFT_H / 2;
    const TIP_Y = SHAFT_H;
    const ANCHOR_Y = SHAFT_Y;

    return (
        <group position={position}>
            {/* World Snap Target Point */}
            <object3D ref={anchorRef} position={[0, SHAFT_H, 0]} />

            {/* ═══ PIN SHAFT (visible metallic pin) ═══ */}
            {showShaft && (
                <mesh position={[0, SHAFT_Y, 0]} receiveShadow material={pinMaterial}>
                    <boxGeometry args={[SHAFT_W, SHAFT_H, SHAFT_W]} />
                </mesh>
            )}

            {/* ═══ INVISIBLE SNAP ANCHOR (collider only — no visual) ═══ */}
            <Interactive
                onSelect={handleClick}
                onHover={() => !isDimmed && setHovered(true)}
                onBlur={() => setHovered(false)}
            >
                <mesh
                    position={[0, ANCHOR_Y + 0.010, 0]}
                    onPointerOver={() => !isDimmed && setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                    onClick={handleClick}
                // Removed visible={false} because it disables VR raycasting.
                // Relying entirely on opacity={0} instead.
                >
                    {/* Tall box collider: width 2.4mm to fit inside 2.54mm pitch without overlapping. Extra height so laser hits it easily. */}
                    <boxGeometry args={[0.0024, 0.035, 0.0024]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} color="#ffffff" />
                </mesh>
            </Interactive>

            {/* ═══ HOVER OUTLINE RING (VR-optimized, no glowing sphere) ═══ */}
            {(hovered || isPending) && !isDimmed && (
                <mesh position={[0, TIP_Y + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.004, 0.006, 24]} />
                    <meshStandardMaterial
                        color={isPending ? '#ff9800' : hovered ? '#ffff00' : '#00e6ff'}
                        emissive={isPending ? '#ff9800' : hovered ? '#ffff00' : '#00e6ff'}
                        emissiveIntensity={1.5}
                        transparent
                        opacity={0.8}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* ═══ PULSE RING (expected pins in guided mode) ═══ */}
            {pinState === 'expected' && (
                <mesh ref={ringRef} position={[0, TIP_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.005, 0.008, 24]} />
                    <meshStandardMaterial
                        color="#ff00ff"
                        emissive="#ff00ff"
                        emissiveIntensity={4.0}
                        transparent
                        opacity={0.8}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* ═══ PENDING RING ═══ */}
            {isPending && (
                <mesh position={[0, TIP_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.004, 0.006, 24]} />
                    <meshStandardMaterial
                        color="#ff9800"
                        emissive="#ff9800"
                        emissiveIntensity={2.5}
                        transparent
                        opacity={0.8}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* ═══ BILLBOARD TOOLTIP (VR-sized, always faces camera) ═══ */}
            {showLabel && !isDimmed && (
                <Billboard position={[0, TIP_Y + 0.012, 0]}>
                    {/* Background pill */}
                    <mesh>
                        <planeGeometry args={[
                            Math.max(0.028, pinInfo.tooltip.length * 0.0025),
                            0.010
                        ]} />
                        <meshBasicMaterial
                            color="#0f172a"
                            transparent
                            opacity={0.94}
                        />
                    </mesh>
                    {/* Border */}
                    <mesh position={[0, 0, -0.0001]}>
                        <planeGeometry args={[
                            Math.max(0.030, pinInfo.tooltip.length * 0.0025 + 0.002),
                            0.012
                        ]} />
                        <meshBasicMaterial
                            color={pinInfo.color}
                            transparent
                            opacity={0.6}
                        />
                    </mesh>
                    {/* Text — VR readable */}
                    <Text
                        position={[0, 0, 0.0001]}
                        fontSize={0.005}
                        color="#ffffff"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0}
                    >
                        {pinInfo.tooltip}
                    </Text>
                </Billboard>
            )}
        </group>
    );
};
