/**
 * CollisionSystem — Lightweight AABB collision registry + player capsule
 *
 * Architecture:
 *   - Singleton CollisionRegistry stores named Box3 colliders
 *   - Environment objects register/unregister on mount/unmount
 *   - VRLocomotion calls testPlayerMovement() each frame
 *   - Uses sliding response (not hard stop) for smooth wall sliding
 *
 * Player capsule approximation:
 *   height: 1.6m, radius: 0.3m
 *   Modeled as a shrunk AABB for simplicity (faster than true capsule vs AABB)
 */

import * as THREE from 'three';

// ─── Player capsule constants ───
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.6;

// ─── Collision Registry (singleton) ───

class CollisionRegistryClass {
    private colliders: Map<string, THREE.Box3> = new Map();

    register(name: string, box: THREE.Box3): void {
        this.colliders.set(name, box.clone());
    }

    unregister(name: string): void {
        this.colliders.delete(name);
    }

    getAll(): Map<string, THREE.Box3> {
        return this.colliders;
    }

    /**
     * Test player movement from currentPos to proposedPos.
     * Returns the corrected position that doesn't penetrate any collider.
     *
     * Uses per-axis sliding: test X and Z independently so the player
     * slides along walls instead of stopping dead.
     *
     * @param currentPos  Current player world position (feet)
     * @param proposedPos Desired new position after locomotion input
     * @returns Corrected position that avoids all colliders
     */
    testPlayerMovement(
        currentPos: THREE.Vector3,
        proposedPos: THREE.Vector3
    ): THREE.Vector3 {
        if (this.colliders.size === 0) return proposedPos.clone();

        const result = proposedPos.clone();

        // Build player AABB at proposed position
        const playerBox = new THREE.Box3();

        // Helper: build player box at given position (feet position)
        const buildPlayerBox = (pos: THREE.Vector3): THREE.Box3 => {
            playerBox.min.set(
                pos.x - PLAYER_RADIUS,
                pos.y,
                pos.z - PLAYER_RADIUS,
            );
            playerBox.max.set(
                pos.x + PLAYER_RADIUS,
                pos.y + PLAYER_HEIGHT,
                pos.z + PLAYER_RADIUS,
            );
            return playerBox;
        };

        // Phase 1: Try full movement
        buildPlayerBox(result);
        let collided = false;

        for (const [, box] of this.colliders) {
            if (playerBox.intersectsBox(box)) {
                collided = true;
                break;
            }
        }

        if (!collided) return result;

        // Phase 2: Axis-separated sliding
        let finalX = proposedPos.x;
        let finalZ = proposedPos.z;

        // Try moving only on X axis (keep current Z)
        const xOnly = new THREE.Vector3(proposedPos.x, currentPos.y, currentPos.z);
        buildPlayerBox(xOnly);
        let xBlocked = false;

        for (const [, box] of this.colliders) {
            if (playerBox.intersectsBox(box)) {
                xBlocked = true;
                break;
            }
        }
        if (xBlocked) finalX = currentPos.x;

        // Try moving only on Z axis (keep current X)
        const zOnly = new THREE.Vector3(currentPos.x, currentPos.y, proposedPos.z);
        buildPlayerBox(zOnly);
        let zBlocked = false;

        for (const [, box] of this.colliders) {
            if (playerBox.intersectsBox(box)) {
                zBlocked = true;
                break;
            }
        }
        if (zBlocked) finalZ = currentPos.z;

        // Apply sliding result
        result.x = finalX;
        result.y = proposedPos.y; // Y handled by floor/ceiling clamp elsewhere
        result.z = finalZ;

        return result;
    }
}

export const CollisionRegistry = new CollisionRegistryClass();

// ─── React hook: register a collider on mount, unregister on unmount ───

import { useEffect } from 'react';

/**
 * useRegisterCollider — Register an AABB collider with the collision system.
 *
 * @param name   Unique name for this collider (e.g. 'experiment-table')
 * @param box    THREE.Box3 bounding box in world space
 * @param deps   Optional dependency array to re-register when transforms change
 */
export function useRegisterCollider(
    name: string,
    box: THREE.Box3 | null,
    deps: any[] = []
): void {
    useEffect(() => {
        if (!box) return;
        CollisionRegistry.register(name, box);
        return () => {
            CollisionRegistry.unregister(name);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, box, ...deps]);
}

/**
 * Helper: build a Box3 from position and dimensions.
 * Position is the CENTER of the box.
 */
export function boxFromCenter(
    cx: number, cy: number, cz: number,
    width: number, height: number, depth: number
): THREE.Box3 {
    return new THREE.Box3(
        new THREE.Vector3(cx - width / 2, cy - height / 2, cz - depth / 2),
        new THREE.Vector3(cx + width / 2, cy + height / 2, cz + depth / 2),
    );
}
