/**
 * DesktopMirror — Secondary camera that mirrors the VR headset view on the laptop.
 *
 * Architecture:
 *   - When VR is active (isPresenting), copies the XR camera transform each frame
 *   - Uses a slight offset behind the headset so laptop viewers see the player
 *     from a clearer third-person-like perspective
 *   - Does NOT trigger a second render pass — it simply replaces the default
 *     camera that R3F uses for the flat-screen render
 *   - Same scene graph, no duplication
 *
 * When VR is not active, this component does nothing (OrbitControls handle
 * the desktop camera).
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

// How far behind + above the headset the mirror camera sits
const FOLLOW_OFFSET = new THREE.Vector3(0, 0.5, 1.5); // +Y = above, +Z = behind
const LERP_SPEED = 0.08; // smooth follow interpolation

export const DesktopMirror: React.FC = () => {
    const { isPresenting } = useXR();
    const { camera, gl } = useThree();
    const mirrorPos = useRef(new THREE.Vector3(0, 1.6, 5));
    const mirrorTarget = useRef(new THREE.Vector3(0, 1.2, 0));

    useFrame(() => {
        if (!isPresenting) return;

        // Get XR camera world transform
        const xrCam = gl.xr.getCamera();
        if (!xrCam) return;

        const headPos = new THREE.Vector3();
        const headQuat = new THREE.Quaternion();
        xrCam.getWorldPosition(headPos);
        xrCam.getWorldQuaternion(headQuat);

        // Compute offset in head-local space, transform to world
        const worldOffset = FOLLOW_OFFSET.clone().applyQuaternion(headQuat);
        const desiredPos = headPos.clone().add(worldOffset);

        // Ensure mirror camera doesn't go below floor
        desiredPos.y = Math.max(1.0, desiredPos.y);

        // Smooth follow
        mirrorPos.current.lerp(desiredPos, LERP_SPEED);
        mirrorTarget.current.lerp(headPos, LERP_SPEED);

        // Apply to the default camera (which renders to the flat screen)
        camera.position.copy(mirrorPos.current);
        camera.lookAt(mirrorTarget.current);
        camera.updateMatrixWorld();
    });

    return null;
};
