
import React from 'react';
import { Box } from '@react-three/drei';
import { Pin } from './Pin';

interface MicrocontrollerProps {
    id: string;
    position?: [number, number, number];
}

export const Microcontroller: React.FC<MicrocontrollerProps> = ({ id }) => {
    return (
        <group position={[0, 0.02, 0]}>
            {/* PCB */}
            <Box args={[0.3, 0.02, 0.2]} receiveShadow>
                <meshStandardMaterial color="#2c3e50" />
            </Box>
            {/* Main Chip */}
            <Box args={[0.1, 0.02, 0.1]} position={[0, 0.02, 0]}>
                <meshStandardMaterial color="#34495e" metalness={0.8} />
            </Box>

            <Pin name="GND" position={[0.12, 0.01, -0.08]} componentId={id} />
            <Pin name="TX" position={[-0.12, 0.01, -0.08]} componentId={id} />
            <Pin name="RX" position={[-0.12, 0.01, 0.08]} componentId={id} />
        </group>
    );
};
