import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';

/*
 * VR3DPanel — Reusable native 3D floating panel for VR UI.
 *
 * Replaces <Html transform> with real meshes + Text.
 * Glassmorphism look: translucent dark panel with glowing border.
 */

interface VR3DPanelProps {
    title?: string;
    width?: number;
    height?: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
    children?: React.ReactNode;
    borderColor?: string;
    opacity?: number;
}

export const VR3DPanel: React.FC<VR3DPanelProps> = ({
    title,
    width = 0.8,
    height = 0.6,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    children,
    borderColor = '#00d2ff',
    opacity = 0.85,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    // Threshold-based billboard: only update orientation when camera moves significantly
    // This prevents per-frame jitter while keeping panels readable
    const lastBillboardAngle = useRef(0);

    useFrame(({ camera }) => {
        if (!groupRef.current) return;

        // Y-axis billboard: compute target angle
        const panelPos = groupRef.current.getWorldPosition(new THREE.Vector3());
        const camPos = camera.getWorldPosition(new THREE.Vector3());
        const targetAngle = Math.atan2(camPos.x - panelPos.x, camPos.z - panelPos.z);

        // Only update if camera moved beyond ~5° threshold
        const angleDiff = Math.abs(targetAngle - lastBillboardAngle.current);
        if (angleDiff > 0.08) { // ~5 degrees
            // Smooth lerp toward target (not instant snap)
            const currentY = groupRef.current.rotation.y;
            groupRef.current.rotation.y = currentY + (targetAngle - currentY) * 0.06;
            lastBillboardAngle.current = groupRef.current.rotation.y;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Background panel */}
            <RoundedBox
                args={[width, height, 0.008]}
                radius={0.012}
                smoothness={4}
            >
                <meshStandardMaterial
                    color="#0a1628"
                    transparent
                    opacity={opacity}
                    roughness={0.2}
                    metalness={0.3}
                    side={THREE.DoubleSide}
                />
            </RoundedBox>

            {/* Border glow — cyan / neon blue outline */}
            <RoundedBox
                args={[width + 0.008, height + 0.008, 0.004]}
                radius={0.016}
                smoothness={4}
                position={[0, 0, -0.003]}
            >
                <meshStandardMaterial
                    color={borderColor}
                    emissive={borderColor}
                    emissiveIntensity={1.0}
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </RoundedBox>

            {/* Title text */}
            {title && (
                <Text
                    position={[0, height / 2 - 0.04, 0.015]}
                    fontSize={0.032}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={width - 0.06}
                    fontWeight="bold"
                    letterSpacing={0.02}
                >
                    {title}
                </Text>
            )}

            {/* Title underline */}
            {title && (
                <mesh position={[0, height / 2 - 0.065, 0.01]}>
                    <planeGeometry args={[width - 0.06, 0.002]} />
                    <meshStandardMaterial
                        color={borderColor}
                        emissive={borderColor}
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.5}
                    />
                </mesh>
            )}

            {/* Children container — offset below title */}
            <group position={[0, title ? -0.03 : 0, 0.012]}>
                {children}
            </group>
        </group>
    );
};

/*
 * VR3DButton — A clickable 3D button for VR panels.
 */
interface VR3DButtonProps {
    label: string;
    icon?: string;
    position?: [number, number, number];
    width?: number;
    height?: number;
    onClick: () => void;
    color?: string;
    active?: boolean;
    textColor?: string;
}

export const VR3DButton: React.FC<VR3DButtonProps> = ({
    label,
    icon,
    position = [0, 0, 0],
    width = 0.18,
    height = 0.05,
    onClick,
    color = '#1e293b',
    active = false,
    textColor,
}) => {
    const [hovered, setHovered] = React.useState(false);
    const buttonRef = useRef<THREE.Group>(null);

    const bgColor = active ? '#00d2ff' : (hovered ? '#1e3a8a' : color);
    const resolvedTextColor = textColor || (active ? '#000' : '#fff');
    const emissive = active ? '#00d2ff' : (hovered ? '#00d2ff' : '#000');
    const emissiveI = active ? 0.6 : (hovered ? 0.4 : 0);

    // Smooth hover scale animation
    useFrame((_, delta) => {
        if (!buttonRef.current) return;
        const targetScale = hovered ? 1.05 : 1.0;
        buttonRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 10 * delta);
    });

    return (
        <group position={position} ref={buttonRef}>
            <Interactive
                onSelect={() => onClick()}
                onHover={() => setHovered(true)}
                onBlur={() => setHovered(false)}
            >
                <group>
                    <mesh
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        onPointerOver={() => setHovered(true)}
                        onPointerOut={() => setHovered(false)}
                        position={[0, 0, 0.002]}
                    >
                        <RoundedBox args={[width, height, 0.006]} radius={0.008} smoothness={4} position={[0, 0, 0]}>
                            <meshStandardMaterial
                                color={bgColor}
                                emissive={emissive}
                                emissiveIntensity={emissiveI}
                                roughness={0.4}
                                metalness={0.3}
                            />
                        </RoundedBox>
                    </mesh>
                    <Text
                        position={[0, 0, 0.015]}
                        fontSize={0.018}
                        color={resolvedTextColor}
                        anchorX="center"
                        anchorY="middle"
                        maxWidth={width - 0.02}
                        raycast={() => null}
                        fontWeight="500"
                    >
                        {icon ? `${icon} ${label}` : label}
                    </Text>
                </group>
            </Interactive>
        </group>
    );
};

/*
 * VR3DTextLine — A simple text line for list-based VR panels.
 */
interface VR3DTextLineProps {
    text: string;
    position?: [number, number, number];
    fontSize?: number;
    color?: string;
    maxWidth?: number;
    anchorX?: 'left' | 'center' | 'right';
    anchorY?: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
}

export const VR3DTextLine: React.FC<VR3DTextLineProps> = ({
    text,
    position = [0, 0, 0],
    fontSize = 0.018,
    color = '#e0e0e0',
    maxWidth = 0.8,
    anchorX = 'left',
    anchorY = 'middle',
}) => (
    <Text
        position={position}
        fontSize={fontSize}
        color={color}
        anchorX={anchorX}
        anchorY={anchorY}
        maxWidth={maxWidth}
        lineHeight={1.5}
        textAlign={anchorX === 'center' ? 'center' : 'left'}
        raycast={() => null} // Prevent text bounding boxes from blocking button clicks
        fontWeight="500"
    >
        {text}
    </Text>
);
