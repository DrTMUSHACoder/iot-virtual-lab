import React, { useMemo, useRef, useState } from 'react';
import { Box, Plane, Cylinder, Text, Instances, Instance } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CampusInfoBoard } from './CampusInfoBoard';

const birdMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9, side: THREE.DoubleSide });

/** Animated bird silhouettes flying in circular paths */
const AnimatedBirds: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const birdRefs = useRef<THREE.Group[]>([]);

    const birdData = useMemo(() => [
        { radius: 12, height: 8, speed: 0.15, phase: 0 },
        { radius: 15, height: 10, speed: 0.1, phase: 2 },
        { radius: 10, height: 9, speed: 0.12, phase: 4 },
    ], []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        birdData.forEach((b, i) => {
            const ref = birdRefs.current[i];
            if (!ref) return;
            const angle = t * b.speed + b.phase;
            ref.position.x = Math.cos(angle) * b.radius;
            ref.position.z = Math.sin(angle) * b.radius;
            ref.position.y = b.height + Math.sin(t * 0.5 + b.phase) * 0.5;
            ref.rotation.y = -angle + Math.PI / 2;
        });
    });

    return (
        <group ref={groupRef}>
            {birdData.map((_, i) => (
                <group key={`bird-${i}`} ref={el => { if (el) birdRefs.current[i] = el; }}>
                    {/* Wing left */}
                    <mesh position={[-0.15, 0, 0]} rotation={[0, 0, 0.3]} material={birdMat}>
                        <planeGeometry args={[0.3, 0.06]} />
                    </mesh>
                    {/* Wing right */}
                    <mesh position={[0.15, 0, 0]} rotation={[0, 0, -0.3]} material={birdMat}>
                        <planeGeometry args={[0.3, 0.06]} />
                    </mesh>
                    {/* Body */}
                    <mesh material={birdMat}>
                        <planeGeometry args={[0.06, 0.15]} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

/* ═══════════════════════════════════════════════════════════════════
   RAMACHANDRA COLLEGE OF ENGINEERING - VR EXTERIOR
   
   A low-poly, optimized procedural environment representing a modern Indian 
   engineering campus. Features:
   - 3-4 floor rectangular academic building (white/light green)
   - Rooftop solar panels
   - Glowing college name signboard
   - Paved roads, parking areas, and yellow college buses
   - Greenery (palm trees, bushes, lawns)
   - Sunrise/golden hour lighting with subtle fog
   ═══════════════════════════════════════════════════════════════════ */

// --- Materials (Globally Shared for Performance) ---
const mats = {
    grass: new THREE.MeshStandardMaterial({ color: '#558b2f', roughness: 0.95 }),
    asphalt: new THREE.MeshStandardMaterial({ color: '#424242', roughness: 0.9, metalness: 0.05 }),
    pathway: new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.8 }),
    dirt: new THREE.MeshStandardMaterial({ color: '#8d6e63', roughness: 1.0 }),
    buildingWhite: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.8, metalness: 0.05 }),
    buildingGreen: new THREE.MeshStandardMaterial({ color: '#aed581', roughness: 0.85, metalness: 0.02 }),
    windowGlass: new THREE.MeshStandardMaterial({ color: '#1a237e', roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.8 }),
    solarPanel: new THREE.MeshStandardMaterial({ color: '#0d47a1', roughness: 0.3, metalness: 0.7 }),
    metalFrame: new THREE.MeshStandardMaterial({ color: '#9e9e9e', roughness: 0.6, metalness: 0.5 }),
    yellowBus: new THREE.MeshStandardMaterial({ color: '#fbc02d', roughness: 0.5, metalness: 0.3 }),
    busWindow: new THREE.MeshStandardMaterial({ color: '#212121', roughness: 0.1, metalness: 0.9 }),
    busTire: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#5d4037', roughness: 0.9 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.8 }),
    redGlow: new THREE.MeshStandardMaterial({ color: '#d32f2f', emissive: '#d32f2f', emissiveIntensity: 2.5 }),
    blueGlow: new THREE.MeshStandardMaterial({ color: '#1976d2', emissive: '#1976d2', emissiveIntensity: 1.5 }),
    signWhite: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 })
};

// --- Helper Components ---



const InstancedPalmTrees: React.FC = () => {
    const palmData = [
        ...[-15, -5, 5, 15, 25].map(x => ({ pos: [x, 0, 18], scale: 1.2 })),
        ...[-15, -5, 5, 15, 25].map(x => ({ pos: [x, 0, 12], scale: 1.1 }))
    ];

    return (
        <group>
            <Instances limit={20} material={mats.trunk} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 3.0, 6]} />
                {palmData.map((d, i) => (
                    <Instance key={`trunk-${i}`} position={[d.pos[0], d.pos[1] + 1.5 * d.scale, d.pos[2]]} scale={d.scale} />
                ))}
            </Instances>

            <Instances limit={50} material={mats.foliage} castShadow>
                <boxGeometry args={[1.5, 0.05, 0.3]} />
                {palmData.map((d, i) => {
                    const py = d.pos[1] + 3.0 * d.scale;
                    return (
                        <React.Fragment key={`leaves-${i}`}>
                            <Instance position={[d.pos[0], py, d.pos[2]]} scale={d.scale} rotation={[0.2, 0, 0]} />
                            <Instance position={[d.pos[0], py, d.pos[2]]} scale={d.scale} rotation={[-0.2, Math.PI / 2, 0]} />
                            <Instance position={[d.pos[0], py, d.pos[2]]} scale={d.scale} rotation={[0.2, Math.PI / 4, 0]} />
                            <Instance position={[d.pos[0], py, d.pos[2]]} scale={d.scale} rotation={[-0.2, -Math.PI / 4, 0]} />
                        </React.Fragment>
                    );
                })}
            </Instances>
        </group>
    );
};

const CollegeBus: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({ position, rotation = [0, 0, 0] }) => (
    <group position={position} rotation={rotation}>
        {/* Main Body */}
        <Box args={[1.2, 1.4, 4.0]} position={[0, 0.8, 0]} material={mats.yellowBus} />
        {/* Front Engine/Cab */}
        <Box args={[1.2, 1.0, 0.8]} position={[0, 0.6, 2.4]} material={mats.yellowBus} />
        {/* Windows */}
        <Box args={[1.22, 0.5, 3.6]} position={[0, 1.0, 0]} material={mats.busWindow} /> {/* Sides */}
        <Box args={[1.0, 0.5, 0.02]} position={[0, 1.0, 2.01]} material={mats.busWindow} /> {/* Front Windshield */}
        <Box args={[1.0, 0.5, 0.02]} position={[0, 1.0, -2.01]} material={mats.busWindow} /> {/* Rear Windshield */}
        {/* Wheels */}
        {[-0.65, 0.65].map((x) =>
            [-1.2, 1.6].map((z, i) => (
                <Cylinder key={`${x}-${z}-${i}`} args={[0.3, 0.3, 0.2, 12]} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]} material={mats.busTire} />
            ))
        )}
    </group>
);

// --- Easter Egg Components ---
const CampusBenches: React.FC = () => {
    const benchData = [
        { pos: [-7, 0, 16], rot: [0, Math.PI / 2, 0] },
        { pos: [-3, 0, 16], rot: [0, -Math.PI / 2, 0] },
        { pos: [-9, 0, 8], rot: [0, 0, 0] },
        { pos: [-3, 0, 8], rot: [0, 0, 0] }
    ];
    return (
        <group>
            {benchData.map((b, i) => (
                <group key={`bench-${i}`} position={b.pos as any} rotation={b.rot as any}>
                    <Box args={[1.5, 0.05, 0.5]} position={[0, 0.4, 0]} material={mats.metalFrame} castShadow />
                    <Box args={[1.5, 0.5, 0.05]} position={[0, 0.65, -0.25]} material={mats.metalFrame} castShadow />
                    <Box args={[0.05, 0.4, 0.4]} position={[-0.7, 0.2, 0]} material={mats.metalFrame} castShadow />
                    <Box args={[0.05, 0.4, 0.4]} position={[0.7, 0.2, 0]} material={mats.metalFrame} castShadow />
                </group>
            ))}
        </group>
    );
};

const InstancedLowPolyTrees: React.FC = () => {
    const treeData = [
        { pos: [-12, 0, 0], scale: 1.5 },
        { pos: [-16, 0, -4], scale: 1.2 },
        { pos: [-8, 0, -2], scale: 1.8 },
        { pos: [-20, 0, 2], scale: 1.4 },
        { pos: [8, 0, 8], scale: 1.5 },
        { pos: [12, 0, 15], scale: 1.3 },
        { pos: [6, 0, 20], scale: 1.6 },
    ];
    return (
        <group>
            <Instances limit={20} material={mats.trunk} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 1.5, 5]} />
                {treeData.map((d, i) => (
                    <Instance key={`t-trunk-${i}`} position={[d.pos[0], d.pos[1] + 0.75 * d.scale, d.pos[2]]} scale={d.scale} />
                ))}
            </Instances>
            <Instances limit={40} material={mats.foliage} castShadow>
                <cylinderGeometry args={[0, 0.8, 1.2, 5]} />
                {treeData.map((d, i) => (
                    <Instance key={`t-foliage1-${i}`} position={[d.pos[0], d.pos[1] + 2.0 * d.scale, d.pos[2]]} scale={d.scale} />
                ))}
            </Instances>
            <Instances limit={40} material={mats.foliage} castShadow>
                <cylinderGeometry args={[0, 0.6, 1.0, 5]} />
                {treeData.map((d, i) => (
                    <Instance key={`t-foliage2-${i}`} position={[d.pos[0], d.pos[1] + 2.6 * d.scale, d.pos[2]]} scale={d.scale} />
                ))}
            </Instances>
        </group>
    );
};

const StreetLamps: React.FC = () => {
    const lampPositions: [number, number, number][] = [
        [-5, 0, 16], [-5, 0, 12], [-5, 0, 8],
        [3, 0, 16], [3, 0, 12],
        [-15, 0, 18], [-9, 0, 20],
        [8, 0, 18],
    ];
    return (
        <group>
            {lampPositions.map((pos, i) => (
                <group key={`lamp-${i}`} position={pos}>
                    {/* Pole */}
                    <Cylinder args={[0.04, 0.06, 4, 6]} position={[0, 2, 0]} material={mats.metalFrame} castShadow />
                    {/* Arm */}
                    <Box args={[0.6, 0.04, 0.04]} position={[0.3, 3.9, 0]} material={mats.metalFrame} />
                    {/* Lamp head */}
                    <Box args={[0.3, 0.08, 0.15]} position={[0.55, 3.85, 0]} castShadow>
                        <meshStandardMaterial color="#263238" roughness={0.3} metalness={0.6} />
                    </Box>
                    {/* Bulb glow */}
                    <mesh position={[0.55, 3.8, 0]}>
                        <sphereGeometry args={[0.04, 8, 8]} />
                        <meshStandardMaterial color="#fff9c4" emissive="#ffcc80" emissiveIntensity={3} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

// --- Easter Egg Components ---
const DronePad = () => {
    const [launched, setLaunched] = React.useState(false);
    const droneRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!launched || !droneRef.current) return;
        droneRef.current.position.y += 0.08;
        droneRef.current.rotation.y += 0.1;
    });

    const handleLaunch = () => {
        if (launched) return;
        setLaunched(true);
        import('./AchievementSystem').then(m => m.unlockAchievement('easter-egg'));
    };

    return (
        <group position={[-15, 6.1, -15]} onClick={handleLaunch} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
            <Cylinder args={[1.5, 1.5, 0.2, 16]}>
                <meshStandardMaterial color="#333" />
            </Cylinder>
            <Cylinder args={[1.2, 1.2, 0.21, 16]}>
                <meshStandardMaterial color={launched ? "#00e676" : "#f39c12"} emissive={launched ? "#00e676" : "#f39c12"} emissiveIntensity={1} />
            </Cylinder>
            <group ref={droneRef} position={[0, 0.3, 0]}>
                {/* drone body */}
                <Box args={[0.6, 0.15, 0.6]}><meshStandardMaterial color="#fff" /></Box>
                {/* 4 props */}
                {[[-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]].map((p, i) => (
                    <Cylinder key={i} args={[0.25, 0.25, 0.05, 8]} position={[p[0], 0.15, p[1]]}>
                        <meshStandardMaterial color="#111" />
                    </Cylinder>
                ))}
            </group>
        </group>
    );
};

const RoamingRobot = () => {
    const robotRef = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (!robotRef.current) return;
        const t = clock.getElapsedTime() * 0.4;
        const radius = 22;
        robotRef.current.position.x = Math.cos(t) * radius;
        robotRef.current.position.z = Math.sin(t) * radius;
        robotRef.current.rotation.y = -t; // face forward
    });
    return (
        <group ref={robotRef} position={[0, 0, 0]}>
            <Box args={[0.6, 0.8, 0.6]} position={[0, 0.4, 0]}>
                <meshStandardMaterial color="#ddd" roughness={0.4} metalness={0.6} />
            </Box>
            <Box args={[0.4, 0.3, 0.4]} position={[0, 1.0, 0]}>
                <meshStandardMaterial color="#999" roughness={0.4} metalness={0.8} />
            </Box>
            {/* Eye */}
            <Box args={[0.3, 0.1, 0.05]} position={[0, 1.0, 0.2]}>
                <meshStandardMaterial color="#00d2ff" emissive="#00d2ff" emissiveIntensity={2} />
            </Box>
        </group>
    );
};

// ─── IoT Animated Demo Components ───

const MotionSensorDemo: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const ledMat = useRef<THREE.MeshStandardMaterial>(null);
    const [active, setActive] = useState(false);

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        const isActive = Math.sin(time * 1.5) > 0.8; // Trigger occasionally
        if (isActive !== active) setActive(isActive);

        if (ledMat.current) {
            if (isActive) {
                // Blink rapidly when active
                const blink = Math.sin(time * 30) > 0 ? 3.0 : 0.0;
                ledMat.current.emissiveIntensity = blink;
                ledMat.current.color.set(blink > 0 ? '#f44336' : '#880000');
            } else {
                ledMat.current.emissiveIntensity = 0.5;
                ledMat.current.color.set('#880000');
            }
        }
    });

    return (
        <group position={position}>
            {/* PCB Board */}
            <Box args={[0.2, 0.02, 0.15]} position={[0, 0, 0]} castShadow>
                <meshStandardMaterial color="#1b5e20" roughness={0.8} />
            </Box>
            {/* PIR Dome */}
            <mesh position={[0, 0.06, 0]} castShadow>
                <sphereGeometry args={[0.05, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={active ? "#ffeb3b" : "#e0e0e0"} roughness={0.3} metalness={0.2} transparent opacity={0.85} />
            </mesh>
            {/* PIR Fresnel Lens Ring */}
            <Cylinder args={[0.052, 0.055, 0.01, 16]} position={[0, 0.01, 0]}>
                <meshStandardMaterial color="#9e9e9e" roughness={0.3} metalness={0.6} />
            </Cylinder>
            {/* LED indicator */}
            <mesh position={[0.07, 0.02, 0.04]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshStandardMaterial ref={ledMat} color="#880000" emissive="#f44336" emissiveIntensity={0.5} />
            </mesh>
            {/* Buzzer */}
            <Cylinder args={[0.015, 0.015, 0.02, 16]} position={[-0.06, 0.02, 0.04]}>
                <meshStandardMaterial color="#212121" />
            </Cylinder>
            {/* Wires */}
            <Cylinder args={[0.003, 0.003, 0.06, 4]} position={[-0.03, -0.04, 0]} material={mats.metalFrame} />
            <Cylinder args={[0.003, 0.003, 0.06, 4]} position={[0, -0.04, 0]} material={mats.metalFrame} />
            <Cylinder args={[0.003, 0.003, 0.06, 4]} position={[0.03, -0.04, 0]} material={mats.metalFrame} />
            <Text position={[0, 0.2, 0]} fontSize={0.04} color="#80cbc4" anchorX="center" fontWeight={700}>
                Motion Sensor
            </Text>
        </group>
    );
};

const WeatherStationDemo: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const [temp, setTemp] = useState(28.0);
    const [hum, setHum] = useState(65);

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        if (Math.floor(time * 10) % 50 === 0) {
            setTemp(+(28.0 + Math.sin(time) * 0.5).toFixed(1));
            setHum(Math.round(65 + Math.cos(time * 0.5) * 5));
        }
    });

    return (
        <group position={position}>
            {/* Station Housing */}
            <Box args={[0.18, 0.12, 0.1]} position={[0, 0.06, 0]} castShadow>
                <meshStandardMaterial color="#263238" roughness={0.5} metalness={0.3} />
            </Box>
            {/* Display Screen */}
            <Box args={[0.14, 0.06, 0.005]} position={[0, 0.08, 0.053]} castShadow>
                <meshStandardMaterial color="#0a192f" emissive="#1565c0" emissiveIntensity={0.5} />
            </Box>
            {/* Temp reading text */}
            <Text position={[-0.02, 0.09, 0.057]} fontSize={0.015} color="#4fc3f7" anchorX="center">
                {`${temp}°C  ${hum}%`}
            </Text>
            {/* Sensor grille */}
            <Box args={[0.04, 0.04, 0.02]} position={[0.06, 0.04, 0.05]}>
                <meshStandardMaterial color="#546e7a" roughness={0.6} metalness={0.4} />
            </Box>
            {/* Antenna */}
            <Cylinder args={[0.003, 0.003, 0.08, 4]} position={[0.08, 0.14, 0]}>
                <meshStandardMaterial color="#90a4ae" roughness={0.2} metalness={0.8} />
            </Cylinder>
            <Text position={[0, 0.2, 0]} fontSize={0.04} color="#64b5f6" anchorX="center" fontWeight={700}>
                Weather Station
            </Text>
        </group>
    );
};

const SmartHomeDemo: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const [lightOn, setLightOn] = useState(false);

    const handleToggle = (e: any) => {
        e?.stopPropagation?.();
        setLightOn(l => !l);
        // Assuming sound is wanted, but we don't have playUISnap imported here. We can just visually toggle.
    };

    return (
        <group position={position}>
            {/* Relay Module PCB */}
            <Box args={[0.18, 0.02, 0.12]} position={[0, 0, 0]} castShadow>
                <meshStandardMaterial color="#1565c0" roughness={0.7} />
            </Box>
            {/* Relay Body */}
            <Box args={[0.08, 0.06, 0.08]} position={[-0.03, 0.04, 0]} castShadow>
                <meshStandardMaterial color="#1a237e" roughness={0.5} metalness={0.3} />
            </Box>
            {/* Smart Bulb */}
            <group position={[0.06, 0.04, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.03, 12, 12]} />
                    <meshStandardMaterial
                        color={lightOn ? "#fff9c4" : "#e0e0e0"}
                        emissive={lightOn ? "#ffeb3b" : "#000000"}
                        emissiveIntensity={lightOn ? 1.5 : 0}
                        transparent
                        opacity={lightOn ? 0.9 : 0.6}
                    />
                </mesh>
                {/* Bulb screw base */}
                <Cylinder args={[0.015, 0.02, 0.025, 8]} position={[0, -0.035, 0]}>
                    <meshStandardMaterial color="#bdbdbd" roughness={0.3} metalness={0.8} />
                </Cylinder>
            </group>
            {/* Toggle Switch (Interactive) */}
            <Interactive onSelect={handleToggle}>
                <Box args={[0.04, 0.03, 0.04]} position={[-0.06, 0.02, 0.05]} castShadow onClick={handleToggle}
                    onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                >
                    <meshStandardMaterial color={lightOn ? "#4caf50" : "#e65100"} roughness={0.4} metalness={0.5} />
                </Box>
            </Interactive>
            <Text position={[0, 0.2, 0]} fontSize={0.04} color="#ffb74d" anchorX="center" fontWeight={700}>
                Smart Home
            </Text>
        </group>
    );
};

// --- Main Environment Component ---

export const OutdoorEnvironment: React.FC = () => {

    // Instanced Windows for Main Building (Performance Optimization)
    // 4 floors, 14 columns of windows
    const windowCount = 4 * 14;
    const windowMatrix = useMemo(() => {
        const tempObj = new THREE.Object3D();
        const arr = new Float32Array(windowCount * 16);
        let idx = 0;
        for (let floor = 0; floor < 4; floor++) {
            for (let col = 0; col < 14; col++) {
                tempObj.position.set(-13.5 + (col * 2), 1.6 + (floor * 2.5), 10.05); // Front face
                tempObj.scale.set(1.2, 1.0, 0.05);
                tempObj.updateMatrix();
                tempObj.matrix.toArray(arr, idx * 16);
                idx++;
            }
        }
        return arr;
    }, []);

    // Instanced Solar Panels on Roof
    const panelCount = 2 * 10;
    const panelMatrix = useMemo(() => {
        const tempObj = new THREE.Object3D();
        const arr = new Float32Array(panelCount * 16);
        let idx = 0;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 10; col++) {
                tempObj.position.set(-10 + (col * 2.5), 10.5, 6 - (row * 3));
                tempObj.rotation.set(-Math.PI / 6, 0, 0); // Tilted facing sun
                tempObj.scale.set(2.0, 0.05, 1.5);
                tempObj.updateMatrix();
                tempObj.matrix.toArray(arr, idx * 16);
                idx++;
            }
        }
        return arr;
    }, []);

    return (
        <group>
            {/* ═══════ GROUND & LANDSCAPE ═══════ */}
            {/* Surrounding Farmland (Distant) */}
            <Plane args={[300, 300]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow material={mats.dirt} />

            {/* Main Campus Lawn */}
            <Plane args={[120, 120]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={mats.grass} />

            {/* Campus Roads (Asphalt) */}
            {/* Main road front */}
            <Plane args={[100, 10]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 25]} material={mats.asphalt} receiveShadow />
            {/* Parking lot area */}
            <Plane args={[20, 24]} rotation={[-Math.PI / 2, 0, 0]} position={[-25, 0.01, 8]} material={mats.asphalt} receiveShadow />

            {/* Concrete Sidewalks & Plazas */}
            {/* Main Entrance Plaza */}
            <Plane args={[20, 8]} rotation={[-Math.PI / 2, 0, 0]} position={[-21, 0.02, 18]} material={mats.pathway} receiveShadow />

            {/* Building approach sidewalk */}
            <Plane args={[6, 18]} rotation={[-Math.PI / 2, 0, 0]} position={[-21, 0.02, 7]} material={mats.pathway} receiveShadow />

            {/* Path connecting lab corridor to building */}
            <Plane args={[16, 3]} rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.02, 6.5]} material={mats.pathway} receiveShadow />
            {/* Lab entrance plaza */}
            <Plane args={[4, 6]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 9]} material={mats.pathway} receiveShadow />

            {/* ═══════ MAIN ACADEMIC BUILDING ═══════ */}
            {/* Positioned so right edge (x=-6) aligns with lab's left wall, physically connecting them */}
            <group position={[-21, 0, -2.5]}>
                {/* Main Structure (White) */}
                <Box args={[30, 10, 10]} position={[0, 5, 5]} material={mats.buildingWhite} castShadow receiveShadow />

                {/* Architectural Green Accents (Corners) */}
                <Box args={[1, 10, 10.2]} position={[-14.5, 5, 5]} material={mats.buildingGreen} />
                <Box args={[1, 10, 10.2]} position={[14.5, 5, 5]} material={mats.buildingGreen} />
                <Box args={[1, 10, 10.2]} position={[-3, 5, 5]} material={mats.buildingGreen} /> {/* Entry column */}
                <Box args={[1, 10, 10.2]} position={[3, 5, 5]} material={mats.buildingGreen} /> {/* Entry column */}

                {/* Building Entrance */}
                <Box args={[5, 3, 11]} position={[0, 1.5, 5]} material={mats.buildingWhite} />
                <Box args={[4, 2.5, 0.1]} position={[0, 1.25, 10.5]} material={mats.windowGlass} /> {/* Glass doors */}

                {/* Instanced Windows */}
                <instancedMesh args={[new THREE.BoxGeometry(1, 1, 1), mats.windowGlass, windowCount]} castShadow>
                    <instancedBufferAttribute attach="instanceMatrix" args={[windowMatrix, 16]} />
                </instancedMesh>

                {/* Instanced Solar Panels on Roof */}
                <instancedMesh args={[new THREE.BoxGeometry(1, 1, 1), mats.solarPanel, panelCount]} castShadow>
                    <instancedBufferAttribute attach="instanceMatrix" args={[panelMatrix, 16]} />
                </instancedMesh>

                {/* Solar Panel Racks/Mounts (Simplified as long boxes) */}
                {[6, 3].map((z, i) => (
                    <Box key={`rack-${i}`} args={[28, 0.5, 0.1]} position={[0, 10.2, z]} material={mats.metalFrame} />
                ))}

                {/* ═══════ ROOFTOP SIGNBOARD ═══════ */}
                <group position={[0, 10, 5]}>
                    {/* Metal Support Frame */}
                    <Box args={[20, 2, 1]} position={[0, 1, 0]} material={mats.metalFrame} />
                    {/* Steel pillars */}
                    {[-9, -5, 0, 5, 9].map((x) => (
                        <Cylinder key={`pillar-${x}`} args={[0.05, 0.05, 3, 4]} position={[x, 1.5, 0]} material={mats.metalFrame} />
                    ))}

                    {/* Signboard Backing */}
                    <Box args={[16, 2.5, 0.2]} position={[0, 2.8, 0.1]} material={mats.signWhite} />

                    {/* Glowing LED Text */}
                    <group position={[0, 2.8, 0.25]}>
                        <Text position={[0, 0.6, 0]} fontSize={0.4} color="#000000" material={new THREE.MeshBasicMaterial({ color: 'black' })} outlineWidth={0.01} anchorX="center" anchorY="middle">
                            AUTONOMOUS
                        </Text>
                        <Text position={[0, 0, 0]} fontSize={1.0} material={mats.redGlow} outlineWidth={0.02} anchorX="center" anchorY="middle">
                            RAMACHANDRA
                        </Text>
                        <Text position={[0, -0.7, 0]} fontSize={0.5} material={mats.blueGlow} outlineWidth={0.01} anchorX="center" anchorY="middle">
                            COLLEGE OF ENGINEERING
                        </Text>

                        {/* Fake Logo box on the left */}
                        <Box args={[0.8, 0.8, 0.1]} position={[-7.2, 0, 0]} material={mats.blueGlow} />
                        <Text position={[-7.2, 0, 0.06]} fontSize={0.7} material={mats.signWhite} anchorX="center" anchorY="middle">R</Text>
                    </group>
                </group>
            </group>

            {/* ═══════ COLLEGE BUSES ═══════ */}
            <CollegeBus position={[-25, 0, 10]} rotation={[0, Math.PI / 4, 0]} />
            <CollegeBus position={[-23, 0, 16]} rotation={[0, Math.PI / 4, 0]} />
            <CollegeBus position={[-21, 0, 22]} rotation={[0, Math.PI / 4, 0]} />

            {/* ═══════ TREES & GREENERY ═══════ */}
            {/* Palm trees lining the road (Instanced) */}
            <InstancedPalmTrees />

            {/* Standard campus trees around courtyard (Instanced) */}
            <InstancedLowPolyTrees />

            {/* Campus Benches */}
            <CampusBenches />

            {/* Street Lamps */}
            <StreetLamps />

            {/* ═══════ REALISTIC CAMPUS ENTRY GATE ═══════ */}
            <group position={[-5, 0, 22]}>
                {/* Main Archway */}
                <Box args={[1.5, 6, 1.5]} position={[-5, 3, 0]} material={mats.buildingWhite} castShadow receiveShadow />
                <Box args={[1.5, 6, 1.5]} position={[5, 3, 0]} material={mats.buildingWhite} castShadow receiveShadow />
                <Box args={[10, 1.5, 1.5]} position={[0, 6.75, 0]} material={mats.buildingGreen} castShadow />

                {/* Signage */}
                <Text position={[0, 6.75, 0.76]} fontSize={0.4} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.01}>
                    AUTONOMOUS RAMACHANDRA COLLEGE OF ENGINEERING
                </Text>

                {/* Security Booth */}
                <group position={[-4.5, 0, -2]}>
                    <Box args={[2, 3, 2]} position={[0, 1.5, 0]} material={mats.buildingWhite} castShadow />
                    <Box args={[2.2, 0.2, 2.2]} position={[0, 3.1, 0]} material={mats.buildingGreen} castShadow />
                    <Box args={[1.8, 1.2, 0.1]} position={[0, 1.8, 1.01]} material={mats.windowGlass} /> {/* Window */}
                    <Text position={[0, 2.5, 1.02]} fontSize={0.2} color="#000000" anchorX="center" material={mats.signWhite}>SECURITY</Text>
                </group>

                {/* Flag pole */}
                <group position={[4.5, 0, -2]}>
                    <Cylinder args={[0.05, 0.1, 8, 8]} position={[0, 4, 0]} material={mats.metalFrame} castShadow />
                    {/* Flag */}
                    <Plane args={[1.5, 1]} position={[0.75, 7.5, 0]} material={mats.redGlow} castShadow />
                </group>
            </group>

            {/* ═══════ DIRECTIONAL SIGNPOSTS ═══════ */}
            {/* Signpost near entrance */}
            <group position={[-5, 0, 18]}>
                {/* Pole */}
                <Cylinder args={[0.04, 0.04, 3, 8]} position={[0, 1.5, 0]} material={mats.metalFrame} castShadow />
                {/* IoT Lab sign */}
                <group position={[0, 2.5, 0]} rotation={[0, -0.3, 0]}>
                    <Box args={[1.2, 0.25, 0.03]} castShadow>
                        <meshStandardMaterial color="#0d47a1" roughness={0.3} metalness={0.4} />
                    </Box>
                    <Text position={[0, 0, 0.02]} fontSize={0.08} color="#ffffff" anchorX="center" anchorY="middle">
                        IoT Lab →
                    </Text>
                </group>
                {/* Electronics Lab sign */}
                <group position={[0, 2.1, 0]} rotation={[0, -0.3, 0]}>
                    <Box args={[1.2, 0.25, 0.03]} castShadow>
                        <meshStandardMaterial color="#1b5e20" roughness={0.3} metalness={0.4} />
                    </Box>
                    <Text position={[0, 0, 0.02]} fontSize={0.08} color="#ffffff" anchorX="center" anchorY="middle">
                        Electronics Lab →
                    </Text>
                </group>
                {/* Robotics Lab sign */}
                <group position={[0, 1.7, 0]} rotation={[0, 0.3, 0]}>
                    <Box args={[1.2, 0.25, 0.03]} castShadow>
                        <meshStandardMaterial color="#b71c1c" roughness={0.3} metalness={0.4} />
                    </Box>
                    <Text position={[0, 0, 0.02]} fontSize={0.08} color="#ffffff" anchorX="center" anchorY="middle">
                        ← Robotics Lab
                    </Text>
                </group>
            </group>

            {/* Signpost at building approach */}
            <group position={[-6, 0, 10]}>
                <Cylinder args={[0.04, 0.04, 2.5, 8]} position={[0, 1.25, 0]} material={mats.metalFrame} castShadow />
                <group position={[0, 2.2, 0]} rotation={[0, -0.5, 0]}>
                    <Box args={[1.0, 0.25, 0.03]} castShadow>
                        <meshStandardMaterial color="#0d47a1" roughness={0.3} metalness={0.4} />
                    </Box>
                    <Text position={[0, 0, 0.02]} fontSize={0.08} color="#ffffff" anchorX="center" anchorY="middle">
                        IoT Lab →
                    </Text>
                </group>
            </group>

            {/* ═══════ CAMPUS INFO BOARD ═══════ */}
            <CampusInfoBoard position={[-3, 0, 19]} rotation={[0, Math.PI, 0]} />

            {/* ═══════ ANIMATED BIRDS ═══════ */}
            <AnimatedBirds />

            {/* ═══════ IoT DEMO TABLE (outside lab entrance) ═══════ */}
            <group position={[3, 0, 8]}>
                {/* Table Surface */}
                <Box args={[2.0, 0.06, 1.0]} position={[0, 0.85, 0]} castShadow receiveShadow>
                    <meshStandardMaterial color="#4e342e" roughness={0.6} metalness={0.1} />
                </Box>
                {/* Table Legs */}
                {[[-0.85, 0.42, 0.4], [0.85, 0.42, 0.4], [-0.85, 0.42, -0.4], [0.85, 0.42, -0.4]].map((p, i) => (
                    <Box key={`iot-leg-${i}`} args={[0.05, 0.84, 0.05]} position={p as [number, number, number]} castShadow>
                        <meshStandardMaterial color="#37474f" roughness={0.3} metalness={0.7} />
                    </Box>
                ))}

                {/* ── MOTION SENSOR NODE ── */}
                <MotionSensorDemo position={[-0.6, 0.88, 0]} />

                {/* ── WEATHER STATION NODE ── */}
                <WeatherStationDemo position={[0, 0.88, 0]} />

                {/* ── SMART HOME NODE ── */}
                <SmartHomeDemo position={[0.6, 0.88, 0]} />

                {/* Table Title */}
                <Text position={[0, 1.18, 0]} fontSize={0.06} color="#00d2ff" anchorX="center" fontWeight={700}>
                    IoT Demonstrations
                </Text>
            </group>

            {/* ═══════ BUS INTERIOR (first bus only, accessible) ═══════ */}
            <group position={[-25, 0, 10]} rotation={[0, Math.PI / 4, 0]}>
                {/* Seats inside bus (2 rows of 4) */}
                {[-1.2, -0.4, 0.4, 1.2].map((z, i) => (
                    <React.Fragment key={`bus-seat-${i}`}>
                        <Box args={[0.35, 0.45, 0.3]} position={[-0.35, 0.45, z]}>
                            <meshStandardMaterial color="#1565c0" roughness={0.7} />
                        </Box>
                        <Box args={[0.35, 0.45, 0.3]} position={[0.35, 0.45, z]}>
                            <meshStandardMaterial color="#1565c0" roughness={0.7} />
                        </Box>
                    </React.Fragment>
                ))}
            </group>

            {/* ═══════ EASTER EGGS ═══════ */}
            <DronePad />
            <RoamingRobot />

        </group>
    );
};
