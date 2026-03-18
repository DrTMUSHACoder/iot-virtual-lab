
import React from 'react';
import { Sphere } from '@react-three/drei';

interface DuckProps {
    id: string;
    position?: [number, number, number];
}

export const Duck: React.FC<DuckProps> = ({ id: _id }) => {
    return (
        <group position={[0, 0.05, 0]}>
            <Sphere args={[0.05, 32, 32]}>
                <meshStandardMaterial color="yellow" />
            </Sphere>
            <Sphere args={[0.03, 32, 32]} position={[0.04, 0.03, 0]}>
                <meshStandardMaterial color="yellow" />
            </Sphere>
        </group>
    );
};
