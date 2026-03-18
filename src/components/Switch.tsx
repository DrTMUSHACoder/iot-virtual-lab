
import React, { useState } from 'react';
import { Box } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { Pin } from './Pin';

/*
 * Tactile Switch (6×6mm) — Calibrated.
 *
 * Real dimensions : 6mm × 6mm × 5mm (including button)
 * VR target       : 0.0067m × 0.0067m × 0.0056m
 * Pin spacing     : 2.54mm → 0.00284m
 * 2 functional pins: Common, Output
 */

interface SwitchProps {
    id: string;
    position?: [number, number, number];
}

const PS = 0.004; // Increased spacing for scaled switch
const PIN_Y = 0.010;

export const Switch: React.FC<SwitchProps> = ({ id }) => {
    const [isOn, setIsOn] = useState(false);

    return (
        <group>
            <Interactive onSelect={() => { setIsOn(!isOn); }}>
                <group onClick={(e) => {
                    e.stopPropagation();
                    setIsOn(!isOn);
                }}>
                    {/* Housing — 6.7mm × 3.5mm × 6.7mm */}
                    <Box args={[0.010, 0.005, 0.010]} position={[0, 0.0025, 0]}>
                        <meshStandardMaterial color="#34495e" />
                    </Box>

                    {/* Button cap — 3.5mm × 2mm, moves when pressed */}
                    <Box args={[0.005, 0.003, 0.005]} position={[0, 0.007, 0]}>
                        <meshStandardMaterial color={isOn ? '#e74c3c' : '#95a5a6'} />
                    </Box>
                </group>
            </Interactive>

            {/* Pin anchors — opposite edges */}
            <Pin name="Common" position={[0, PIN_Y, PS]} componentId={id} />
            <Pin name="Output" position={[0, PIN_Y, -PS]} componentId={id} />
        </group>
    );
};
