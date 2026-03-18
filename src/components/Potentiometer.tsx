
import React, { useState } from 'react';
import { Cylinder, Box } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { Pin } from './Pin';

/*
 * Potentiometer (trimmer) — Calibrated.
 *
 * Real dimensions : 6.8mm diameter × 5mm tall
 * VR target       : 0.0076m × 0.0056m
 * Pin spacing     : 2.54mm → 0.00284m
 * 3 pins: A, Wiper, B
 */

interface PotentiometerProps {
    id: string;
    position?: [number, number, number];
}

const PS = 0.004; // Increased spacing for scaled switch
const PIN_Y = 0.010;

export const Potentiometer: React.FC<PotentiometerProps> = ({ id }) => {
    const [knobRotation, setKnobRotation] = useState(0);

    return (
        <group>
            <Interactive onSelect={() => { setKnobRotation(v => v + Math.PI / 8); }}>
                <group onClick={(e) => {
                    e.stopPropagation();
                    setKnobRotation(v => v + Math.PI / 8);
                }}>
                    {/* Base — 7.6mm × 5.6mm */}
                    <Box args={[0.011, 0.008, 0.011]} position={[0, 0.004, 0]}>
                        <meshStandardMaterial color="#2c3e50" />
                    </Box>

                    {/* Knob — 5mm diameter */}
                    <group position={[0, 0.005, 0]} rotation={[0, knobRotation, 0]}>
                        <Cylinder args={[0.0035, 0.004, 0.004, 16]}>
                            <meshStandardMaterial color="#7f8c8d" />
                        </Cylinder>
                        {/* Indicator notch */}
                        <Box args={[0.001, 0.001, 0.003]} position={[0, 0.002, -0.003]}>
                            <meshStandardMaterial color="#ecf0f1" />
                        </Box>
                    </group>
                </group>
            </Interactive>

            {/* Physical pin shaft */}
            <Cylinder args={[0.0004, 0.0004, 0.004, 6]} position={[PS, 0, PS]}>
                <meshStandardMaterial color="#aaa" metalness={0.9} />
            </Cylinder>

            {/* Pin anchors — 2.54mm spacing */}
            <Pin name="A" position={[PS, PIN_Y, PS]} componentId={id} />
            <Pin name="Wiper" position={[0, PIN_Y, PS]} componentId={id} />
            <Pin name="B" position={[-PS, PIN_Y, PS]} componentId={id} />
        </group>
    );
};
