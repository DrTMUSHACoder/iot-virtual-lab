import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { CollisionRegistry } from './CollisionSystem';
import { LAB_DIMENSIONS } from './LabEnvironment';

/**
 * VRLocomotion — Thumbstick locomotion for the expanded college lab.
 *
 * Left thumbstick  → smooth walk (camera-relative)
 * Right thumbstick → smooth turning
 * Session start    → spawn at corridor entrance, facing into lab
 *
 * Collision system:
 *   - Player is a capsule (h=1.6m, r=0.3m)
 *   - Colliders registered by LabEnvironment (tables, walls, cabinets)
 *   - Axis-separated sliding response (slide along walls, don't stop dead)
 *   - Safety boundaries: floor clamp, ceiling clamp, room boundary
 *
 * Controller detection is forgiving:
 *   - First tries handedness-based lookup ('left'/'right')
 *   - Falls back to controllers[0]/controllers[1] if handedness is unavailable
 *   - Checks all gamepad axes for maximum magnitude (Quest 3 compat)
 */

// ── Spawn Position (in front of table, facing it = -Z direction) ──
const SPAWN_POS = new THREE.Vector3(0, 0, 2.8);

// Debug log throttle (ms)
const DEBUG_LOG_INTERVAL = 2000;

// Safety boundaries
const FLOOR_Y = 0;      // Player feet cannot go below this
const ROOM_H = LAB_DIMENSIONS.ROOM_H; // Ceiling height

export const VRLocomotion: React.FC = () => {
    const { isPresenting, player, controllers } = useXR();
    const { camera } = useThree();

    // ── Session Start Spawn Position ──
    const hasSpawned = useRef(false);
    const lastDebugLog = useRef(0);

    React.useEffect(() => {
        if (isPresenting && player && !hasSpawned.current) {
            player.position.copy(SPAWN_POS);
            player.rotation.set(0, Math.PI, 0); // Face -Z (into the lab)
            hasSpawned.current = true;
            console.log('[VRLocomotion] VR session started — spawning at', SPAWN_POS.toArray());
            console.log('[VRLocomotion] Controllers available:', controllers.length);
            controllers.forEach((c, i) => {
                console.log(`[VRLocomotion]   Controller[${i}]: handedness=${c?.inputSource?.handedness ?? 'UNKNOWN'}, hasGamepad=${!!c?.inputSource?.gamepad}`);
            });
        } else if (!isPresenting) {
            hasSpawned.current = false;
        }
    }, [isPresenting, player, controllers]);

    // Movement parameters
    const moveSpeed = 1.8; // meters per second (slightly faster for larger room)
    const turnSpeed = Math.PI * 0.8; // radians per second for smooth turning
    const deadzone = 0.15; // slightly lower deadzone for better responsiveness

    useFrame((_, delta) => {
        if (!isPresenting || !player) return;

        // ── Controller lookup: prefer handedness, fall back to index ──
        let leftController = controllers.find(c => c?.inputSource?.handedness === 'left');
        let rightController = controllers.find(c => c?.inputSource?.handedness === 'right');

        // Fallback: if handedness lookup failed, try by array index
        if (!leftController && controllers.length > 0) {
            leftController = controllers[0];
        }
        if (!rightController && controllers.length > 1) {
            rightController = controllers[1];
        }
        // If only one controller, use it for locomotion (left stick behavior)
        if (!leftController && !rightController && controllers.length === 1) {
            leftController = controllers[0];
        }

        // ── Throttled debug logging ──
        const now = performance.now();
        if (now - lastDebugLog.current > DEBUG_LOG_INTERVAL) {
            lastDebugLog.current = now;
            const lAxes = leftController?.inputSource?.gamepad?.axes;
            const rAxes = rightController?.inputSource?.gamepad?.axes;
            console.log(
                `[VRLocomotion] ctrl=${controllers.length}`,
                `L:${leftController ? (leftController.inputSource?.handedness ?? 'idx') : 'NONE'}`,
                `axes=[${lAxes ? Array.from(lAxes).map(a => a.toFixed(2)).join(',') : '-'}]`,
                `R:${rightController ? (rightController.inputSource?.handedness ?? 'idx') : 'NONE'}`,
                `axes=[${rAxes ? Array.from(rAxes).map(a => a.toFixed(2)).join(',') : '-'}]`,
                `pos=${player.position.x.toFixed(1)},${player.position.y.toFixed(1)},${player.position.z.toFixed(1)}`
            );
        }

        // EXTREMELY forgiving joystick check for Quest 3 (which can send wonky indices)
        // We look at all 4 possible axes and pick the ones with the largest magnitude.
        const getAxesXY = (axes: readonly number[]) => {
            if (!axes || axes.length === 0) return { x: 0, y: 0 };

            let bestX = 0;
            let bestY = 0;

            // X is usually index 0 or 2
            if (axes.length > 0 && Math.abs(axes[0]) > Math.abs(bestX)) bestX = axes[0];
            if (axes.length > 2 && Math.abs(axes[2]) > Math.abs(bestX)) bestX = axes[2];

            // Y is usually index 1 or 3
            if (axes.length > 1 && Math.abs(axes[1]) > Math.abs(bestY)) bestY = axes[1];
            if (axes.length > 3 && Math.abs(axes[3]) > Math.abs(bestY)) bestY = axes[3];

            return { x: bestX, y: bestY };
        };

        // ── Locomotion (Left Thumbstick - smooth translation) ──
        const leftGamepad = leftController?.inputSource?.gamepad;
        if (leftGamepad) {
            const { x, y } = getAxesXY(leftGamepad.axes);

            if (Math.abs(x) > deadzone || Math.abs(y) > deadzone) {
                const cameraWorldDir = new THREE.Vector3();
                camera.getWorldDirection(cameraWorldDir);
                cameraWorldDir.y = 0;
                if (cameraWorldDir.lengthSq() > 0.0001) cameraWorldDir.normalize();

                const rightDir = new THREE.Vector3().crossVectors(cameraWorldDir, new THREE.Vector3(0, 1, 0)).normalize();

                const moveIntent = new THREE.Vector3();
                moveIntent.addScaledVector(rightDir, x);
                moveIntent.addScaledVector(cameraWorldDir, -y);

                const magnitude = Math.min(1, Math.sqrt(x * x + y * y));
                if (moveIntent.lengthSq() > 0) moveIntent.normalize();

                moveIntent.multiplyScalar(magnitude * moveSpeed * delta);

                const proposedPos = player.position.clone().add(moveIntent);

                // ── Collision detection: test against all registered colliders ──
                const correctedPos = CollisionRegistry.testPlayerMovement(
                    player.position,
                    proposedPos
                );
                player.position.copy(correctedPos);
            }
        }

        // ── Turning (Right Thumbstick - SMOOTH turning) ──
        const rightGamepad = rightController?.inputSource?.gamepad;
        if (rightGamepad) {
            const { x } = getAxesXY(rightGamepad.axes);

            if (Math.abs(x) > deadzone) {
                const turnAmount = (Math.abs(x) - deadzone) / (1 - deadzone);
                const turnSign = Math.sign(x);

                const cameraWorldPosBefore = new THREE.Vector3();
                camera.getWorldPosition(cameraWorldPosBefore);

                player.rotation.y -= turnSign * turnAmount * turnSpeed * delta;

                player.updateMatrixWorld(true);
                const cameraWorldPosAfter = new THREE.Vector3();
                camera.getWorldPosition(cameraWorldPosAfter);

                const offset = new THREE.Vector3().subVectors(cameraWorldPosBefore, cameraWorldPosAfter);
                offset.y = 0;
                player.position.add(offset);

                // ── Check collision after turning (turning can push player into walls) ──
                const postTurnCorrected = CollisionRegistry.testPlayerMovement(
                    cameraWorldPosBefore.setY(player.position.y), // approximate "previous safe"
                    player.position
                );
                player.position.copy(postTurnCorrected);
            }
        }

        // ── SAFETY BOUNDARIES ──
        // Floor clamp: player feet never below ground
        if (player.position.y < FLOOR_Y) {
            player.position.y = FLOOR_Y;
        }
        // Ceiling clamp: player position (feet) shouldn't exceed room height minus player height
        if (player.position.y > ROOM_H - 1.6) {
            player.position.y = ROOM_H - 1.6;
        }
    });

    return null;
};

/**
 * resetVRPosition — Can be called from VR UI panels to teleport back to spawn.
 */
export function resetVRPosition(player: THREE.Group) {
    player.position.copy(SPAWN_POS);
    player.rotation.set(0, Math.PI, 0); // Face into lab
}
