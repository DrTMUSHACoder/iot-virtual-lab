import React, { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useLabStore } from '../store/useLabStore';

/**
 * InteractionController
 * 
 * Central manager for 3D interaction modes: MOVE, WIRE, INSPECT.
 * Prevents scattering interaction logic across individual components.
 * 
 * Responsibilities:
 * - Enforce mode isolation (e.g. if WIRE, components cannot be dragged)
 * - Manage VR pointer visual states based on mode
 * - Handle global XR spawn transform stability
 */
export const InteractionController: React.FC = () => {
    const interactionMode = useLabStore(state => state.interactionMode);
    const { controllers, isPresenting } = useXR();
    const { gl } = useThree();

    // 1. Enforce mode isolation visually (cursor styles for desktop)
    useEffect(() => {
        if (!gl.domElement) return;

        if (interactionMode === 'WIRE') {
            gl.domElement.style.cursor = 'crosshair';
        } else if (interactionMode === 'INSPECT') {
            gl.domElement.style.cursor = 'help';
        } else {
            gl.domElement.style.cursor = 'default';
        }
    }, [interactionMode, gl.domElement]);

    // 2. VR Controller visual feedback based on mode
    useEffect(() => {
        if (!isPresenting) return;

        controllers.forEach(controller => {
            if (!controller?.inputSource?.gamepad) return;
            // TODO: In Future Phases, we can colorize or change the ray visual 
            // of the VR controller here depending on interactionMode.
            // e.g. Blue ray for WIRE, White ray for MOVE.
        });
    }, [interactionMode, controllers, isPresenting]);

    // 2b. VR Menu button — cancel pending wire / toggle wire mode off
    const menuWasPressed = React.useRef<boolean[]>([false, false]);
    useFrame(() => {
        if (!isPresenting) return;
        const store = useLabStore.getState();
        controllers.forEach((ctrl, i) => {
            const gp = ctrl?.inputSource?.gamepad;
            if (!gp) return;
            // buttons[4] = menu / Y button (common on Quest)
            const pressed = gp.buttons[4]?.pressed || gp.buttons[3]?.pressed || false;
            if (pressed && !menuWasPressed.current[i]) {
                menuWasPressed.current[i] = true;
                if (store.pendingWireStart) {
                    store.setPendingWire(null);
                    store.setInteractionMode('MOVE');
                } else if (store.interactionMode === 'WIRE') {
                    store.setInteractionMode('MOVE');
                }
            } else if (!pressed) {
                menuWasPressed.current[i] = false;
            }
        });
    });

    // 3. Global shortcuts for mode switching (Desktop)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in an input (like code panel)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const store = useLabStore.getState();
            if (e.key.toLowerCase() === 'm') {
                store.setInteractionMode('MOVE');
            } else if (e.key.toLowerCase() === 'w') {
                store.setInteractionMode('WIRE');
            } else if (e.key.toLowerCase() === 'i') {
                store.setInteractionMode('INSPECT');
            } else if (e.key === 'Escape' && store.interactionMode === 'WIRE') {
                // Cancel wiring
                store.setPendingWire(null);
                store.setInteractionMode('MOVE');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return null; // Pure logical component, no visual representation
};
