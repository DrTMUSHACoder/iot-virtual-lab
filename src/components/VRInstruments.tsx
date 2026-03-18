
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLabStore } from '../store/useLabStore';

/*
 * Oscilloscope — VR probing tool that displays pin waveform.
 *
 * When placed near a pin, shows the voltage waveform on a small VR screen.
 * Uses a canvas texture updated each frame for the waveform display.
 */

const SCREEN_W = 256;
const SCREEN_H = 128;
const HISTORY_LENGTH = 200;

export const Oscilloscope: React.FC<{ position?: [number, number, number] }> = ({
    position = [0.7, 1.15, 0.3]
}) => {
    const pinVoltages = useLabStore(state => state.pinVoltages);
    const isSimulating = useLabStore(state => state.isSimulating);
    const [probedPin, setProbedPin] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);
    const historyRef = useRef<number[]>([]);

    // Create canvas for waveform rendering
    const canvas = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = SCREEN_W;
        c.height = SCREEN_H;
        canvasRef.current = c;
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter;
        textureRef.current = tex;
        return tex;
    }, []);

    // Auto-probe: pick the first active pin with non-zero voltage
    useFrame(() => {
        if (!isSimulating || !canvasRef.current || !textureRef.current) return;

        // Auto-select a pin to probe
        if (!probedPin || !pinVoltages[probedPin]) {
            const activePins = Object.entries(pinVoltages).filter(([, v]) => v > 0);
            if (activePins.length > 0) {
                setProbedPin(activePins[0][0]);
            }
        }

        // Update history
        const voltage = probedPin ? (pinVoltages[probedPin] || 0) : 0;
        historyRef.current.push(voltage);
        if (historyRef.current.length > HISTORY_LENGTH) {
            historyRef.current.shift();
        }

        // Draw waveform on canvas
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Grid lines
        ctx.strokeStyle = '#1a2332';
        ctx.lineWidth = 0.5;
        for (let y = 0; y < SCREEN_H; y += SCREEN_H / 5) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(SCREEN_W, y);
            ctx.stroke();
        }
        for (let x = 0; x < SCREEN_W; x += SCREEN_W / 8) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, SCREEN_H);
            ctx.stroke();
        }

        // Center line
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, SCREEN_H / 2);
        ctx.lineTo(SCREEN_W, SCREEN_H / 2);
        ctx.stroke();

        // Waveform
        const data = historyRef.current;
        if (data.length > 1) {
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 4;
            ctx.beginPath();

            const maxV = 5.5; // max voltage scale
            for (let i = 0; i < data.length; i++) {
                const x = (i / HISTORY_LENGTH) * SCREEN_W;
                const y = SCREEN_H - (data[i] / maxV) * (SCREEN_H - 10) - 5;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Labels
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px monospace';
        ctx.fillText(`V: ${voltage.toFixed(2)}V`, 4, 12);
        ctx.fillText(`Pin: ${probedPin || 'N/A'}`, 4, 24);

        // Scale labels
        ctx.fillStyle = '#4a5a6a';
        ctx.font = '8px monospace';
        ctx.fillText('5V', SCREEN_W - 18, 12);
        ctx.fillText('0V', SCREEN_W - 18, SCREEN_H - 4);

        textureRef.current.needsUpdate = true;
    });

    return (
        <group position={position}>
            {/* Body */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.18, 0.13, 0.04]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.005, 0.021]}>
                <planeGeometry args={[0.15, 0.09]} />
                <meshBasicMaterial map={canvas} />
            </mesh>
            {/* Bezel */}
            <mesh position={[0, 0.005, 0.0205]}>
                <planeGeometry args={[0.155, 0.095]} />
                <meshBasicMaterial color="#0a0e14" />
            </mesh>
            {/* Label */}
            <mesh position={[0, -0.055, 0.021]}>
                <planeGeometry args={[0.12, 0.015]} />
                <meshBasicMaterial color="#1a1a2e" />
            </mesh>
            {/* LED indicator */}
            <mesh position={[-0.07, -0.055, 0.021]}>
                <sphereGeometry args={[0.003, 8, 8]} />
                <meshStandardMaterial
                    color={isSimulating ? '#00ff88' : '#333'}
                    emissive={isSimulating ? '#00ff88' : '#000'}
                    emissiveIntensity={isSimulating ? 2 : 0}
                />
            </mesh>
        </group>
    );
};

/*
 * Multimeter — VR instrument that shows voltage, current, resistance.
 */

export const Multimeter: React.FC<{ position?: [number, number, number] }> = ({
    position = [0.9, 1.15, 0.3]
}) => {
    const pinVoltages = useLabStore(state => state.pinVoltages);
    const isSimulating = useLabStore(state => state.isSimulating);
    const [mode, setMode] = useState<'V' | 'A' | 'Ω'>('V');
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const canvas = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 96;
        canvasRef.current = c;
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        textureRef.current = tex;
        return tex;
    }, []);

    useFrame(() => {
        if (!canvasRef.current || !textureRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = '#c8d4a8';
        ctx.fillRect(0, 0, 128, 96);

        // Find highest voltage to display
        const voltages = Object.values(pinVoltages);
        const maxV = voltages.length > 0 ? Math.max(...voltages) : 0;

        let reading = '---';
        let unit = '';

        if (isSimulating) {
            switch (mode) {
                case 'V':
                    reading = maxV.toFixed(2);
                    unit = 'V DC';
                    break;
                case 'A':
                    // Approximate current: V/R (assume 220Ω typical)
                    reading = maxV > 0 ? (maxV / 220 * 1000).toFixed(1) : '0.0';
                    unit = 'mA';
                    break;
                case 'Ω':
                    reading = '220';
                    unit = 'Ω';
                    break;
            }
        }

        // LCD-style display
        ctx.fillStyle = '#2a3a1a';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(reading, 110, 42);

        ctx.font = '14px monospace';
        ctx.fillText(unit, 110, 62);

        // Mode indicator
        ctx.textAlign = 'left';
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#5a6a4a';
        ctx.fillText(`MODE: ${mode}`, 6, 82);

        textureRef.current.needsUpdate = true;
    });

    const cycleMode = () => {
        setMode(m => m === 'V' ? 'A' : m === 'A' ? 'Ω' : 'V');
    };

    return (
        <group position={position}>
            {/* Body — multimeter shape */}
            <mesh>
                <boxGeometry args={[0.08, 0.14, 0.03]} />
                <meshStandardMaterial color="#ffc107" metalness={0.1} roughness={0.8} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.025, 0.016]}>
                <planeGeometry args={[0.065, 0.05]} />
                <meshBasicMaterial map={canvas} />
            </mesh>
            {/* Dial/Mode button */}
            <mesh position={[0, -0.03, 0.016]} onClick={cycleMode}>
                <cylinderGeometry args={[0.012, 0.012, 0.005, 16]} />
                <meshStandardMaterial color="#333" metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Probe ports */}
            <mesh position={[-0.015, -0.06, 0.016]}>
                <cylinderGeometry args={[0.003, 0.003, 0.005, 8]} />
                <meshStandardMaterial color="#e74c3c" />
            </mesh>
            <mesh position={[0.015, -0.06, 0.016]}>
                <cylinderGeometry args={[0.003, 0.003, 0.005, 8]} />
                <meshStandardMaterial color="#2d3436" />
            </mesh>
            {/* LED */}
            <mesh position={[-0.025, 0.06, 0.016]}>
                <sphereGeometry args={[0.003, 8, 8]} />
                <meshStandardMaterial
                    color={isSimulating ? '#00ff88' : '#666'}
                    emissive={isSimulating ? '#00ff88' : '#000'}
                    emissiveIntensity={isSimulating ? 1.5 : 0}
                />
            </mesh>
        </group>
    );
};
