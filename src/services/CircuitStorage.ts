
import type { LabComponent, Wire } from '../types';

/*
 * CircuitStorage — Save, load, and export circuit designs.
 *
 * Uses localStorage for persistence and supports JSON file export/import.
 */

export interface CircuitSnapshot {
    id: string;
    name: string;
    timestamp: number;
    components: LabComponent[];
    wires: Wire[];
    experimentId?: string;
}

const STORAGE_KEY = 'vr-iot-lab-circuits';

/** Get all saved circuits from localStorage */
export function getSavedCircuits(): CircuitSnapshot[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/** Save a circuit to localStorage */
export function saveCircuit(snapshot: CircuitSnapshot): void {
    const existing = getSavedCircuits();
    // Replace if same ID, otherwise add
    const idx = existing.findIndex(s => s.id === snapshot.id);
    if (idx >= 0) {
        existing[idx] = snapshot;
    } else {
        existing.push(snapshot);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Delete a saved circuit */
export function deleteCircuit(id: string): void {
    const existing = getSavedCircuits().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Export circuit as downloadable JSON file */
export function exportCircuit(snapshot: CircuitSnapshot): void {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name.replace(/\s+/g, '_')}_${Date.now()}.vlab`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Import circuit from a .vlab JSON file */
export function importCircuit(file: File): Promise<CircuitSnapshot> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const snapshot = JSON.parse(text) as CircuitSnapshot;
                if (!snapshot.components || !snapshot.wires) {
                    reject(new Error('Invalid circuit file format'));
                    return;
                }
                resolve(snapshot);
            } catch (err) {
                reject(new Error('Failed to parse circuit file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/** Create a snapshot from current lab state */
export function createSnapshot(
    name: string,
    components: LabComponent[],
    wires: Wire[],
    experimentId?: string
): CircuitSnapshot {
    return {
        id: `circuit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        timestamp: Date.now(),
        components: components.map(c => ({ ...c })),
        wires: wires.map(w => ({ ...w })),
        experimentId,
    };
}
