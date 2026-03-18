
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLabStore } from '../store/useLabStore';

/*
 * CircuitErrorOverlay — Floating 3D error messages near problematic components.
 *
 * Reads circuitErrors from the store and renders billboard warning panels
 * positioned near the offending component in 3D space.
 */

interface CircuitError {
    componentId: string;
    severity: 'error' | 'warning';
    message: string;
    suggestion: string;
}

export function useCircuitErrors(): CircuitError[] {
    const components = useLabStore(state => state.components);
    const wires = useLabStore(state => state.wires);
    const isSimulating = useLabStore(state => state.isSimulating);
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const refIdMap = useLabStore(state => state.refIdMap);

    return useMemo(() => {
        if (!isSimulating) return [];
        const errors: CircuitError[] = [];

        // ── 1. Check LEDs for reversed polarity / missing resistor ──
        const leds = components.filter(c => c.type === 'LED_LIGHT');
        for (const led of leds) {
            const ledWires = wires.filter(
                w => w.startComponentId === led.id || w.endComponentId === led.id
            );

            if (ledWires.length === 0) continue; // not connected yet

            // Check if LED has only 1 wire (needs 2)
            if (ledWires.length === 1) {
                errors.push({
                    componentId: led.id,
                    severity: 'warning',
                    message: 'LED has only one connection',
                    suggestion: 'Connect both the Anode (+) and Cathode (-) pins to complete the circuit.',
                });
            }

            // Check if any wire goes directly from a power pin to LED (no resistor)
            const directPowerWires = ledWires.filter(w => {
                const otherId = w.startComponentId === led.id ? w.endComponentId : w.startComponentId;
                const otherPin = w.startComponentId === led.id ? w.endPin : w.startPin;
                const otherComp = components.find(c => c.id === otherId);
                if (!otherComp) return false;

                // Check if the other end is a power source pin (5V, 3.3V, VIN)
                const powerPins = ['5V', '3V3', '3.3V', 'VIN', '+'];
                return powerPins.includes(otherPin) && (
                    otherComp.type === 'ARDUINO_UNO' ||
                    otherComp.type === 'RASPBERRY_PI' ||
                    otherComp.type === 'BATTERY'
                );
            });

            if (directPowerWires.length > 0) {
                // Check if there's a resistor in the LED's circuit path
                const hasResistorConnection = ledWires.some(w => {
                    const otherId = w.startComponentId === led.id ? w.endComponentId : w.startComponentId;
                    const otherComp = components.find(c => c.id === otherId);
                    return otherComp?.type === 'RESISTOR';
                });

                if (!hasResistorConnection) {
                    errors.push({
                        componentId: led.id,
                        severity: 'error',
                        message: 'LED connected to power without resistor!',
                        suggestion: 'Add a 220Ω-330Ω current-limiting resistor in series to protect the LED.',
                    });
                }
            }
        }

        // ── 2. Check for floating wires (one end disconnected) ──
        for (const wire of wires) {
            const startComp = components.find(c => c.id === wire.startComponentId);
            const endComp = components.find(c => c.id === wire.endComponentId);

            if (!startComp || !endComp) {
                errors.push({
                    componentId: wire.startComponentId || wire.endComponentId,
                    severity: 'warning',
                    message: 'Floating wire detected',
                    suggestion: 'This wire is connected to a missing component. Remove it or reconnect.',
                });
            }
        }

        // ── 3. Check resistors are actually connected to something ──
        const resistors = components.filter(c => c.type === 'RESISTOR');
        for (const res of resistors) {
            const resWires = wires.filter(
                w => w.startComponentId === res.id || w.endComponentId === res.id
            );
            if (resWires.length === 1) {
                errors.push({
                    componentId: res.id,
                    severity: 'warning',
                    message: 'Resistor has only one connection',
                    suggestion: 'Connect both terminals (P1 and P2) of the resistor for it to function properly.',
                });
            }
        }

        // ── 4. Cross-check against guided experiment wiring ──
        if (activeExperiment) {
            const missingWires = activeExperiment.wiring.filter(expected => {
                const expectedFromId = refIdMap[expected.startRefId];
                const expectedToId = refIdMap[expected.endRefId];

                return !wires.some(w =>
                    (w.startComponentId === expectedFromId && w.startPin === expected.startPin && w.endComponentId === expectedToId && w.endPin === expected.endPin) ||
                    (w.startComponentId === expectedToId && w.startPin === expected.endPin && w.endComponentId === expectedFromId && w.endPin === expected.startPin)
                );
            });

            if (missingWires.length > 0) {
                const rootComp = components.find(c => c.type === 'ARDUINO_UNO' || c.type === 'RASPBERRY_PI') || components[0];
                if (rootComp) {
                    errors.push({
                        componentId: rootComp.id,
                        severity: 'error',
                        message: 'Incomplete Circuit',
                        suggestion: `Missing ${missingWires.length} connection(s). Please follow the wiring guide steps carefully.`,
                    });
                }
            }
        }

        return errors;
    }, [components, wires, isSimulating, activeExperiment, refIdMap]);
}

/* ── 3D Error Billboard ── */

const ErrorBillboard: React.FC<{
    position: [number, number, number];
    message: string;
    suggestion: string;
    severity: 'error' | 'warning';
}> = ({ position, message: _message, suggestion: _suggestion, severity }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Billboard: always face the camera
    useFrame(({ camera }) => {
        if (groupRef.current) {
            groupRef.current.lookAt(camera.position);
        }
    });

    const color = severity === 'error' ? '#ef4444' : '#f59e0b';
    const bgColor = severity === 'error' ? '#1a0505' : '#1a1205';

    return (
        <group ref={groupRef} position={[position[0], position[1] + 0.06, position[2]]}>
            {/* Background panel */}
            <mesh position={[0, 0, -0.001]}>
                <planeGeometry args={[0.18, 0.06]} />
                <meshBasicMaterial
                    color={bgColor}
                    transparent
                    opacity={0.9}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Border */}
            <mesh position={[0, 0, -0.0005]}>
                <planeGeometry args={[0.182, 0.062]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Alert icon indicator — small glowing sphere */}
            <mesh position={[-0.08, 0.018, 0]}>
                <sphereGeometry args={[0.004, 8, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                />
            </mesh>
            {/* Warning glow */}
            <pointLight
                color={color}
                intensity={0.15}
                distance={0.08}
                decay={2}
                position={[0, 0, 0.01]}
            />
        </group>
    );
};

/* ── Main Overlay Component ── */
export const CircuitErrorOverlay: React.FC = () => {
    const errors = useCircuitErrors();
    const components = useLabStore(state => state.components);

    if (errors.length === 0) return null;

    return (
        <group>
            {errors.map((err, idx) => {
                const comp = components.find(c => c.id === err.componentId);
                if (!comp) return null;
                return (
                    <ErrorBillboard
                        key={`${err.componentId}-${idx}`}
                        position={[comp.position.x, comp.position.y, comp.position.z]}
                        message={err.message}
                        suggestion={err.suggestion}
                        severity={err.severity}
                    />
                );
            })}
        </group>
    );
};

/* ── 2D Error Panel for desktop UI ── */
export const CircuitErrorPanel: React.FC = () => {
    const errors = useCircuitErrors();

    if (errors.length === 0) return null;

    return (
        <div className="circuit-error-panel">
            <div className="error-panel-header">
                <span>⚠️ Circuit Issues ({errors.length})</span>
            </div>
            {errors.map((err, idx) => (
                <div key={idx} className={`error-item error-${err.severity}`}>
                    <div className="error-msg">
                        {err.severity === 'error' ? '🔴' : '🟡'} {err.message}
                    </div>
                    <div className="error-fix">💡 {err.suggestion}</div>
                </div>
            ))}
        </div>
    );
};
