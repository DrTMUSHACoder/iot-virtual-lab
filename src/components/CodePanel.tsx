import React from 'react';
import { useLabStore } from '../store/useLabStore';
import { ArduinoSimulator } from '../services/Simulator';
import { loadHex } from '../utils/hexParser';

const BLINK_HEX = `
:100000000C945C000C946E000C946E000C946E00CA
:100010000C946E000C946E000C946E000C946E00B8
:100020000C946E000C946E000C946E000C946E00A8
:100030000C946E000C946E000C946E000C946E0098
:100040000C946E000C946E000C946E000C946E0088
:100050000C946E000C946E000C946E000C946E0078
:100060000C946E000C946E0011241FBECFEFD8E048
:10007000DEBFCDBF11E0A0E0B1E0E8E4F1E002C015
:1000800005900D92A230B107D9F711E0A2E0B1E019
:1000900001C01D92A330B107E1F710E0C9E0D0E076
:1000A00003C02297FE010E949500C030D107C1F78A
:1000B00008951F920F920FB60F9211242F933F93B8
:1000C0008F939F93AF93BF93EF93FF930E94B4006A
:1000D000FF91EF91BF91AF919F918F913F912F9114
:1000E0000F900FBE0F901F90189528980895289A40
:1000F00008952F3F08F008952F5F08958F3F08F023
:1001000008958F5F08951F920F920FB60F921124EB
:100110008F939F930E9400009F918F910F900FBE76
:100120000F901F901895
:00000001FF
`;

const DEFAULT_CODE = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`;

export const CodePanel: React.FC = () => {
    const isSimulating = useLabStore(state => state.isSimulating);
    const setIsSimulating = useLabStore(state => state.setIsSimulating);
    const setSimulator = useLabStore(state => state.setSimulator);
    const setSignal = useLabStore(state => state.setSignal);
    const activeExperiment = useLabStore(state => state.activeExperiment);

    const code = activeExperiment?.code || DEFAULT_CODE;
    const lang = activeExperiment?.codeLanguage || 'cpp';
    const lines = code.split('\n');

    const handleRun = () => {
        if (isSimulating) {
            setIsSimulating(false);
            setSimulator(null);
            // Reset signals
            for (let i = 0; i < 20; i++) {
                setSignal(i.toString(), false);
            }
            return;
        }

        // Initialize simulator with Hex string
        // (In a real app, this would be an async compile step from the text editor)
        const flash = new Uint16Array(0x8000);
        loadHex(BLINK_HEX, flash);
        const sim = new ArduinoSimulator(flash);

        // Bind simulator GPIO changing to Zustand global state
        sim.onPinWrite((pin, value) => {
            setSignal(pin.toString(), value);
        });

        // Store simulator in global state and trigger simulation start
        setSimulator(sim);
        setIsSimulating(true);
    };

    return (
        <div className="code-panel glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Source Code</h2>
                <span style={{
                    background: lang === 'python' ? '#306998' : '#00599c',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {lang === 'python' ? '🐍 Python' : '⚡ C++'}
                </span>
            </div>
            <div className="code-editor">
                <pre style={{ margin: 0 }}>
                    {lines.map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ color: '#636e72', minWidth: '24px', textAlign: 'right', userSelect: 'none', fontSize: '11px' }}>{i + 1}</span>
                            <span>{line}</span>
                        </div>
                    ))}
                </pre>
            </div>
            <button
                className={`premium-btn ${isSimulating ? 'danger' : ''}`}
                onClick={handleRun}
            >
                {isSimulating ? 'Stop Simulation' : lang === 'python' ? 'Run on Pi (Simulated)' : 'Flash to Arduino'}
            </button>
        </div>
    );
};
