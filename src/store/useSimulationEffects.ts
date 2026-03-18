/**
 * useSimulationEffects — Side-effect hook for simulation logic.
 *
 * Runs the deterministic 60Hz tick loop via Web Worker:
 *   1. Spawns simulation.worker.ts
 *   2. Sends circuit topology on sim start
 *   3. Receives TICK_UPDATE to render UI
 */

import { useEffect, useRef } from 'react';
import { useLabStore } from './useLabStore';
import type { WorkerMessage, WorkerResponse } from '../workers/simulation.worker';

export function useSimulationEffects() {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize Web Worker ONCE
        if (!workerRef.current) {
            workerRef.current = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
                type: 'module'
            });

            workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
                const msg = event.data;
                const store = useLabStore.getState();

                if (msg.type === 'TICK_UPDATE') {
                    // Update global UI state securely
                    store._setTickUpdate(msg.pinVoltages, msg.activeLEDs, msg.activeBuzzers, msg.activeDHT11s);
                } else if (msg.type === 'SERIAL_OUTPUT') {
                    store.addSerialLine(msg.char);
                } else if (msg.type === 'ERROR') {
                    store.setSimulationError(msg.message);
                }
            };
        }

        const unsub = useLabStore.subscribe((state, prevState) => {
            const { isSimulating, activeExperiment, components, wires, refIdMap } = state;

            // Handle Start/Stop Simulation
            if (isSimulating && !prevState.isSimulating) {
                // Kick off worker with current topology
                workerRef.current?.postMessage({
                    type: 'INIT_CIRCUIT',
                    components,
                    wires,
                    refIdMap,
                    experimentId: activeExperiment?.id
                } as WorkerMessage);

                // Print startup message
                if (activeExperiment) {
                    const id = activeExperiment.id;
                    if (id.startsWith('arduino-')) {
                        state.addSerialLine(`─── ${activeExperiment.title} (Worker: AVR8js) ───`);
                        state.addSerialLine(`Baud Rate: 9600`);
                    } else if (id.startsWith('rpi-')) {
                        state.addSerialLine(`─── ${activeExperiment.title} (Worker: JS Sim) ───`);
                    }
                }

                workerRef.current?.postMessage({ type: 'START_SIMULATION' } as WorkerMessage);
            }
            else if (!isSimulating && prevState.isSimulating) {
                workerRef.current?.postMessage({ type: 'STOP_SIMULATION' } as WorkerMessage);
            }

            // Forward user input signals (e.g., buttons, potentiometers)
            if (isSimulating) {
                // Find changed signals to avoid message spam
                for (const pinName in state.simulationSignals) {
                    if (state.simulationSignals[pinName] !== prevState.simulationSignals[pinName]) {
                        workerRef.current?.postMessage({
                            type: 'SET_USER_INPUT_SIGNAL',
                            pinName,
                            value: state.simulationSignals[pinName]
                        } as WorkerMessage);
                    }
                }
            }
        });

        return () => {
            unsub();
            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'STOP_SIMULATION' } as WorkerMessage);
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);
}
