/**
 * useLabStore — Zustand global store for the Virtual IoT Lab.
 *
 * Architecture rule:
 *   "Store initializes object. Object owns itself after mount."
 *   3D transforms live in useRef. Store is a PERSISTENCE SNAPSHOT only.
 *   updateComponentPosition is called ONLY on drag-end, NOT every frame.
 */

import { create } from 'zustand';
import type { Experiment, LabComponent, LabComponentType, Vec3, Wire } from '../types';
import { evaluateCircuit, validateCircuitTopology } from '../services/ElectricalEngine';
import { ArduinoSimulator } from '../services/Simulator';
import { getBreadboardHoleLocalPosition } from '../components/Breadboard';

/* ─── State Interface ─── */
export interface LabStore {
    // ── Component Slice ──
    components: LabComponent[];
    addComponent: (type: LabComponentType, position?: Vec3, value?: string) => void;
    removeComponent: (id: string) => void;
    updateComponentPosition: (id: string, position: Vec3) => void;
    updateComponentRotation: (id: string, rotation: Vec3) => void;
    resetAllOrientations: () => void;
    resetComponentOrientation: (id: string) => void;
    toggleComponentLock: (id: string) => void;

    // ── Wire Slice ──
    wires: Wire[];
    addWire: (wire: Omit<Wire, 'id'>) => void;
    removeWire: (id: string) => void;
    pendingWireStart: { componentId: string; pinName: string; position: Vec3 } | null;
    setPendingWire: (wire: { componentId: string; pinName: string; position: Vec3 } | null) => void;

    // ── Simulation Slice ──
    isSimulating: boolean;
    setIsSimulating: (active: boolean) => void;
    simulationSignals: Record<string, boolean>;
    setSignal: (pin: string, value: boolean) => void;
    simulationError: string | null;
    setSimulationError: (error: string | null) => void;
    pinVoltages: Record<string, number>;

    // MCU Simulator Reference
    simulator: ArduinoSimulator | null;
    setSimulator: (sim: ArduinoSimulator | null) => void;

    // ── Experiment Slice ──
    activeExperiment: Experiment | null;
    currentStep: number;
    loadExperiment: (experiment: Experiment) => void;
    nextStep: () => void;
    prevStep: () => void;
    connectionFeedback: 'none' | 'correct' | 'incorrect';
    refIdMap: Record<string, string>;
    completedSteps: Set<number>;
    validateConnection: (wire: Omit<Wire, 'id'>) => boolean;
    getExpectedPinsForStep: () => { fromComponentId: string; fromPin: string; toComponentId: string; toPin: string } | null;

    // ── UI Slice ──
    focusedComponentId: string | null;
    setFocusedComponentId: (id: string | null) => void;
    interactionMode: 'MOVE' | 'WIRE' | 'INSPECT' | 'SCAN';
    setInteractionMode: (mode: 'MOVE' | 'WIRE' | 'INSPECT' | 'SCAN') => void;
    showLabels: boolean;
    setShowLabels: (v: boolean) => void;
    serialOutput: string[];
    addSerialLine: (line: string) => void;
    clearSerialOutput: () => void;
    showQuiz: boolean;
    setShowQuiz: (show: boolean) => void;
    showCurrentFlow: boolean;
    setShowCurrentFlow: (show: boolean) => void;
    showPerformance: boolean;
    setShowPerformance: (show: boolean) => void;
    showNotebook: boolean;
    setShowNotebook: (show: boolean) => void;
    quizScores: Record<string, { score: number; total: number }>;
    setQuizScore: (experimentId: string, score: number, total: number) => void;

    // ── Lab Reset ──
    clearLab: () => void;

    // ── Internal: simulation tick (called from React effect) ──
    _recomputeCircuit: () => void;
    _setTickUpdate: (voltages: Record<string, number>, leds: string[], buzzers: string[], dht11s: string[]) => void;
    _setSimulationSignals: (signals: Record<string, boolean>) => void;
    _setConnectionFeedback: (fb: 'none' | 'correct' | 'incorrect') => void;
    _setCurrentStep: (step: number) => void;
    _setCompletedSteps: (steps: Set<number>) => void;
    _setSerialOutput: (lines: string[]) => void;
    _setIsSimulatingInternal: (active: boolean) => void;
}

export const useLabStore = create<LabStore>((set, get) => ({
    // ════════════════════════════════════════════════════
    // COMPONENT SLICE
    // ════════════════════════════════════════════════════
    components: [],

    addComponent: (type, position = { x: 0, y: 0.8, z: 0 }, value?) => {
        const newComponent: LabComponent = {
            id: self.crypto.randomUUID(),
            type,
            position,
            rotation: { x: 0, y: 0, z: 0 },
            value,
        };
        set(state => ({ components: [...state.components, newComponent] }));
    },

    removeComponent: (id) => {
        set(state => ({
            components: state.components.filter(c => c.id !== id),
            wires: state.wires.filter(w => w.startComponentId !== id && w.endComponentId !== id),
        }));
    },

    updateComponentPosition: (id, position) => {
        set(state => ({
            components: state.components.map(c => c.id === id ? { ...c, position } : c),
        }));
    },

    updateComponentRotation: (id, rotation) => {
        set(state => ({
            components: state.components.map(c => c.id === id ? { ...c, rotation } : c),
        }));
    },

    resetAllOrientations: () => {
        set(state => ({
            components: state.components.map(c => ({
                ...c,
                rotation: { x: 0, y: 0, z: 0 },
                position: { ...c.position, y: 0.8 },
                locked: false,
            })),
        }));
    },

    resetComponentOrientation: (id) => {
        set(state => ({
            components: state.components.map(c =>
                c.id === id
                    ? { ...c, rotation: { x: 0, y: 0, z: 0 }, position: { ...c.position, y: 0.8 } }
                    : c
            ),
        }));
    },

    toggleComponentLock: (id) => {
        set(state => ({
            components: state.components.map(c =>
                c.id === id ? { ...c, locked: !c.locked } : c
            ),
        }));
    },

    // ════════════════════════════════════════════════════
    // WIRE SLICE
    // ════════════════════════════════════════════════════
    wires: [],

    addWire: (wire) => {
        if (wire.startComponentId === wire.endComponentId) return;
        set(state => ({
            wires: [...state.wires, { ...wire, id: self.crypto.randomUUID() }],
        }));
    },

    removeWire: (id) => {
        set(state => ({ wires: state.wires.filter(w => w.id !== id) }));
    },

    pendingWireStart: null,
    setPendingWire: (wire) => set({ pendingWireStart: wire }),

    // ════════════════════════════════════════════════════
    // SIMULATION SLICE
    // ════════════════════════════════════════════════════
    isSimulating: false,

    setIsSimulating: (active) => {
        const state = get();
        if (active && state.activeExperiment) {
            const result = validateCircuitTopology(
                state.activeExperiment.id,
                state.components,
                state.wires,
                state.refIdMap,
            );
            if (!result.valid) {
                set({
                    simulationError: result.error || 'Circuit validation failed.',
                    isSimulating: false,
                });
                return;
            }
        }
        set({ simulationError: null, isSimulating: active });
    },

    simulator: null,
    setSimulator: (sim: ArduinoSimulator | null) => set({ simulator: sim }),

    simulationSignals: {},
    setSignal: (pin, value) => {
        set(state => ({
            simulationSignals: { ...state.simulationSignals, [pin]: value },
        }));
    },

    simulationError: null,
    setSimulationError: (error) => set({ simulationError: error }),

    pinVoltages: {},

    _recomputeCircuit: () => {
        const state = get();
        const result = evaluateCircuit(
            state.components,
            state.wires,
            state.simulationSignals,
            state.isSimulating,
        );
        set({ pinVoltages: result.voltages });
    },

    _setTickUpdate: (voltages, leds, buzzers, _dht11s) => {
        // ── DIAGNOSTIC ──
        if (Object.keys(voltages).length > 0 || leds.length > 0) {
            console.log(`[STORE _setTickUpdate] voltageKeys=${Object.keys(voltages).length} activeLEDs=[${leds.join(',')}]`);
        }

        set(state => {
            // Update models inside LabComponent array to match active states
            const newComponents = state.components.map(c => {
                if (c.type === 'LED_LIGHT') {
                    return { ...c, value: leds.includes(c.id) ? 'ON' : 'OFF' };
                }
                if (c.type === 'BUZZER') {
                    return { ...c, value: buzzers.includes(c.id) ? 'ON' : 'OFF' };
                }
                // DHT11 doesn't have a visible 'ON' state in the model, but we can track it here
                return c;
            });

            return {
                pinVoltages: voltages,
                components: newComponents
            };
        });
    },

    _setSimulationSignals: (signals) => set({ simulationSignals: signals }),
    _setIsSimulatingInternal: (active) => set({ isSimulating: active }),

    // ════════════════════════════════════════════════════
    // EXPERIMENT SLICE
    // ════════════════════════════════════════════════════
    activeExperiment: null,
    currentStep: 0,
    connectionFeedback: 'none' as const,
    refIdMap: {},
    completedSteps: new Set<number>(),

    loadExperiment: (experiment) => {
        // ── Safety: reset all interaction state before swap ──
        // Prevents stale refs, detached objects, and VR blank screen
        set({
            pendingWireStart: null,
            interactionMode: 'MOVE',
            isSimulating: false,
            simulationError: null,
        });

        const newRefIdMap: Record<string, string> = {};

        // Pass 1: generate all UI IDs
        const baseComponents: LabComponent[] = experiment.components.map(ec => {
            const id = `exp-${ec.refId}-${self.crypto.randomUUID().slice(0, 8)}`;
            newRefIdMap[ec.refId] = id;
            return {
                id,
                type: ec.type,
                position: ec.position || { x: 0, y: 0, z: 0 },
                rotation: ec.rotation || { x: 0, y: 0, z: 0 },
                value: ec.value,
            };
        });

        // Pass 2: resolve placements
        const newComponents = baseComponents.map((comp, idx) => {
            const ec = experiment.components[idx];
            if (ec.placement) {
                if (ec.placement.type === 'breadboard') {
                    const bbId = newRefIdMap[ec.placement.refId];
                    const bb = baseComponents.find(c => c.id === bbId);
                    if (bb && ec.placement.holes.length > 0) {
                        let sx = 0, sy = 0, sz = 0, count = 0;
                        for (const h of ec.placement.holes) {
                            const p = getBreadboardHoleLocalPosition(h);
                            if (p) { sx += p.x; sy += p.y; sz += p.z; count++; }
                        }
                        if (count > 0) {
                            comp.position = {
                                x: bb.position.x + (sx / count),
                                y: bb.position.y + (sy / count),
                                z: bb.position.z + (sz / count),
                            };
                            // Component meshes need their origin explicitly atop the 10mm board so legs penetrate down
                            comp.position.y += 0.015;
                        }
                    }

                    // Assign resolved placement back to LabComponent for electrical engine
                    comp.placement = {
                        type: 'breadboard',
                        refId: bbId,
                        holes: [...ec.placement.holes]
                    };
                } else if (ec.placement.type === 'world') {
                    comp.position = { ...ec.placement.position };
                    if (ec.placement.rotation) {
                        comp.rotation = { ...ec.placement.rotation };
                    }
                }
            }
            return comp;
        });

        set({
            components: newComponents,
            wires: [],
            simulationSignals: {},
            focusedComponentId: null,
            pendingWireStart: null,
            isSimulating: false,
            currentStep: 0,
            connectionFeedback: 'none' as const,
            completedSteps: new Set<number>(),
            serialOutput: [],
            refIdMap: newRefIdMap,
            activeExperiment: experiment,
            interactionMode: 'WIRE',
        });
    },

    nextStep: () => {
        const state = get();
        if (state.activeExperiment && state.currentStep < state.activeExperiment.steps.length - 1) {
            set({ currentStep: state.currentStep + 1, connectionFeedback: 'none' as const });
        }
    },

    prevStep: () => {
        const state = get();
        if (state.currentStep > 0) {
            set({ currentStep: state.currentStep - 1, connectionFeedback: 'none' as const });
        }
    },

    getExpectedPinsForStep: () => {
        const state = get();
        if (!state.activeExperiment) return null;
        const s = state.activeExperiment.steps[state.currentStep];
        if (!s?.expectedConnection) return null;

        const ec = s.expectedConnection;
        const fromCId = state.refIdMap[ec.fromRefId];
        const toCId = state.refIdMap[ec.toRefId];
        if (!fromCId || !toCId) return null;

        return {
            fromComponentId: fromCId,
            fromPin: ec.fromPin,
            toComponentId: toCId,
            toPin: ec.toPin,
        };
    },

    validateConnection: (wire) => {
        const state = get();
        const expected = state.getExpectedPinsForStep();
        if (!expected) return true;

        const forwardMatch =
            wire.startComponentId === expected.fromComponentId &&
            wire.startPin === expected.fromPin &&
            wire.endComponentId === expected.toComponentId &&
            wire.endPin === expected.toPin;

        const reverseMatch =
            wire.startComponentId === expected.toComponentId &&
            wire.startPin === expected.toPin &&
            wire.endComponentId === expected.fromComponentId &&
            wire.endPin === expected.fromPin;

        if (forwardMatch || reverseMatch) {
            import('../services/AudioService').then(({ AudioService }) => AudioService.playSuccess());

            const newCompleted = new Set(state.completedSteps);
            newCompleted.add(state.currentStep);
            set({ connectionFeedback: 'correct' as const, completedSteps: newCompleted });

            // Auto-advance after delay
            setTimeout(() => {
                const current = get();
                if (current.activeExperiment && current.currentStep < current.activeExperiment.steps.length - 1) {
                    set({ currentStep: current.currentStep + 1, connectionFeedback: 'none' as const });
                }
            }, 1200);

            return true;
        } else {
            import('../services/AudioService').then(({ AudioService }) => AudioService.playError());
            set({ connectionFeedback: 'incorrect' as const });
            setTimeout(() => set({ connectionFeedback: 'none' as const }), 2000);
            return false;
        }
    },

    _setConnectionFeedback: (fb) => set({ connectionFeedback: fb }),
    _setCurrentStep: (step) => set({ currentStep: step }),
    _setCompletedSteps: (steps) => set({ completedSteps: steps }),

    // ════════════════════════════════════════════════════
    // UI SLICE
    // ════════════════════════════════════════════════════
    focusedComponentId: null,
    setFocusedComponentId: (id) => set({ focusedComponentId: id }),

    interactionMode: 'MOVE',
    setInteractionMode: (mode) => set({ interactionMode: mode }),

    showLabels: false,
    setShowLabels: (v) => set({ showLabels: v }),

    serialOutput: [],
    addSerialLine: (line) => {
        set(state => ({
            serialOutput: [...state.serialOutput.slice(-50), line],
        }));
    },
    clearSerialOutput: () => set({ serialOutput: [] }),
    _setSerialOutput: (lines) => set({ serialOutput: lines }),

    showQuiz: false,
    setShowQuiz: (show) => set({ showQuiz: show }),

    showCurrentFlow: false,
    setShowCurrentFlow: (show) => set({ showCurrentFlow: show }),

    showPerformance: false,
    setShowPerformance: (show) => set({ showPerformance: show }),

    showNotebook: false,
    setShowNotebook: (show) => set({ showNotebook: show }),

    quizScores: {},
    setQuizScore: (experimentId, score, total) => {
        set(state => ({
            quizScores: { ...state.quizScores, [experimentId]: { score, total } },
        }));
    },

    // ════════════════════════════════════════════════════
    // CLEAR LAB
    // ════════════════════════════════════════════════════
    clearLab: () => {
        set({
            components: [],
            wires: [],
            simulationSignals: {},
            focusedComponentId: null,
            interactionMode: 'MOVE',
            pendingWireStart: null,
            isSimulating: false,
            activeExperiment: null,
            currentStep: 0,
            connectionFeedback: 'none' as const,
            refIdMap: {},
            completedSteps: new Set<number>(),
            serialOutput: [],
            simulationError: null,
            pinVoltages: {},
            showQuiz: false,
        });
    },
}));
