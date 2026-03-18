
import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { useLabStore } from '../store/useLabStore';
import { AudioService } from '../services/AudioService';
import { getNearestBreadboardHoleLocal } from './Breadboard';

/* ═══════════════════════════════════════════════════════════════════
   TABLE SURFACE CONSTANTS
   Must match LabEnvironment.tsx central experiment table.
   The table surface is tilted -10° around X axis.
   Pivot point is at Y = legH (0.70m) + topH/2 (0.025m) = 0.725m.
   ═══════════════════════════════════════════════════════════════════ */
const TABLE_TILT_DEG = 10;
const TABLE_TILT_RAD = THREE.MathUtils.degToRad(TABLE_TILT_DEG);

// In LabEnvironment, table pivots at y=0.71. Surface is a Box (height 0.04) at local y=0.02, 
// meaning the actual top surface is at local y=0.04.
// Y_world = Pivot_Y + Surface_Local_Y / cos(tilt) - Z_world * tan(tilt)
const TABLE_PIVOT_Y = 0.71;
const TABLE_SURFACE_LOCAL_Y = 0.04;

// Flat fallback for drag plane (approximate center of table at z=0)
const TABLE_TOP_Y = TABLE_PIVOT_Y + (TABLE_SURFACE_LOCAL_Y / Math.cos(TABLE_TILT_RAD));

function getTiltedSurfaceY(z: number): number {
    return TABLE_TOP_Y - Math.tan(TABLE_TILT_RAD) * z;
}

// Table XZ bounds (half-widths with small inset so objects don't hang off edge)
const TABLE_X_HALF = 1.1;   // 2.4/2 - 0.1 margin
const TABLE_Z_HALF = 0.5;   // 1.2/2 - 0.1 margin

// Drag plane: horizontal plane at table surface height (approximate center)
const TABLE_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE_TOP_Y);

interface DraggableControlProps {
    id: string;
    type: string;
    children: React.ReactNode;
}

/**
 * Pulse the VR controller haptic actuator.
 * Uses the Gamepad Haptics API directly (works with Quest 3).
 */
function pulseHaptic(controller: THREE.Object3D | null, duration = 50, intensity = 0.5) {
    try {
        const src = (controller as any)?.inputSource as XRInputSource | undefined;
        const gp = src?.gamepad;
        if (!gp) return;
        // Standard Gamepad Haptics API
        if (gp.hapticActuators?.[0]) {
            (gp.hapticActuators[0] as any).pulse(intensity, duration);
        }
        // Alternative: vibrationActuator (Chrome)
        else if ((gp as any).vibrationActuator) {
            (gp as any).vibrationActuator.playEffect('dual-rumble', {
                duration,
                strongMagnitude: intensity,
                weakMagnitude: intensity * 0.5,
            });
        }
    } catch { /* silently ignore — not all browsers support haptics */ }
}

/**
 * DraggableControl — Surface-locked transform system with bottom-alignment.
 *
 * Rules:
 *   1. On mount, compute bounding-box bottom offset so model bottom rests on surface
 *   2. Y = TABLE_TOP_Y + bottomOffset at ALL times
 *   3. Drag raycasts onto the table plane — only X/Z change
 *   4. Store is read ONCE on mount; written back ONLY on drop
 *   5. All runtime transforms via refs (no per-frame state subscriptions)
 */
const getMountedY = (type: string, bbY: number) => {
    if (type === 'LED_LIGHT') return bbY + 0.004;
    if (type === 'RESISTOR') return bbY + 0.003;
    return bbY + 0.015;
};

const DraggableControlInner: React.FC<DraggableControlProps> = ({ id, type, children }) => {
    const { camera, gl, scene } = useThree();
    const { isPresenting } = useXR();
    const groupRef = useRef<THREE.Group>(null);

    // ── Bottom-offset: how far below the group origin the model extends ──
    // Computed once after first render, then cached
    const bottomOffsetRef = useRef(0);
    const offsetComputed = useRef(false);

    // ── Breadboard-mounted detection ──
    // Components placed ON a breadboard should keep their experiment-set Y,
    // not get snapped to TABLE_TOP_Y.
    const isBreadboardMounted = useRef(false);
    const mountedY = useRef(TABLE_TOP_Y);

    // ── Ref-based transform (authoritative) ──
    const posRef = useRef(new THREE.Vector3(0, TABLE_TOP_Y, 0));
    const rotRef = useRef(new THREE.Euler(0, 0, 0));

    // ── Interaction state (all refs) ──
    const isDragging = useRef(false);
    const dragMode = useRef<'MOVE' | 'ROTATE_XY' | 'ROTATE_Z' | null>(null);
    const initialMouse = useRef(new THREE.Vector2());
    const initialRotation = useRef<[number, number, number]>([0, 0, 0]);
    // VR: stores the controller that grabbed this component
    const vrGrabController = useRef<THREE.Object3D | null>(null);

    // ── Zustand selectors (granular) ──
    const isLocked = useLabStore(state => state.components.find(c => c.id === id)?.locked || false);
    const interactionMode = useLabStore(state => state.interactionMode);
    const focusedComponentId = useLabStore(state => state.focusedComponentId);
    const isFocused = focusedComponentId === id;

    // Reusable raycaster
    const raycaster = useMemo(() => new THREE.Raycaster(), []);

    const selectionRadius = useMemo(() => {
        switch (type) {
            case 'BREADBOARD': return 0.12;
            case 'ARDUINO_UNO': return 0.10;
            case 'RASPBERRY_PI': return 0.10;
            case 'BATTERY': return 0.06;
            case 'LED_LIGHT': return 0.03;
            case 'RESISTOR': return 0.04;
            case 'SWITCH': return 0.04;
            case 'POTENTIOMETER': return 0.05;
            default: return 0.06;
        }
    }, [type]);

    /** Compute the surface Y — accounts for the 10° table tilt */
    const getSurfaceY = useCallback(() => {
        // Breadboard-mounted components keep their experiment-set Y
        if (isBreadboardMounted.current) {
            return mountedY.current;
        }
        // Use Z-dependent surface height for tilted table
        return getTiltedSurfaceY(posRef.current.z) + bottomOffsetRef.current;
    }, []);

    // ── ONE-TIME initialization from store + bottom offset computation ──
    useEffect(() => {
        const comp = useLabStore.getState().components.find(c => c.id === id);
        if (comp && groupRef.current) {
            // Detect breadboard placement
            if ((comp as any).placement?.type === 'breadboard') {
                isBreadboardMounted.current = true;
                mountedY.current = comp.position.y;
            }

            // MUST apply the target tilt BEFORE measuring the bounding box! 
            // Otherwise the corners drop when we tilt it later, causing clipping.
            const targetTilt = isBreadboardMounted.current ? 0 : TABLE_TILT_RAD;
            rotRef.current.set(targetTilt, comp.rotation.y, comp.rotation.z);
            groupRef.current.rotation.copy(rotRef.current);

            // Position at initial Y (experiment-set for breadboard mounts, TABLE_TOP_Y otherwise)
            const initY = isBreadboardMounted.current ? comp.position.y : getTiltedSurfaceY(comp.position.z);
            groupRef.current.position.set(comp.position.x, initY, comp.position.z);
            groupRef.current.updateMatrixWorld(true);

            // Compute bounding box in world space AFTER children are rendered
            // Use requestAnimationFrame to ensure children (GLB models) are mounted
            requestAnimationFrame(() => {
                if (!groupRef.current || offsetComputed.current) return;

                // Breadboard-mounted: skip bounding-box correction, keep experiment Y
                if (isBreadboardMounted.current) {
                    offsetComputed.current = true;
                    posRef.current.set(comp.position.x, mountedY.current, comp.position.z);
                    groupRef.current!.position.copy(posRef.current);
                    useLabStore.getState().updateComponentPosition(id, {
                        x: posRef.current.x,
                        y: posRef.current.y,
                        z: posRef.current.z,
                    });
                    return;
                }

                const bbox = new THREE.Box3().setFromObject(groupRef.current);
                if (!bbox.isEmpty()) {
                    const currentBottomY = bbox.min.y;
                    bottomOffsetRef.current = TABLE_TOP_Y - currentBottomY;
                    offsetComputed.current = true;
                }

                // Apply corrected Y
                posRef.current.set(comp.position.x, getSurfaceY(), comp.position.z);
                groupRef.current!.position.copy(posRef.current);

                // ✅ Sync corrected position back to store so wire offsets are accurate
                useLabStore.getState().updateComponentPosition(id, {
                    x: posRef.current.x,
                    y: posRef.current.y,
                    z: posRef.current.z,
                });
            });

            posRef.current.set(comp.position.x, initY, comp.position.z);
            groupRef.current.position.copy(posRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // MOUNT ONLY

    // ── Frame loop: apply ref transforms (desktop only — VR uses controller.attach) ──
    useFrame(() => {
        if (!groupRef.current) return;

        // Lazy bottom-offset computation (retry if not yet computed — GLB may load late)
        if (!offsetComputed.current) {
            // Breadboard-mounted: mark as done immediately, keep experiment Y
            if (isBreadboardMounted.current) {
                offsetComputed.current = true;
                posRef.current.y = mountedY.current;
            } else {
                const bbox = new THREE.Box3().setFromObject(groupRef.current);
                if (!bbox.isEmpty() && bbox.max.y > bbox.min.y) {
                    const currentBottomY = bbox.min.y;
                    bottomOffsetRef.current = TABLE_TOP_Y - currentBottomY;
                    if (Math.abs(bottomOffsetRef.current) > 0.0001) {
                        offsetComputed.current = true;
                        posRef.current.y = getSurfaceY();

                        // ✅ Sync corrected position back to store
                        useLabStore.getState().updateComponentPosition(id, {
                            x: posRef.current.x,
                            y: posRef.current.y,
                            z: posRef.current.z,
                        });
                    }
                }
            }
        }

        // In VR, this group is attached to the controller — skip ref-based positioning.
        // The controller parent transform drives world position naturally.
        if (isDragging.current && vrGrabController.current) return;

        // Force surface Y every frame (prevents any drift — desktop only)
        posRef.current.y = getSurfaceY();

        // ── Align to Surface Normal ──
        // If it's on the table, it should tilt 10° to match the table's surface normal.
        // If it's on the breadboard, the breadboard is already tilted 10°, so local rotation X should be 0.
        const targetTilt = isBreadboardMounted.current ? 0 : TABLE_TILT_RAD;
        rotRef.current.x = targetTilt;

        // Apply ref to mesh
        groupRef.current.position.copy(posRef.current);
        groupRef.current.rotation.copy(rotRef.current);
    });

    // ── Snapshot to store (drag-end ONLY) ──
    const snapshotToStore = useCallback(() => {
        // Force Y correction before saving
        posRef.current.y = getSurfaceY();

        const store = useLabStore.getState();
        store.updateComponentPosition(id, {
            x: posRef.current.x,
            y: posRef.current.y,
            z: posRef.current.z,
        });
        store.updateComponentRotation(id, {
            x: rotRef.current.x,
            y: rotRef.current.y,
            z: rotRef.current.z,
        });
    }, [id, getSurfaceY]);

    // ── Auto-framing Camera ──
    useEffect(() => {
        if (isFocused && groupRef.current) {
            const controls = (scene as any).orbitControls;
            if (controls) {
                controls.target.lerp(posRef.current, 0.1);
            }
        }
    }, [isFocused, scene]);

    const handlePointerDown = useCallback((e: any) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        useLabStore.getState().setFocusedComponentId(id);

        if (isLocked || interactionMode === 'WIRE') return;

        isDragging.current = true;
        initialMouse.current.set(e.clientX, e.clientY);
        initialRotation.current = [rotRef.current.x, rotRef.current.y, rotRef.current.z];

        if (e.altKey) {
            dragMode.current = 'ROTATE_Z';
        } else if (e.shiftKey) {
            dragMode.current = 'ROTATE_XY';
        } else {
            dragMode.current = 'MOVE';
        }

        const controls = (scene as any).orbitControls;
        if (controls) controls.enabled = false;
    }, [id, isLocked, interactionMode, scene]);

    const handlePointerMove = useCallback((e: any) => {
        if (!isDragging.current || isLocked || interactionMode === 'WIRE') return;

        if (dragMode.current === 'MOVE') {
            // Raycast to table plane — only X/Z change, Y locked to surface
            const mouse = new THREE.Vector2(
                (e.clientX / gl.domElement.clientWidth) * 2 - 1,
                -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
            );
            raycaster.setFromCamera(mouse, camera);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(TABLE_PLANE, intersectPoint);

            if (intersectPoint) {
                let targetX = THREE.MathUtils.clamp(intersectPoint.x, -TABLE_X_HALF, TABLE_X_HALF);
                let targetZ = THREE.MathUtils.clamp(intersectPoint.z, -TABLE_Z_HALF, TABLE_Z_HALF);
                let isSnapped = false;

                // --- MAGNETIC SNAP TO BREADBOARD ---
                if (type !== 'BREADBOARD') {
                    const store = useLabStore.getState();
                    const breadboards = store.components.filter(c => c.type === 'BREADBOARD');

                    for (const bb of breadboards) {
                        // Check rough bounding box (speed up)
                        const dx = targetX - bb.position.x;
                        const dz = targetZ - bb.position.z;
                        if (Math.abs(dx) < 0.08 && Math.abs(dz) < 0.05) {
                            // Local breadboard pos
                            const localX = targetX - bb.position.x;
                            const localZ = targetZ - bb.position.z;

                            const snappedLocal = getNearestBreadboardHoleLocal(localX, localZ);
                            if (snappedLocal) {
                                // Apply snap
                                targetX = bb.position.x + snappedLocal.x;
                                targetZ = bb.position.z + snappedLocal.z;

                                // Align rotation to breadboard grid
                                rotRef.current.set(0, 0, 0);

                                // Map Y to sit rigidly above the board so legs insert visibly
                                isBreadboardMounted.current = true;
                                mountedY.current = getMountedY(type, bb.position.y);
                                isSnapped = true;
                                break;
                            }
                        }
                    }
                }

                // If dragged away from breadboard bounding boxes, reset to table surface
                if (!isSnapped && isBreadboardMounted.current) {
                    isBreadboardMounted.current = false;
                }

                posRef.current.set(
                    targetX,
                    getSurfaceY(), // Returns mountedY if snapped, else TABLE_TOP_Y + bottom offset
                    targetZ
                );
            }
        } else if (dragMode.current === 'ROTATE_XY') {
            const sensitivity = 0.012;
            const deltaX = (e.clientX - initialMouse.current.x) * sensitivity;
            const deltaY = (e.clientY - initialMouse.current.y) * sensitivity;
            rotRef.current.set(
                initialRotation.current[0] - deltaY,
                initialRotation.current[1] + deltaX,
                initialRotation.current[2],
            );
        } else if (dragMode.current === 'ROTATE_Z') {
            const sensitivity = 0.012;
            const deltaX = (e.clientX - initialMouse.current.x) * sensitivity;
            rotRef.current.set(
                initialRotation.current[0],
                initialRotation.current[1],
                initialRotation.current[2] + deltaX,
            );
        }
    }, [camera, gl, isLocked, interactionMode, raycaster, getSurfaceY]);

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
        dragMode.current = null;

        // Force surface-lock before snapshot
        posRef.current.y = getSurfaceY();
        snapshotToStore();

        const controls = (scene as any).orbitControls;
        if (controls) controls.enabled = true;
    }, [snapshotToStore, scene, getSurfaceY]);

    const handleContextMenu = useCallback((e: any) => {
        e.nativeEvent?.preventDefault();
        e.stopPropagation();
        if (isLocked || interactionMode === 'WIRE') return;

        // Reset orientation but preserve the surface tilt X
        const defaultTilt = isBreadboardMounted.current ? 0 : TABLE_TILT_RAD;
        rotRef.current.set(defaultTilt, 0, 0);
        posRef.current.y = getSurfaceY();
        snapshotToStore();
        useLabStore.getState().setFocusedComponentId(id);
    }, [id, isLocked, interactionMode, snapshotToStore, getSurfaceY]);

    // ── VR Squeeze Handlers (Grip) for Moving ──
    const handleSqueezeStart = useCallback((e: any) => {
        e.stopPropagation?.();
        useLabStore.getState().setFocusedComponentId(id);

        if (interactionMode === 'WIRE' || interactionMode === 'INSPECT' || interactionMode === 'SCAN') return;

        if (isLocked) return;
        if (!groupRef.current) return;

        const ctrl = e.controller?.controller ?? e.target;
        if (!ctrl) return;

        isDragging.current = true;
        dragMode.current = 'MOVE';
        vrGrabController.current = ctrl;

        AudioService.playGrab();
        pulseHaptic(ctrl, 50, 0.5); // Short haptic pulse on grab

        // ✅ Physically attach the component to the controller so it follows the hand
        ctrl.attach(groupRef.current);
    }, [id, isLocked, interactionMode]);

    const handleSqueezeEnd = useCallback(() => {
        if (!isDragging.current || dragMode.current !== 'MOVE' || !groupRef.current) return;

        const ctrl = vrGrabController.current;

        isDragging.current = false;
        dragMode.current = null;

        // Haptic pulse on release (lighter)
        pulseHaptic(ctrl, 30, 0.3);
        AudioService.playRelease();

        vrGrabController.current = null;

        if (ctrl) {
            // ✅ Re-parent back to scene so transform becomes world-space
            scene.attach(groupRef.current);
        }

        let targetX = THREE.MathUtils.clamp(groupRef.current.position.x, -TABLE_X_HALF, TABLE_X_HALF);
        let targetZ = THREE.MathUtils.clamp(groupRef.current.position.z, -TABLE_Z_HALF, TABLE_Z_HALF);
        let isSnapped = false;

        // --- MAGNETIC SNAP TO BREADBOARD (VR RELEASE) ---
        if (type !== 'BREADBOARD') {
            const store = useLabStore.getState();
            const breadboards = store.components.filter(c => c.type === 'BREADBOARD');

            for (const bb of breadboards) {
                const dx = targetX - bb.position.x;
                const dz = targetZ - bb.position.z;
                if (Math.abs(dx) < 0.08 && Math.abs(dz) < 0.05) {
                    const localX = targetX - bb.position.x;
                    const localZ = targetZ - bb.position.z;

                    const snappedLocal = getNearestBreadboardHoleLocal(localX, localZ);
                    if (snappedLocal) {
                        targetX = bb.position.x + snappedLocal.x;
                        targetZ = bb.position.z + snappedLocal.z;

                        rotRef.current.set(0, 0, 0);

                        isBreadboardMounted.current = true;
                        mountedY.current = getMountedY(type, bb.position.y);
                        isSnapped = true;
                        break;
                    }
                }
            }
        }

        if (!isSnapped && isBreadboardMounted.current) {
            isBreadboardMounted.current = false;
        }

        // --- DOWNWARD RAYCAST SURFACE SNAP ---
        // Cast a ray straight down from the object to find the nearest surface.
        // This ensures components land on tables/benches even when released mid-air.
        let snapY = getSurfaceY();
        if (!isBreadboardMounted.current) {
            const rayOrigin = new THREE.Vector3(targetX, groupRef.current.position.y + 0.5, targetZ);
            const rayDir = new THREE.Vector3(0, -1, 0);
            const downRay = new THREE.Raycaster(rayOrigin, rayDir, 0, 3.0);
            // Temporarily detach so the raycast doesn't hit self
            const selfVisible = groupRef.current.visible;
            groupRef.current.visible = false;
            const hits = downRay.intersectObjects(scene.children, true);
            groupRef.current.visible = selfVisible;
            for (const hit of hits) {
                // Skip non-mesh or invisible objects
                if (!hit.object.visible) continue;
                // Accept surfaces at reasonable heights (table surfaces, benches)
                if (hit.point.y >= 0 && hit.point.y <= 2.0) {
                    snapY = hit.point.y + bottomOffsetRef.current;
                    break;
                }
            }
        }

        // Snap Y to surface and clamp XZ to table bounds
        posRef.current.set(
            targetX,
            snapY,
            targetZ
        );

        // Apply visual and save
        groupRef.current.position.copy(posRef.current);
        snapshotToStore();
    }, [type, snapshotToStore, getSurfaceY, scene]);

    // ── VR Select Handlers (Trigger) for Inspection/Action ──
    const handleSelectStart = useCallback((e: any) => {
        e.stopPropagation?.();
        useLabStore.getState().setFocusedComponentId(id);

        if (interactionMode === 'WIRE') return;

        // SCAN/INSPECT mode — LabMate AI explains the component
        if (interactionMode === 'SCAN' || interactionMode === 'INSPECT') {
            import('../services/VoiceService').then(({ VoiceService }) => {
                import('../data/ComponentKnowledge').then(({ ComponentDescriptions }) => {
                    const dict = ComponentDescriptions as Record<string, string>;
                    const desc = dict[type] || `This is a ${type} component.`;
                    VoiceService.speak(desc);
                });
            });
            return;
        }
    }, [id, type, interactionMode]);

    const handleSelectEnd = useCallback(() => {
        // Nothing needed here for inspection
    }, []);

    return (
        <group
            ref={groupRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onContextMenu={handleContextMenu}
        >
            <Interactive
                onSelectStart={handleSelectStart}
                onSelectEnd={handleSelectEnd}
                onSqueezeStart={handleSqueezeStart}
                onSqueezeEnd={handleSqueezeEnd}
            >
                {children}

                {/* Selection Ring — cyan in VR MOVE mode to signal "grab-ready" */}
                {(isFocused || isDragging.current) && interactionMode !== 'WIRE' && (
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[selectionRadius, selectionRadius + 0.008, 64]} />
                        <meshBasicMaterial
                            color={
                                isDragging.current ? '#38bdf8'
                                    : (isPresenting && interactionMode === 'MOVE') ? '#00ffcc'
                                        : (isLocked ? '#94a3b8' : '#fbbf24')
                            }
                            transparent
                            opacity={0.75}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}

                {/* VR grab-ready indicator: always-on subtle ring in VR MOVE mode */}
                {isPresenting && !isDragging.current && interactionMode === 'MOVE' && !isLocked && (
                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[selectionRadius * 0.92, selectionRadius + 0.006, 48]} />
                        <meshBasicMaterial
                            color="#00ffcc"
                            transparent
                            opacity={0.35}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}

                {/* Lock Indicator */}
                {isLocked && isFocused && (
                    <group position={[0, 0.06, 0]}>
                        <mesh>
                            <sphereGeometry args={[0.005, 12, 12]} />
                            <meshBasicMaterial color="#ef4444" />
                        </mesh>
                    </group>
                )}

                {/* Contact Shadow (grounding) */}
                <mesh position={[0, -0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[selectionRadius * 0.8, 32]} />
                    <meshBasicMaterial
                        color="#000000"
                        transparent
                        opacity={0.12}
                        depthWrite={false}
                    />
                </mesh>
            </Interactive>
        </group>
    );
};

export const DraggableControl = React.memo(DraggableControlInner);
