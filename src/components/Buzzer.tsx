
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';
import { AudioService } from '../services/AudioService';

/*
 * Buzzer (piezo) — Calibrated.
 *
 * Real dimensions : 12mm diameter × 9.5mm height
 * VR target       : 0.013m × 0.011m
 * Pin spacing     : 2.54mm → 0.00284m
 */

interface BuzzerProps {
    id: string;
}

const PS = 0.00284;
const PIN_Y = 0.008;

export const Buzzer: React.FC<BuzzerProps> = ({ id }) => {
    const { scene } = useGLTF('/models/buzzer.glb');
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const isActive = useLabStore(state =>
        state.components.find(c => c.id === id)?.value === 'ON'
    );

    React.useEffect(() => {
        if (isActive) {
            AudioService.startBuzzer(id);
        } else {
            AudioService.stopBuzzer(id);
        }
        return () => AudioService.stopBuzzer(id);
    }, [id, isActive]);

    return (
        <group>
            <primitive
                object={clonedScene}
                scale={0.009}
                position={[0, 0.008, 0]}
                receiveShadow
            />

            {isActive && (
                <pointLight position={[0, 0.012, 0]} intensity={0.6} color="#00d2ff" distance={0.1} decay={2} />
            )}

            {/* Pins — 2.54mm apart */}
            <Pin name="(+)" position={[PS * 0.5, PIN_Y, 0]} componentId={id} />
            <Pin name="(-)" position={[-PS * 0.5, PIN_Y, 0]} componentId={id} />
        </group>
    );
};
