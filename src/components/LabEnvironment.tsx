
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Plane, Cylinder, Text } from '@react-three/drei';
import { CollisionRegistry, boxFromCenter } from './CollisionSystem';
import * as THREE from 'three';
import { LabMateAI } from './vr/LabMateAI';
import { InteractiveComputer } from './InteractiveComputer';
import { InteractiveDoor } from './InteractiveDoor';
import { InteractivePosters } from './InteractivePosters';
import { CircuitChallenge } from './CircuitChallenge';

/* ═══════════════════════════════════════════════════════════════════
   MASTER LAB ENVIRONMENT — Realistic College Electronics Lab
   
   Room:  12m × 10m × 3.2m  (width × depth × height)
   Layout: Corridor entrance at +Z, main lab toward -Z
   Outdoor campus visible through left-wall windows
   Quest-optimized: instanced meshes, no point lights, minimal shadows
   ═══════════════════════════════════════════════════════════════════ */

// ─── Room Constants ───
const ROOM_W = 12;
const ROOM_D = 10;
const ROOM_H = 3.2;
const WALL_T = 0.12;

// ─── Corridor Constants ───
const CORRIDOR_DEPTH = 2.5;
const CORRIDOR_W = 2.0;

// ─── Shared material colors ───
const WALL_COLOR = '#d5cfc8';       // soft warm off-white (less bright)
const FLOOR_COLOR = '#8e8e8e';      // medium grey lab tile (darker)
const FLOOR_LINE = '#7a7a7a';       // floor grid lines (darker)
const CEILING_COLOR = '#e8e5e0';    // neutral warm ceiling
const METAL_DARK = '#37474f';       // dark metal (darker)
const METAL_LIGHT = '#607d8b';      // medium metal
const WOOD_DARK = '#2e1b0e';        // dark walnut tabletop
const WOOD_LIGHT = '#4e342e';       // walnut lighter
const ACCENT = '#0277bd';           // muted academic blue


/* ─────────────── HELPER: LED Ceiling Panel ─────────────── */
const LEDPanel: React.FC<{
  position: [number, number, number];
  width?: number;
  depth?: number;
}> = ({ position, width = 1.2, depth = 0.6 }) => (
  <group position={position}>
    <Box args={[width, 0.03, depth]}>
      <meshStandardMaterial color="#f5f5f5" roughness={0.2} metalness={0.3} />
    </Box>
    <Box args={[width - 0.1, 0.005, depth - 0.1]} position={[0, -0.018, 0]}>
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Ventilation Duct ─────────────── */
const VentDuct: React.FC<{
  position: [number, number, number];
  length: number;
  rotation?: [number, number, number];
}> = ({ position, length, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.3, 0.15, length]}>
      <meshStandardMaterial color="#bdbdbd" roughness={0.5} metalness={0.4} />
    </Box>
    {/* Vent grilles */}
    {Array.from({ length: Math.floor(length / 0.8) }).map((_, i) => (
      <Box key={i} args={[0.25, 0.005, 0.15]} position={[0, -0.076, -length / 2 + 0.5 + i * 0.8]}>
        <meshStandardMaterial color="#9e9e9e" roughness={0.3} metalness={0.5} />
      </Box>
    ))}
  </group>
);

/* ─────────────── HELPER: Lab Bench (instanced-friendly) ─────────────── */
const LabBench: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  depth?: number;
  surfaceTiltX?: number; // Added to allow tilting just the top surface while legs stay grounded
}> = ({ position, rotation = [0, 0, 0], width = 2.0, depth = 0.8, surfaceTiltX = 0 }) => {
  const legH = 0.70;
  const topH = 0.05;
  return (
    <group position={position} rotation={rotation}>
      {/* Tilted Tabletop Group */}
      <group position={[0, legH, 0]} rotation={[surfaceTiltX, 0, 0]}>
        <Box args={[width, topH, depth]} position={[0, topH / 2, 0]} receiveShadow>
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} metalness={0.05} />
        </Box>
        {/* Metal edge trim */}
        <Box args={[width + 0.04, 0.02, depth + 0.04]} position={[0, 0, 0]}>
          <meshStandardMaterial color={METAL_LIGHT} roughness={0.2} metalness={0.9} />
        </Box>
      </group>

      {/* Vertical Legs */}
      {[
        [width / 2 - 0.08, legH / 2, depth / 2 - 0.08],
        [-width / 2 + 0.08, legH / 2, depth / 2 - 0.08],
        [width / 2 - 0.08, legH / 2, -depth / 2 + 0.08],
        [-width / 2 + 0.08, legH / 2, -depth / 2 + 0.08],
      ].map((pos, i) => (
        <Box key={i} args={[0.04, legH, 0.04]} position={pos as [number, number, number]}>
          <meshStandardMaterial color={METAL_DARK} roughness={0.15} metalness={0.95} />
        </Box>
      ))}
      {/* Cross braces */}
      <Box args={[width - 0.2, 0.025, 0.025]} position={[0, 0.2, depth / 2 - 0.1]}>
        <meshStandardMaterial color={METAL_DARK} roughness={0.2} metalness={0.9} />
      </Box>
      <Box args={[width - 0.2, 0.025, 0.025]} position={[0, 0.2, -depth / 2 + 0.1]}>
        <meshStandardMaterial color={METAL_DARK} roughness={0.2} metalness={0.9} />
      </Box>
    </group>
  );
};

/* ─────────────── HELPER: Lab Stool ─────────────── */
const LabStool: React.FC<{
  position: [number, number, number];
}> = ({ position }) => (
  <group position={position}>
    {/* Seat - 0.45m height */}
    <Cylinder args={[0.16, 0.16, 0.04, 12]} position={[0, 0.43, 0]}>
      <meshStandardMaterial color="#37474f" roughness={0.4} metalness={0.6} />
    </Cylinder>
    {/* Stem */}
    <Cylinder args={[0.02, 0.02, 0.38, 8]} position={[0, 0.21, 0]}>
      <meshStandardMaterial color="#616161" metalness={1} roughness={0.2} />
    </Cylinder>
    {/* Star base - 5 legs */}
    {[0, 72, 144, 216, 288].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      return (
        <Box
          key={i}
          args={[0.14, 0.012, 0.012]}
          position={[Math.cos(rad) * 0.07, 0.02, Math.sin(rad) * 0.07]}
          rotation={[0, -rad, 0]}
        >
          <meshStandardMaterial color="#616161" metalness={0.9} roughness={0.2} />
        </Box>
      );
    })}
  </group>
);

/* ─────────────── HELPER: Storage Cabinet ─────────────── */
const StorageCabinet: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Main body */}
    <Box args={[0.9, 1.8, 0.45]} position={[0, 0.9, 0]}>
      <meshStandardMaterial color={METAL_DARK} roughness={0.4} metalness={0.7} />
    </Box>
    {/* Doors (2) */}
    <Box args={[0.43, 1.74, 0.02]} position={[-0.22, 0.9, 0.235]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    <Box args={[0.43, 1.74, 0.02]} position={[0.22, 0.9, 0.235]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    {/* Door handles */}
    <Box args={[0.02, 0.08, 0.02]} position={[-0.04, 0.9, 0.255]}>
      <meshStandardMaterial color="#b0bec5" metalness={1} roughness={0.1} />
    </Box>
    <Box args={[0.02, 0.08, 0.02]} position={[0.04, 0.9, 0.255]}>
      <meshStandardMaterial color="#b0bec5" metalness={1} roughness={0.1} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Shelf Unit ─────────────── */
const ShelfUnit: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.8, 1.4, 0.3]} position={[0, 0.7, 0]}>
      <meshStandardMaterial color={METAL_DARK} roughness={0.4} metalness={0.8} />
    </Box>
    {[0.15, 0.5, 0.85, 1.2].map((y, i) => (
      <Box key={i} args={[0.76, 0.02, 0.28]} position={[0, y, 0]}>
        <meshStandardMaterial color="#607d8b" roughness={0.3} metalness={0.7} />
      </Box>
    ))}
    {/* Small component boxes */}
    <Box args={[0.12, 0.08, 0.1]} position={[-0.2, 0.23, 0]}>
      <meshStandardMaterial color="#00bcd4" roughness={0.4} />
    </Box>
    <Box args={[0.1, 0.06, 0.08]} position={[0.15, 0.22, 0]}>
      <meshStandardMaterial color="#ff9800" roughness={0.4} />
    </Box>
    <Box args={[0.14, 0.1, 0.1]} position={[-0.1, 0.58, 0]}>
      <meshStandardMaterial color="#4caf50" roughness={0.4} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Power Supply Unit ─────────────── */
const PowerSupply: React.FC<{
  position: [number, number, number];
}> = ({ position }) => (
  <group position={position}>
    <Box args={[0.3, 0.2, 0.25]} position={[0, 0.1, 0]}>
      <meshStandardMaterial color="#263238" roughness={0.3} metalness={0.7} />
    </Box>
    <Box args={[0.302, 0.18, 0.01]} position={[0, 0.1, 0.125]}>
      <meshStandardMaterial color="#37474f" roughness={0.2} metalness={0.8} />
    </Box>
    <Box args={[0.12, 0.06, 0.005]} position={[0, 0.14, 0.132]}>
      <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.8} />
    </Box>
    {/* Knobs */}
    <Cylinder args={[0.015, 0.015, 0.02, 8]} position={[-0.08, 0.06, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#b0bec5" metalness={1} roughness={0.2} />
    </Cylinder>
    <Cylinder args={[0.015, 0.015, 0.02, 8]} position={[0.08, 0.06, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#b0bec5" metalness={1} roughness={0.2} />
    </Cylinder>
  </group>
);

/* ─────────────── HELPER: Tool Rack ─────────────── */
const ToolRack: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.8, 0.6, 0.02]}>
      <meshStandardMaterial color="#cfd8dc" roughness={0.7} metalness={0.1} />
    </Box>
    {[-0.25, -0.1, 0.05, 0.2].map((x, i) => (
      <group key={i}>
        <Cylinder args={[0.012, 0.01, 0.08, 6]} position={[x, 0.15, 0.02]}>
          <meshStandardMaterial color={['#f44336', '#2196f3', '#ff9800', '#4caf50'][i]} roughness={0.5} />
        </Cylinder>
        <Cylinder args={[0.003, 0.003, 0.15, 6]} position={[x, -0.07, 0.02]}>
          <meshStandardMaterial color="#bdbdbd" metalness={1} roughness={0.1} />
        </Cylinder>
      </group>
    ))}
    {/* Multimeter */}
    <Box args={[0.08, 0.12, 0.03]} position={[0.32, 0, 0.025]}>
      <meshStandardMaterial color="#fdd835" roughness={0.5} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Power Outlet ─────────────── */
const PowerOutlet: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.08, 0.08, 0.02]}>
      <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
    </Box>
    <Cylinder args={[0.005, 0.005, 0.025, 6]} position={[-0.015, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#333" />
    </Cylinder>
    <Cylinder args={[0.005, 0.005, 0.025, 6]} position={[0.015, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#333" />
    </Cylinder>
  </group>
);

/* ─────────────── HELPER: Subtle Details (Breadboard, Tools) ─────────────── */
const SubtleDetails: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Breadboard */}
    <Box args={[0.16, 0.01, 0.05]} position={[0, 0.005, 0]}>
      <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
    </Box>
    {/* Screwdriver */}
    <Cylinder args={[0.004, 0.004, 0.12, 8]} position={[0.15, 0.004, 0.05]} rotation={[0, 0, Math.PI / 2]}>
      <meshStandardMaterial color="#d32f2f" />
    </Cylinder>
    {/* Wire Spool */}
    <Cylinder args={[0.03, 0.03, 0.04, 16]} position={[-0.15, 0.02, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#2196f3" />
    </Cylinder>
    {/* Multimeter Probes */}
    <Cylinder args={[0.002, 0.002, 0.08, 6]} position={[0.05, 0.002, 0.1]} rotation={[0, 0, Math.PI / 2.2]}>
      <meshStandardMaterial color="#333" />
    </Cylinder>
    <Cylinder args={[0.002, 0.002, 0.08, 6]} position={[0.05, 0.002, 0.12]} rotation={[0, 0, Math.PI / 2.5]}>
      <meshStandardMaterial color="#f44336" />
    </Cylinder>
  </group>
);

/* ─────────────── HELPER: Window with Glass ─────────────── */
const LabWindow: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
}> = ({ position, rotation = [0, 0, 0], width = 1.8, height = 1.2 }) => (
  <group position={position} rotation={rotation}>
    {/* Window frame */}
    <Box args={[width + 0.08, height + 0.08, 0.06]}>
      <meshStandardMaterial color="#424242" roughness={0.3} metalness={0.7} /> {/* Dark grey frame */}
    </Box>
    {/* Glass pane - realistic reflection */}
    <Box args={[width, height, 0.01]} position={[0, 0, 0.01]}>
      <meshStandardMaterial
        color="#87ceeb"
        transparent
        opacity={0.3}
        roughness={0.0}
        metalness={0.8}
        envMapIntensity={2.0}
        side={THREE.DoubleSide}
      />
    </Box>
    {/* Window divider (cross) */}
    <Box args={[0.03, height, 0.04]} position={[0, 0, 0.02]}>
      <meshStandardMaterial color="#546e7a" roughness={0.2} metalness={0.7} />
    </Box>
    <Box args={[width, 0.03, 0.04]} position={[0, 0, 0.02]}>
      <meshStandardMaterial color="#546e7a" roughness={0.2} metalness={0.7} />
    </Box>
    {/* Window sill */}
    <Box args={[width + 0.12, 0.04, 0.12]} position={[0, -height / 2 - 0.02, 0.06]}>
      <meshStandardMaterial color="#e0e0e0" roughness={0.5} metalness={0.3} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Safety Instructions Board ─────────────── */
const SafetyBoard: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.7, 0.9, 0.02]}>
      <meshStandardMaterial color="#fff9c4" roughness={0.9} />
    </Box>
    {/* Header strip */}
    <Box args={[0.7, 0.1, 0.005]} position={[0, 0.38, 0.013]}>
      <meshStandardMaterial color="#f44336" />
    </Box>
    <Text
      position={[0, 0.38, 0.02]}
      fontSize={0.035}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      font="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
    >
      ⚠ SAFETY INSTRUCTIONS
    </Text>
    {/* Content lines */}
    {[0.25, 0.18, 0.11, 0.04, -0.03, -0.10, -0.17, -0.24].map((y, i) => (
      <Box key={i} args={[0.55 - (i % 3) * 0.05, 0.006, 0.002]} position={[0, y, 0.015]}>
        <meshStandardMaterial color="#555" />
      </Box>
    ))}
  </group>
);

/* ─────────────── HELPER: Notebook on table ─────────────── */
const Notebook: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.15, 0.012, 0.21]}>
      <meshStandardMaterial color="#1565c0" roughness={0.8} />
    </Box>
    {/* Pages */}
    <Box args={[0.14, 0.01, 0.2]} position={[0, 0.002, 0]}>
      <meshStandardMaterial color="#fafafa" roughness={0.9} />
    </Box>
    {/* Lines on page */}
    {[-0.06, -0.02, 0.02, 0.06].map((z, i) => (
      <Box key={i} args={[0.12, 0.001, 0.002]} position={[0, 0.008, z]}>
        <meshStandardMaterial color="#90caf9" />
      </Box>
    ))}
  </group>
);

/* ─────────────── HELPER: Pen ─────────────── */
const Pen: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0.3, 0] }) => (
  <group position={position} rotation={rotation}>
    <Cylinder args={[0.004, 0.004, 0.14, 6]} rotation={[0, 0, Math.PI / 2]}>
      <meshStandardMaterial color="#1a237e" roughness={0.4} metalness={0.3} />
    </Cylinder>
    {/* Tip */}
    <Cylinder args={[0.001, 0.004, 0.02, 6]} position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <meshStandardMaterial color="#b0bec5" metalness={1} roughness={0.1} />
    </Cylinder>
  </group>
);

/* ─────────────── HELPER: Tool Tray ─────────────── */
const ToolTray: React.FC<{
  position: [number, number, number];
}> = ({ position }) => (
  <group position={position}>
    {/* Tray base */}
    <Box args={[0.25, 0.015, 0.15]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    {/* Tray walls */}
    <Box args={[0.25, 0.03, 0.008]} position={[0, 0.015, 0.071]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    <Box args={[0.25, 0.03, 0.008]} position={[0, 0.015, -0.071]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    <Box args={[0.008, 0.03, 0.15]} position={[0.121, 0.015, 0]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    <Box args={[0.008, 0.03, 0.15]} position={[-0.121, 0.015, 0]}>
      <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.8} />
    </Box>
    {/* Small items in tray */}
    <Box args={[0.04, 0.02, 0.03]} position={[-0.05, 0.02, 0.02]}>
      <meshStandardMaterial color="#f44336" roughness={0.5} />
    </Box>
    <Box args={[0.03, 0.015, 0.04]} position={[0.05, 0.02, -0.02]}>
      <meshStandardMaterial color="#2196f3" roughness={0.5} />
    </Box>
  </group>
);

/* ─────────────── HELPER: Wire Spool Holder ─────────────── */
const WireSpoolHolder: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <Box args={[0.25, 0.3, 0.1]} position={[0, 0.15, 0]}>
      <meshStandardMaterial color={METAL_DARK} roughness={0.3} metalness={0.8} />
    </Box>
    {/* Wire spools */}
    {[-0.06, 0.06].map((x, i) => (
      <Cylinder key={i} args={[0.04, 0.04, 0.06, 8]} position={[x, 0.22, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={['#f44336', '#4caf50'][i]} roughness={0.5} />
      </Cylinder>
    ))}
  </group>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN LAB ENVIRONMENT
   ═══════════════════════════════════════════════════════════════════ */
export const LabEnvironment: React.FC = () => {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;
  const halfCorW = CORRIDOR_W / 2;
  const [lightMode, setLightMode] = useState<'day' | 'evening' | 'night'>('day');

  // ═══ COLLISION REGISTRATION ═══
  // Register all major solid objects so VR player can't walk through them.
  useEffect(() => {
    // ── Walls ──
    CollisionRegistry.register('wall-back', boxFromCenter(0, ROOM_H / 2, -halfD, ROOM_W, ROOM_H, WALL_T));
    CollisionRegistry.register('wall-right', boxFromCenter(halfW, ROOM_H / 2, 0, WALL_T, ROOM_H, ROOM_D));
    CollisionRegistry.register('wall-left', boxFromCenter(-halfW, ROOM_H / 2, 0, WALL_T, ROOM_H, ROOM_D));
    // Front wall left section
    const frontLeftW = halfW - halfCorW - 0.25;
    CollisionRegistry.register('wall-front-L', boxFromCenter(-(halfW + halfCorW + 0.25) / 2, ROOM_H / 2, halfD, frontLeftW, ROOM_H, WALL_T));
    // Front wall right section
    CollisionRegistry.register('wall-front-R', boxFromCenter((halfW + halfCorW + 0.25) / 2, ROOM_H / 2, halfD, frontLeftW, ROOM_H, WALL_T));
    // Corridor walls
    CollisionRegistry.register('corridor-L', boxFromCenter(-halfCorW - 0.25, ROOM_H / 2, halfD + CORRIDOR_DEPTH / 2, WALL_T, ROOM_H, CORRIDOR_DEPTH));
    CollisionRegistry.register('corridor-R', boxFromCenter(halfCorW + 0.25, ROOM_H / 2, halfD + CORRIDOR_DEPTH / 2, WALL_T, ROOM_H, CORRIDOR_DEPTH));

    // ── Central experiment table (2.4 × 1.2 visual) ──
    // Because the table tilts 10 deg (Math.sin(10deg) * 1.0m width ≈ 0.17m vertical change),
    // we increase the collider height to encompass the tilted surface so the player doesn't clip into the high or low edges.
    CollisionRegistry.register('table-main', boxFromCenter(0, 0.375, 0, 2.2, 0.95, 1.0));

    // ── Side lab benches (2.0 x 0.8 visual) ──
    CollisionRegistry.register('bench-FL', boxFromCenter(-3.6, 0.375, 0, 1.8, 0.75, 0.6));
    CollisionRegistry.register('bench-FR', boxFromCenter(3.6, 0.375, 0, 1.8, 0.75, 0.6));
    CollisionRegistry.register('bench-BL', boxFromCenter(-3.6, 0.375, -2.5, 1.8, 0.75, 0.6));
    CollisionRegistry.register('bench-BC', boxFromCenter(0, 0.375, -2.5, 2.2, 0.75, 1.0));
    CollisionRegistry.register('bench-BR', boxFromCenter(3.6, 0.375, -2.5, 1.8, 0.75, 0.6));

    // ── Instructor desk ──
    CollisionRegistry.register('desk-instr', boxFromCenter(3.5, 0.375, 3.5, 1.3, 0.75, 0.7));

    // ── Storage cabinets ──
    CollisionRegistry.register('cabinet-1', boxFromCenter(halfW - 0.35, 0.9, -3.5, 0.45, 1.8, 0.9));
    CollisionRegistry.register('cabinet-2', boxFromCenter(halfW - 0.35, 0.9, -2.0, 0.45, 1.8, 0.9));

    // ── Shelf units ──
    CollisionRegistry.register('shelf-L', boxFromCenter(-halfW + 0.2, 0.7, -4.0, 0.3, 1.4, 0.8));
    CollisionRegistry.register('shelf-R', boxFromCenter(halfW - 0.2, 0.7, 0.5, 0.3, 1.4, 0.8));

    return () => {
      // Unregister all on unmount
      ['wall-back', 'wall-right', 'wall-left', 'wall-front-L', 'wall-front-R',
        'corridor-L', 'corridor-R', 'table-main',
        'bench-FL', 'bench-FR', 'bench-BL', 'bench-BC', 'bench-BR',
        'desk-instr', 'cabinet-1', 'cabinet-2', 'shelf-L', 'shelf-R',
      ].forEach(n => CollisionRegistry.unregister(n));
    };
  }, []); // Mount once — environment doesn't move

  // Memoize floor grid lines
  const floorLines = useMemo(() => {
    const lines: { key: string; pos: [number, number, number]; args: [number, number, number] }[] = [];
    const tileSize = 0.6;
    for (let i = 0; i < Math.floor(ROOM_W / tileSize); i++) {
      lines.push({
        key: `fx${i}`,
        pos: [-halfW + tileSize / 2 + i * tileSize, 0, 0],
        args: [0.004, 0.001, ROOM_D],
      });
    }
    for (let i = 0; i < Math.floor(ROOM_D / tileSize); i++) {
      lines.push({
        key: `fz${i}`,
        pos: [0, 0, -halfD + tileSize / 2 + i * tileSize],
        args: [ROOM_W, 0.001, 0.004],
      });
    }
    return lines;
  }, []);

  return (
    <>
      {/* ═══════ FLOOR — Light matte tile ═══════ */}
      <Plane args={[ROOM_W, ROOM_D]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.55} metalness={0.15} />
      </Plane>
      {/* Tile grid lines */}
      <group position={[0, 0.001, 0]}>
        {floorLines.map(l => (
          <Box key={l.key} args={l.args} position={l.pos}>
            <meshStandardMaterial color={FLOOR_LINE} />
          </Box>
        ))}
      </group>

      {/* Corridor floor extension */}
      <Plane
        args={[CORRIDOR_W + 0.5, CORRIDOR_DEPTH]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, halfD + CORRIDOR_DEPTH / 2]}
        receiveShadow
      >
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.85} metalness={0.08} />
      </Plane>

      {/* ═══════ CEILING ═══════ */}
      <Plane args={[ROOM_W, ROOM_D]} rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
      </Plane>
      {/* Corridor ceiling */}
      <Plane args={[CORRIDOR_W + 0.5, CORRIDOR_DEPTH]} rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, halfD + CORRIDOR_DEPTH / 2]}>
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
      </Plane>

      {/* ═══════ WALLS — Academic off-white ═══════ */}
      {/* Back wall */}
      <Box args={[ROOM_W, ROOM_H, WALL_T]} position={[0, ROOM_H / 2, -halfD]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Right wall */}
      <Box args={[WALL_T, ROOM_H, ROOM_D]} position={[halfW, ROOM_H / 2, 0]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Left wall — lower section (below windows) */}
      <Box args={[WALL_T, 0.9, ROOM_D]} position={[-halfW, 0.45, 0]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Left wall — upper section (above windows) */}
      <Box args={[WALL_T, 0.9, ROOM_D]} position={[-halfW, ROOM_H - 0.45, 0]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Left wall — pillars between windows */}
      {[-3.0, -0.5, 2.0].map((z, i) => (
        <Box key={`lwp${i}`} args={[WALL_T, ROOM_H, 0.5]} position={[-halfW, ROOM_H / 2, z]}>
          <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
        </Box>
      ))}

      {/* Front wall — with corridor opening */}
      {/* Left section of front wall */}
      <Box args={[(halfW - halfCorW - 0.25), ROOM_H, WALL_T]} position={[-(halfW + halfCorW + 0.25) / 2, ROOM_H / 2, halfD]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Right section of front wall  */}
      <Box args={[(halfW - halfCorW - 0.25), ROOM_H, WALL_T]} position={[(halfW + halfCorW + 0.25) / 2, ROOM_H / 2, halfD]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      {/* Door header removed so player can walk through without feeling claustrophobic */}

      {/* ═══════ CORRIDOR WALLS ═══════ */}
      <Box args={[WALL_T, ROOM_H, CORRIDOR_DEPTH]} position={[-halfCorW - 0.25, ROOM_H / 2, halfD + CORRIDOR_DEPTH / 2]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>
      <Box args={[WALL_T, ROOM_H, CORRIDOR_DEPTH]} position={[halfCorW + 0.25, ROOM_H / 2, halfD + CORRIDOR_DEPTH / 2]}>
        <meshStandardMaterial color={WALL_COLOR} roughness={0.85} metalness={0.03} />
      </Box>

      {/* ═══════ CORRIDOR — Lab Name Board ═══════ */}
      <group position={[0, 2.6, halfD + 0.01]}>
        {/* Board background */}
        <Box args={[2.2, 0.4, 0.03]}>
          <meshStandardMaterial color="#0d47a1" roughness={0.3} metalness={0.5} />
        </Box>
        {/* Board border */}
        <Box args={[2.26, 0.46, 0.02]} position={[0, 0, -0.01]}>
          <meshStandardMaterial color="#b0bec5" roughness={0.2} metalness={0.8} />
        </Box>
        {/* Lab name text */}
        <Text
          position={[0, 0, 0.025]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.0}
          font="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          Electronics & IoT Innovation Lab
        </Text>
      </group>

      {/* Corridor ceiling light */}
      <LEDPanel position={[0, ROOM_H - 0.05, halfD + CORRIDOR_DEPTH / 2]} width={0.8} depth={0.4} />

      {/* Corridor side glass window */}
      <group position={[halfCorW + 0.21, 1.6, halfD + CORRIDOR_DEPTH / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <Box args={[1.5, 1.0, 0.01]}>
          <meshStandardMaterial color="#87ceeb" transparent opacity={0.12} roughness={0.05} />
        </Box>
        <Box args={[1.56, 1.06, 0.04]} position={[0, 0, -0.02]}>
          <meshStandardMaterial color="#78909c" roughness={0.2} metalness={0.8} />
        </Box>
      </group>

      {/* ═══════ WINDOWS (Left wall — 3 large windows) ═══════ */}
      {/* 0.9m sill height + 1.2m height/2 = 1.5m center height */}
      <LabWindow position={[-halfW + 0.02, 1.5, -1.75]} rotation={[0, Math.PI / 2, 0]} width={2.0} height={1.2} />
      <LabWindow position={[-halfW + 0.02, 1.5, 0.75]} rotation={[0, Math.PI / 2, 0]} width={2.0} height={1.2} />
      <LabWindow position={[-halfW + 0.02, 1.5, 3.25]} rotation={[0, Math.PI / 2, 0]} width={1.5} height={1.2} />

      {/* ═══════ INTERACTIVE POSTERS (Back wall) ═══════ */}
      <InteractivePosters
        positions={[
          [-3.5, 1.8, -halfD + 0.09],
          [-1.5, 1.8, -halfD + 0.09],
          [3.5, 1.8, -halfD + 0.09],
        ]}
      />
      {/* Right wall */}
      <SafetyBoard position={[halfW - 0.08, 1.8, 3.0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* ═══════ DIGITAL WALL DISPLAY (Back wall center) ═══════ */}
      <group position={[1.0, 2.0, -halfD + 0.08]}>
        <Box args={[1.6, 0.9, 0.04]}>
          <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
        </Box>
        <Box args={[1.5, 0.84, 0.005]} position={[0, 0, 0.023]}>
          <meshStandardMaterial color="#0a1628" emissive="#0d47a1" emissiveIntensity={0.12} />
        </Box>
        {/* Screen content lines */}
        <Box args={[1.2, 0.015, 0.001]} position={[0, 0.3, 0.027]}>
          <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.8} />
        </Box>
        <Box args={[0.8, 0.015, 0.001]} position={[-0.2, 0.2, 0.027]}>
          <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.6} />
        </Box>
        <Box args={[1.0, 0.015, 0.001]} position={[0.1, 0.1, 0.027]}>
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5} />
        </Box>
      </group>

      {/* ═══════ CENTRAL EXPERIMENT TABLE (Main — 2.4m × 1.2m) ═══════ */}
      {/* Table at world origin, top surface at y=0.75m, tilted 10° toward user */}
      <group position={[0, 0, 0]}>
        {/* Tilted surface group: pivots at y=0.71 (top of legs), tilts +10° so far edge rises and near edge dips toward user */}
        <group position={[0, 0.71, 0]} rotation={[THREE.MathUtils.degToRad(10), 0, 0]}>
          {/* Tabletop — 0.04 thick (positioned relative to pivot) */}
          <Box args={[2.4, 0.04, 1.2]} position={[0, 0.02, 0]} receiveShadow castShadow>
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} metalness={0.05} />
          </Box>
          {/* Edge bevel trim */}
          <Box args={[2.44, 0.018, 1.24]} position={[0, -0.001, 0]}>
            <meshStandardMaterial color={METAL_LIGHT} roughness={0.2} metalness={0.9} />
          </Box>

          {/* Grid pattern on table surface */}
          <group position={[0, 0.041, 0]}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Box key={`tgx${i}`} args={[0.002, 0.001, 1.15]} position={[-1.0 + i * 0.25, 0, 0]}>
                <meshStandardMaterial color="#00897b" transparent opacity={0.25} />
              </Box>
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={`tgz${i}`} args={[2.35, 0.001, 0.002]} position={[0, 0, -0.5 + i * 0.25]}>
                <meshStandardMaterial color="#00897b" transparent opacity={0.25} />
              </Box>
            ))}
          </group>

          {/* Static items on the tilted surface */}
          <Notebook position={[0.9, 0.055, 0.35]} rotation={[0, 0.15, 0]} />
          <Pen position={[0.75, 0.055, 0.3]} />
          <ToolTray position={[-0.9, 0.055, 0.35]} />
          <PowerSupply position={[1.0, 0.055, -0.35]} />
        </group>

        {/* Legs — stay vertical (NOT inside tilted group) */}
        {[
          [1.1, 0.355, 0.5],
          [-1.1, 0.355, 0.5],
          [1.1, 0.355, -0.5],
          [-1.1, 0.355, -0.5],
        ].map((pos, i) => (
          <Box key={`mleg${i}`} args={[0.05, 0.71, 0.05]} position={pos as [number, number, number]}>
            <meshStandardMaterial color={METAL_DARK} roughness={0.15} metalness={0.95} />
          </Box>
        ))}
        {/* Cross braces */}
        <Box args={[2.2, 0.03, 0.03]} position={[0, 0.2, 0.5]}>
          <meshStandardMaterial color={METAL_DARK} roughness={0.2} metalness={0.9} />
        </Box>
        <Box args={[2.2, 0.03, 0.03]} position={[0, 0.2, -0.5]}>
          <meshStandardMaterial color={METAL_DARK} roughness={0.2} metalness={0.9} />
        </Box>

        {/* Table Spotlight for VR clarity */}
        <spotLight
          position={[0, 2.5, 0]}
          angle={0.6}
          penumbra={0.5}
          intensity={0.6}
          color="#ffffff"
          castShadow
          target={new THREE.Object3D()}
        />

        {/* Subtle shadow plane under table for grounding */}
        <Plane args={[2.6, 1.4]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <meshStandardMaterial color="#000000" transparent opacity={0.08} />
        </Plane>

        {/* LabMate AI Holographic Assistant */}
        <LabMateAI position={[0.35, 0.85, -0.3]} />
      </group>

      {/* ═══════ ADDITIONAL LAB BENCHES (1.5m Spacing Row Layout) ═══════ */}
      {/* ─── Lab Tables & Benches (side benches, NOT the central table) ─── */}
      <LabBench position={[-3.6, 0, 0]} />
      <SubtleDetails position={[-3.6, 0.77, 0]} rotation={[0, Math.PI / 4, 0]} />

      <LabBench position={[3.6, 0, 0]} />
      <SubtleDetails position={[3.6, 0.77, 0]} rotation={[0, -Math.PI / 6, 0]} />

      {/* Row 2 (Back Row) */}
      <LabBench position={[-3.6, 0, -2.5]} />
      <LabBench position={[0.0, 0, -2.5]} width={2.4} depth={1.2} /> {/* Matching main table dimensions for symmetry */}
      <SubtleDetails position={[0.5, 0.77, -2.3]} rotation={[0, Math.PI / 2, 0]} />
      <SubtleDetails position={[-0.5, 0.77, -2.5]} rotation={[0, -Math.PI / 4, 0]} />
      <LabBench position={[3.6, 0, -2.5]} />
      <SubtleDetails position={[3.6, 0.77, -2.5]} rotation={[0, Math.PI / 3, 0]} />

      {/* ═══════ STOOLS ═══════ */}
      {/* Main Table Stools */}
      <LabStool position={[0.6, 0, 0.8]} />
      <LabStool position={[-0.6, 0, 0.8]} />

      {/* Front Row Stools */}
      <LabStool position={[-3.6, 0, 0.6]} />
      <LabStool position={[3.6, 0, 0.6]} />

      {/* Back Row Stools */}
      <LabStool position={[-3.6, 0, -1.9]} />
      <LabStool position={[0.6, 0, -1.7]} />
      <LabStool position={[-0.6, 0, -1.7]} />
      <LabStool position={[3.6, 0, -1.9]} />

      {/* ═══════ INSTRUCTOR DESK (near entrance, right side) ═══════ */}
      <group position={[3.5, 0, 3.5]}>
        <Box args={[1.2, 0.74, 0.6]} position={[0, 0.37, 0]}>
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} metalness={0.05} />
        </Box>
        {/* Desktop surface */}
        <Box args={[1.24, 0.03, 0.64]} position={[0, 0.755, 0]}>
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} metalness={0.08} />
        </Box>
        {/* Instructor chair */}
        <LabStool position={[0, 0, -0.7]} />
        {/* Interactive Computer on instructor desk */}
        <InteractiveComputer position={[0, 0.77, 0.05]} />
      </group>

      {/* ═══════ INTERACTIVE DOOR (corridor exit) ═══════ */}
      <InteractiveDoor
        position={[0, 0, halfD + CORRIDOR_DEPTH]}
        rotation={[0, 0, 0]}
        doorWidth={CORRIDOR_W + 0.5} // slightly wider than corridor to sit "behind" the wall
        doorHeight={ROOM_H} // full height
      />

      {/* ═══════ CIRCUIT CHALLENGE BOARD (Right wall) ═══════ */}
      <CircuitChallenge
        position={[halfW - 0.07, 1.6, -1.0]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══════ LIGHT SWITCH (near corridor on front wall) ═══════ */}
      <group
        position={[halfCorW + 0.8, 1.2, halfD - 0.04]}
        onClick={() => setLightMode(m => m === 'day' ? 'evening' : m === 'evening' ? 'night' : 'day')}
      >
        <Box args={[0.08, 0.12, 0.03]}>
          <meshStandardMaterial color="#e0e0e0" roughness={0.3} metalness={0.2} />
        </Box>
        <Box args={[0.03, 0.04, 0.02]} position={[0, lightMode === 'day' ? 0.02 : lightMode === 'evening' ? 0 : -0.02, 0.02]}>
          <meshStandardMaterial
            color={lightMode === 'day' ? '#00e676' : lightMode === 'evening' ? '#ffa726' : '#ef5350'}
            emissive={lightMode === 'day' ? '#00e676' : lightMode === 'evening' ? '#ffa726' : '#ef5350'}
            emissiveIntensity={0.8}
          />
        </Box>
        <Text
          position={[0, -0.1, 0.02]}
          fontSize={0.02}
          color="#78909c"
          anchorX="center"
        >
          {lightMode.toUpperCase()}
        </Text>
      </group>

      {/* ═══════ STORAGE CABINETS ═══════ */}
      <StorageCabinet position={[halfW - 0.35, 0, -3.5]} rotation={[0, -Math.PI / 2, 0]} />
      <StorageCabinet position={[halfW - 0.35, 0, -2.0]} rotation={[0, -Math.PI / 2, 0]} />

      {/* ═══════ SHELVES ═══════ */}
      <ShelfUnit position={[-halfW + 0.2, 0, -4.0]} rotation={[0, Math.PI / 2, 0]} />
      <ShelfUnit position={[halfW - 0.2, 0, 0.5]} rotation={[0, -Math.PI / 2, 0]} />

      {/* ═══════ TOOL RACKS ═══════ */}
      <ToolRack position={[halfW - 0.08, 1.5, 2.0]} rotation={[0, -Math.PI / 2, 0]} />
      <ToolRack position={[-2.5, 1.5, -halfD + 0.08]} />

      {/* ═══════ WIRE SPOOL HOLDER ═══════ */}
      <WireSpoolHolder position={[-4.0, 0.91, -2.3]} />

      {/* ═══════ POWER OUTLETS ═══════ */}
      <PowerOutlet position={[-halfW + 0.06, 0.4, -1]} rotation={[0, Math.PI / 2, 0]} />
      <PowerOutlet position={[-halfW + 0.06, 0.4, 2]} rotation={[0, Math.PI / 2, 0]} />
      <PowerOutlet position={[halfW - 0.06, 0.4, -1]} rotation={[0, -Math.PI / 2, 0]} />
      <PowerOutlet position={[halfW - 0.06, 0.4, 1.5]} rotation={[0, -Math.PI / 2, 0]} />
      <PowerOutlet position={[1.0, 0.4, -halfD + 0.06]} />
      <PowerOutlet position={[-1.0, 0.4, -halfD + 0.06]} />

      {/* ═══════ CEILING LED PANELS ═══════ */}
      <LEDPanel position={[0, ROOM_H - 0.04, -1.0]} />
      <LEDPanel position={[-3, ROOM_H - 0.04, -1.0]} />
      <LEDPanel position={[3, ROOM_H - 0.04, -1.0]} />
      <LEDPanel position={[0, ROOM_H - 0.04, 2.0]} />
      <LEDPanel position={[-3, ROOM_H - 0.04, 2.0]} />
      <LEDPanel position={[3, ROOM_H - 0.04, 2.0]} />
      <LEDPanel position={[0, ROOM_H - 0.04, -3.5]} />
      <LEDPanel position={[3, ROOM_H - 0.04, -3.5]} />

      {/* ═══════ VENTILATION DUCTS ═══════ */}
      <VentDuct position={[-2.5, ROOM_H - 0.1, 0]} length={8} />
      <VentDuct position={[2.5, ROOM_H - 0.1, 0]} length={8} />

      {/* ═══════ Wall accent strip (subtle) ═══════ */}
      <Box args={[ROOM_W - 0.2, 0.015, 0.015]} position={[0, 1.0, -halfD + 0.06]}>
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.3} />
      </Box>

      {/* ═══════ VR-OPTIMIZED LIGHTING ═══════ */}
      {/* Ambient fill — adjusts with light mode */}
      <ambientLight
        intensity={lightMode === 'day' ? 0.5 : lightMode === 'evening' ? 0.25 : 0.08}
        color={lightMode === 'day' ? '#f0ece4' : lightMode === 'evening' ? '#ffe0b2' : '#1a237e'}
      />

      {/* Primary directional — sunlight */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={lightMode === 'day' ? 1.2 : lightMode === 'evening' ? 0.5 : 0.1}
        color={lightMode === 'day' ? '#fff8e7' : lightMode === 'evening' ? '#ffcc80' : '#90caf9'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.001}
      />

      {/* Fill light from opposite side — prevents dark PCBs */}
      <directionalLight
        position={[-5, 6, -5]}
        intensity={lightMode === 'day' ? 0.3 : lightMode === 'evening' ? 0.15 : 0.05}
        color={lightMode === 'day' ? '#e8eaf6' : lightMode === 'evening' ? '#ffccbc' : '#1a237e'}
      />

      {/* Hemisphere for subtle sky/ground color variation */}
      <hemisphereLight args={[
        lightMode === 'night' ? '#1a237e' : '#d4e5f7',
        lightMode === 'night' ? '#0d1b2a' : '#8d7b6a',
        lightMode === 'day' ? 0.25 : lightMode === 'evening' ? 0.15 : 0.05
      ]} />

      {/* Night mode accent glow */}
      {lightMode === 'night' && (
        <pointLight position={[0, 2.5, 0]} intensity={0.3} color="#00d2ff" distance={8} decay={2} />
      )}
    </>
  );
};

/* Export room dimensions for collision system */
export const LAB_DIMENSIONS = {
  ROOM_W,
  ROOM_D,
  ROOM_H,
  CORRIDOR_DEPTH,
  CORRIDOR_W,
  TABLE_CENTER_Z: 0,
} as const;
