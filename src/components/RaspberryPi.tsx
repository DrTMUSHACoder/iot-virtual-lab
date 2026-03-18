import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Pin } from './Pin';

/*
 * Raspberry Pi 4 — Precision Official 40-Pin GPIO Alignment.
 * 
 * Mechanical REFERENCE:
 *   PCB Size: 85mm x 56mm
 *   GPIO Header (2x20):
 *     - Pitch: 2.54mm (0.1")
 *     - Pin 1 Location: ~3.5mm from 'top' edge (long), ~3.5mm from 'left' edge (short)
 *     - This assumes a specific coordinate system relative to the PCB.
 * 
 * Coordinate System in this component:
 *   - Origin: Center of the PCB
 *   - X Axis: Short side (56mm)
 *   - Z Axis: Long side (85mm)
 */

// Removed unused RaspberryPiProps
// Official 40-pin GPIO pinout
const GPIO_PINS: [number, string, number][] = [
    [1, '3.3V', 0], [2, '5V', 1],
    [3, 'GPIO 2', 0], [4, '5V', 1],
    [5, 'GPIO 3', 0], [6, 'GND', 1],
    [7, 'GPIO 4', 0], [8, 'GPIO 14', 1],
    [9, 'GND', 0], [10, 'GPIO 15', 1],
    [11, 'GPIO 17', 0], [12, 'GPIO 18', 1],
    [13, 'GPIO 27', 0], [14, 'GND', 1],
    [15, 'GPIO 22', 0], [16, 'GPIO 23', 1],
    [17, '3.3V', 0], [18, 'GPIO 24', 1],
    [19, 'GPIO 10', 0], [20, 'GND', 1],
    [21, 'GPIO 9', 0], [22, 'GPIO 25', 1],
    [23, 'GPIO 11', 0], [24, 'GPIO 8', 1],
    [25, 'GND', 0], [26, 'GPIO 7', 1],
    [27, 'GPIO 0', 0], [28, 'GPIO 1', 1],
    [29, 'GPIO 5', 0], [30, 'GND', 1],
    [31, 'GPIO 6', 0], [32, 'GPIO 12', 1],
    [33, 'GPIO 13', 0], [34, 'GND', 1],
    [35, 'GPIO 19', 0], [36, 'GPIO 16', 1],
    [37, 'GPIO 26', 0], [38, 'GPIO 20', 1],
    [39, 'GND', 0], [40, 'GPIO 21', 1],
];

const MODEL_SCALE = 0.035; // VR-optimized: Scaled up for better clarity
const MODEL_OFFSET_Y = 0.015;

export const RaspberryPi = ({ id }: { id: string }) => {
    const { scene } = useGLTF('/models/raspberry_pi.glb');

    const cloned = useMemo(() => {
        const c = scene.clone(true);

        // Improve material visibility
        c.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const mat = child.material.clone();
                mat.metalness = 0.3;
                mat.roughness = 0.6;
                child.material = mat;
            }
        });

        return c;
    }, [scene]);

    // --------- AUTO FIND GPIO HEADER MESH ----------
    const headerMesh = useMemo(() => {
        let pinMesh: THREE.Object3D | null = null;

        // The true 40-pin array in this specific GLB natively uses 'gold_effect'
        cloned.traverse((child: any) => {
            if (child.isMesh && child.material && child.material.name === 'gold_effect') {
                pinMesh = child;
            }
        });

        // Fix dark appearance: override metalness/roughness on all meshes except the pins
        cloned.traverse((child: any) => {
            if (child.isMesh && child.material && child.material.name !== 'gold_effect') {
                const mat = child.material.clone();
                mat.metalness = 0.2;
                mat.roughness = 0.7;
                child.material = mat;
            }
        });

        return pinMesh;
    }, [cloned]);

    const headerData = useMemo(() => {
        if (!headerMesh) return null;

        const box = new THREE.Box3().setFromObject(headerMesh);
        const min = box.min.clone();
        const max = box.max.clone();
        const size = max.clone().sub(min);

        // Standard RPi header pitch is exactly 2.54mm (0.00254 meters)
        // Compute the dead-center of Pin 1 by subtracting the span from the bounding box
        const fixedPitch = 0.00254;
        const startX = min.x + (size.x - fixedPitch) / 2;
        const startZ = min.z + (size.z - 19 * fixedPitch) / 2;

        return {
            startX,
            startZ,
            stepZ: fixedPitch,
            stepX: fixedPitch,
            pinTopY: max.y
        };
    }, [headerMesh]);

    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const temp = useMemo(() => new THREE.Object3D(), []);

    // Important for VR: If we don't have headerData ready instantly, the instancedMesh mounts
    // with uninitialized (NaN) matrices. When WebXR frustum culling hits a NaN matrix, the entire
    // GL projection fails and the screen goes pure black.
    // Solution: force an initial update the moment the ref is available, and use useEffect.
    React.useEffect(() => {
        if (!instancedRef.current) return;

        if (!headerData) {
            // Fill with safe zero-scale matrices to prevent NaN crash
            temp.scale.set(0, 0, 0);
            temp.updateMatrix();
            for (let i = 0; i < 40; i++) {
                instancedRef.current.setMatrixAt(i, temp.matrix);
            }
            instancedRef.current.instanceMatrix.needsUpdate = true;
            return;
        }

        const { startX, startZ, stepZ, stepX, pinTopY } = headerData;

        // Restore scale in case it was zeroed
        temp.scale.set(1, 1, 1);

        for (let i = 0; i < 40; ++i) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = startX + col * stepX;
            const z = startZ + row * stepZ;

            // To properly cover the existing pins, we center our square posts slightly lower than the tip
            const y = pinTopY - 0.005;

            temp.position.set(x, y, z);
            temp.rotation.set(0, 0, 0);
            temp.updateMatrix();
            instancedRef.current.setMatrixAt(i, temp.matrix);
        }
        instancedRef.current.instanceMatrix.needsUpdate = true;
    }, [headerData, temp]);

    return (
        <group scale={MODEL_SCALE} position={[0, MODEL_OFFSET_Y, 0]}>
            <primitive object={cloned} />

            {headerData && (
                <group name="GPIO_Header">
                    <instancedMesh
                        ref={instancedRef}
                        args={[undefined, undefined, 40]}
                        castShadow={false}
                        receiveShadow={false}
                    >
                        <boxGeometry args={[0.0016, 0.010, 0.0016]} />
                        <meshStandardMaterial color={0xffcc00} metalness={0.8} roughness={0.2} />
                    </instancedMesh>
                    {/* Pins for interaction — compute same positions (model-local coords) */}
                    {GPIO_PINS.map(([num, name], i) => {
                        const row = Math.floor(i / 2);
                        const col = i % 2;
                        const { startX, startZ, stepZ, stepX, pinTopY } = headerData;

                        const x = startX + col * stepX;
                        const z = startZ + row * stepZ;
                        const y = pinTopY + 0.00025; // tiny clearance over tip for snapping

                        return <Pin key={`${id}-pin-${num}`} componentId={id} name={name as string} position={[x, y, z]} />;
                    })}
                </group>
            )}
        </group>
    );
};
