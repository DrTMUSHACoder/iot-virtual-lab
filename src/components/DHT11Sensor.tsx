
import React, { useMemo, useState } from 'react';
import { useGLTF, Text } from '@react-three/drei';
import { Pin } from './Pin';
import { useLabStore } from '../store/useLabStore';
import { useFrame } from '@react-three/fiber';

/*
 * DHT11 Temperature/Humidity Sensor — Calibrated.
 *
 * Real dimensions : 15.5mm × 12mm × 5.5mm
 * VR target       : 0.017m × 0.013m × 0.006m
 * Pin spacing     : 2.54mm → 0.00284m VR
 * Pins: VCC, DATA, GND (3 pins in a row)
 */

interface DHT11SensorProps {
    id: string;
}

const PS = 0.00406;
const PIN_Y = 0.012;

export const DHT11Sensor: React.FC<DHT11SensorProps> = ({ id }) => {
    const { scene } = useGLTF('/models/temperature_and_humidity_sensor_dht11.glb');
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const isSimulating = useLabStore(state => state.isSimulating);
    const pinVoltages = useLabStore(state => state.pinVoltages);

    const [temp, setTemp] = useState(24.5);
    const [humidity, setHumidity] = useState(55);

    const vccKey = `${id}::VCC`;
    const gndKey = `${id}::GND`;
    const isPowered = isSimulating &&
        pinVoltages[vccKey] !== undefined &&
        pinVoltages[vccKey] > 0 &&
        pinVoltages[gndKey] === 0;

    useFrame(() => {
        if (!isPowered) return;
        if (Math.random() < 0.02) {
            setTemp(t => Math.round((t + (Math.random() - 0.5) * 0.4) * 10) / 10);
            setHumidity(h => Math.round(Math.max(30, Math.min(80, h + (Math.random() - 0.5) * 2))));
        }
    });

    return (
        <group>
            {/* VisualMesh — scaled to ~17mm × 13mm footprint */}
            <primitive
                object={clonedScene}
                scale={0.02}
                position={[0, 0.008, 0]}
                receiveShadow
            />

            {/* Power LED indicator */}
            <mesh position={[0.005, 0.012, 0.004]}>
                <sphereGeometry args={[0.001, 8, 8]} />
                <meshStandardMaterial
                    color={isPowered ? '#00e676' : '#333'}
                    emissive={isPowered ? '#00e676' : '#000'}
                    emissiveIntensity={isPowered ? 3 : 0}
                />
            </mesh>

            {isPowered && (
                <pointLight position={[0, 0.015, 0]} intensity={0.4} color="#00e676" distance={0.08} decay={2} />
            )}

            {/* Sensor reading label when active (Native VR Panel) */}
            {isPowered && (
                <group position={[0, 0.03, 0]}>
                    <mesh position={[0, 0, -0.001]}>
                        <planeGeometry args={[0.025, 0.015]} />
                        <meshBasicMaterial color="#00140a" opacity={0.9} transparent />
                    </mesh>
                    <Text
                        position={[0, 0, 0]}
                        fontSize={0.004}
                        lineHeight={1.5}
                        color="#00e676"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {`🌡 ${temp.toFixed(1)}°C\n💧 ${humidity}%`}
                    </Text>
                </group>
            )}

            {/* Pins — 2.54mm spacing, matching DHT11 real pinout */}
            <Pin name="VCC" position={[PS, PIN_Y, 0]} componentId={id} />
            <Pin name="DATA" position={[0, PIN_Y, 0]} componentId={id} />
            <Pin name="GND" position={[-PS, PIN_Y, 0]} componentId={id} />
        </group>
    );
};
