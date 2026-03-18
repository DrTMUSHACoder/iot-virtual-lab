import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useLabStore } from '../../store/useLabStore';
import { VR3DPanel, VR3DButton, VR3DTextLine } from '../VR3DPanel';
import { EXPERIMENTS } from '../../data/experiments';

/* ─── VR EXPERIMENT LIST ─── */
export const VRExperimentList3D: React.FC = () => {
    const loadExperiment = useLabStore(state => state.loadExperiment);
    const lineH = 0.065;
    return (
        <VR3DPanel
            title="Experiments"
            width={1.2}
            height={0.15 + EXPERIMENTS.length * lineH}
            borderColor="#00d2ff"
        >
            {EXPERIMENTS.map((exp, i) => (
                <VR3DButton
                    key={exp.id}
                    label={`${exp.title} (${exp.category})`}
                    icon={exp.icon}
                    position={[0, -i * lineH, 0]}
                    width={1.1}
                    height={0.055}
                    onClick={() => loadExperiment(exp)}
                />
            ))}
        </VR3DPanel>
    );
};

/* ─── VR DASHBOARD ─── */
export const VRDashboard3D: React.FC = () => {
    const isSimulating = useLabStore(state => state.isSimulating);
    const setIsSimulating = useLabStore(state => state.setIsSimulating);
    const interactionMode = useLabStore(state => state.interactionMode);
    const setInteractionMode = useLabStore(state => state.setInteractionMode);
    const pendingWireStart = useLabStore(state => state.pendingWireStart);
    const setPendingWire = useLabStore(state => state.setPendingWire);

    const { player } = useXR();

    const handleTeleportOutside = () => {
        if (player) {
            // Teleport outside to the campus road facing the building
            player.position.set(-15, 0, 15);
            player.rotation.set(0, -Math.PI / 4, 0);
        }
    };

    const handleTeleportLab = () => {
        if (player) {
            // Teleport back to spawn
            player.position.set(0, 0, 2.8);
            player.rotation.set(0, Math.PI, 0);
        }
    };

    const extraH = pendingWireStart ? 0.08 : 0;

    return (
        <VR3DPanel
            title="Lab Control"
            width={0.65}
            height={0.5 + extraH}
            borderColor="#00d2ff"
        >
            <VR3DButton
                label={isSimulating ? 'STOP SIM' : 'START SIM'}
                position={[0, 0, 0]}
                width={0.5}
                height={0.06}
                onClick={() => setIsSimulating(!isSimulating)}
                active={isSimulating}
                color={isSimulating ? '#dc2626' : '#16a34a'}
            />
            <VR3DButton
                label={interactionMode === 'WIRE' ? 'WIRING ON' : 'WIRING OFF'}
                position={[0, -0.08, 0]}
                width={0.5}
                height={0.06}
                onClick={() => setInteractionMode(interactionMode === 'WIRE' ? 'MOVE' : 'WIRE')}
                active={interactionMode === 'WIRE'}
                color="#2563eb"
            />
            <VR3DButton
                label={interactionMode === 'SCAN' ? 'SCANNING' : 'Ask LabMate'}
                position={[0, -0.16, 0]}
                width={0.5}
                height={0.06}
                onClick={() => setInteractionMode(interactionMode === 'SCAN' ? 'MOVE' : 'SCAN')}
                active={interactionMode === 'SCAN'}
                color="#ca8a04"
            />
            {/* Quick Navigation / Teleport Links */}
            <VR3DButton
                label="Teleport Outside"
                position={[-0.13, -0.24, 0]}
                width={0.24}
                height={0.05}
                onClick={handleTeleportOutside}
                color="#0d9488"
            />
            <VR3DButton
                label="Teleport Lab"
                position={[0.13, -0.24, 0]}
                width={0.24}
                height={0.05}
                onClick={handleTeleportLab}
                color="#2563eb"
            />

            {/* Cancel Wire */}
            {pendingWireStart && (
                <VR3DButton
                    label="Cancel Wire"
                    position={[0, -0.32, 0]}
                    width={0.5}
                    height={0.06}
                    onClick={() => { setPendingWire(null); setInteractionMode('MOVE'); }}
                    color="#dc2626"
                />
            )}
        </VR3DPanel>
    );
};

/* ─── VR DEBUG PANEL ─── */
export const VRDebugPanel3D: React.FC = () => {
    const { controllers } = useXR();

    // We update strings every frame via refs to avoid re-rendering Text components constantly
    const lTextRef = useRef<any>(null);
    const rTextRef = useRef<any>(null);
    const infoRef = useRef<any>(null);

    // ✅ FIX: Look up controllers INSIDE useFrame so references are always fresh
    useFrame(() => {
        const lc = controllers.find(c => c?.inputSource?.handedness === 'left') ?? controllers[0];
        const rc = controllers.find(c => c?.inputSource?.handedness === 'right') ?? controllers[1];

        if (lTextRef.current) {
            const axes = lc?.inputSource?.gamepad?.axes;
            const btns = lc?.inputSource?.gamepad?.buttons;
            const hand = lc?.inputSource?.handedness ?? 'idx0';
            lTextRef.current.text = `L[${hand}] Axes:\n[${axes ? Array.from(axes).map(a => a.toFixed(2)).join(', ') : 'none'}]\nBtns: ${btns ? btns.map((b, i) => b.pressed ? i : '').filter(Boolean).join(',') || 'none' : 'none'}`;
        }
        if (rTextRef.current) {
            const axes = rc?.inputSource?.gamepad?.axes;
            const btns = rc?.inputSource?.gamepad?.buttons;
            const hand = rc?.inputSource?.handedness ?? 'idx1';
            rTextRef.current.text = `R[${hand}] Axes:\n[${axes ? Array.from(axes).map(a => a.toFixed(2)).join(', ') : 'none'}]\nBtns: ${btns ? btns.map((b, i) => b.pressed ? i : '').filter(Boolean).join(',') || 'none' : 'none'}`;
        }
        if (infoRef.current) {
            infoRef.current.text = `Controllers: ${controllers.length}`;
        }
    });

    return (
        <VR3DPanel title="Debug: Gamepad" width={0.7} height={0.35} borderColor="#f59e0b">
            <Text position={[0, 0.11, 0.01]} fontSize={0.018} color="#f59e0b" anchorX="center" ref={infoRef}>
                Controllers: ...
            </Text>
            <Text position={[-0.30, 0.04, 0.01]} fontSize={0.018} color="#00ffcc" anchorX="left" ref={lTextRef}>
                Left: Waiting...
            </Text>
            <Text position={[-0.30, -0.07, 0.01]} fontSize={0.018} color="#f43f5e" anchorX="left" ref={rTextRef}>
                Right: Waiting...
            </Text>
        </VR3DPanel>
    );
};

/* ─── VR CODE PANEL (with thumbstick scroll) ─── */
const VISIBLE_LINES = 16;
const SCROLL_SPEED = 8; // lines per second

export const VRCodePanel3D: React.FC = () => {
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const { controllers } = useXR();
    const scrollOffset = useRef(0);

    const defaultCode = `void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}`;
    const code = activeExperiment?.code || defaultCode;
    const allLines = code.split('\n');
    const lang = activeExperiment?.codeLanguage || 'cpp';
    const maxScroll = Math.max(0, allLines.length - VISIBLE_LINES);

    // Thumbstick scroll on right controller Y axis
    // ✅ FIX: controller lookup inside useFrame for fresh references
    useFrame((_, delta) => {
        const right = controllers.find(c => c?.inputSource?.handedness === 'right') ?? controllers[1];
        const gp = right?.inputSource?.gamepad;
        if (gp) {
            const y = gp.axes[3] ?? gp.axes[1] ?? 0;
            if (Math.abs(y) > 0.3) {
                scrollOffset.current = Math.max(0, Math.min(maxScroll,
                    scrollOffset.current + y * SCROLL_SPEED * delta
                ));
            }
        }
    });

    const startLine = Math.floor(scrollOffset.current);
    const lines = allLines.slice(startLine, startLine + VISIBLE_LINES);

    return (
        <VR3DPanel
            title={lang === 'python' ? 'Python Code' : 'C++ Source'}
            width={1.6}
            height={0.12 + VISIBLE_LINES * 0.035}
            borderColor="#00bcd4"
        >
            {lines.map((line, i) => (
                <group key={startLine + i} position={[-0.72, -i * 0.032, 0]}>
                    <Text
                        position={[0, 0, 0]}
                        fontSize={0.024}
                        color="#636e72"
                        anchorX="left"
                        anchorY="middle"
                    >
                        {String(startLine + i + 1).padStart(2, ' ')}
                    </Text>
                    <Text
                        position={[0.07, 0, 0]}
                        fontSize={0.024}
                        color="#00e676"
                        anchorX="left"
                        anchorY="middle"
                        maxWidth={1.4}
                    >
                        {line}
                    </Text>
                </group>
            ))}
            {/* Scroll indicator */}
            {maxScroll > 0 && (
                <VR3DTextLine
                    text={`↕ ${startLine + 1}–${Math.min(startLine + VISIBLE_LINES, allLines.length)} of ${allLines.length}`}
                    position={[0.6, 0.03, 0]}
                    fontSize={0.020}
                    color="#636e72"
                    maxWidth={0.4}
                />
            )}
        </VR3DPanel>
    );
};

/* ─── VR SERIAL MONITOR ─── */
export const VRSerialMonitor3D: React.FC = () => {
    const serialOutput = useLabStore(state => state.serialOutput);
    const isSimulating = useLabStore(state => state.isSimulating);
    const lastLines = serialOutput.slice(-10);

    return (
        <VR3DPanel
            title="Serial Monitor"
            width={0.9}
            height={0.5}
            borderColor="#00e676"
        >
            <VR3DTextLine
                text={isSimulating ? '● CONNECTED  9600 baud' : '○ IDLE'}
                position={[-0.38, 0.02, 0]}
                fontSize={0.024}
                color={isSimulating ? '#00e676' : '#636e72'}
                maxWidth={0.8}
            />

            {lastLines.length === 0 ? (
                <VR3DTextLine
                    text={isSimulating ? 'Waiting for serial data...' : 'Start simulation to see output'}
                    position={[0, -0.08, 0]}
                    fontSize={0.024}
                    color="#636e72"
                    maxWidth={0.8}
                    anchorX="center"
                />
            ) : (
                lastLines.map((line, i) => (
                    <VR3DTextLine
                        key={i}
                        text={`${String(serialOutput.length - lastLines.length + i + 1).padStart(3, ' ')}│ ${line}`}
                        position={[-0.38, -0.04 - i * 0.032, 0]}
                        fontSize={0.022}
                        color={line.startsWith('[ERROR]') ? '#ef4444' : line.startsWith('[WARN]') ? '#f59e0b' : '#00e676'}
                        maxWidth={0.8}
                    />
                ))
            )}
        </VR3DPanel>
    );
};

/* ─── VR GUIDED EXPERIMENT PANEL ─── */
export const VRWiringGuide3D: React.FC = () => {
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const currentStep = useLabStore(state => state.currentStep);
    const nextStep = useLabStore(state => state.nextStep);
    const prevStep = useLabStore(state => state.prevStep);
    const isSimulating = useLabStore(state => state.isSimulating);
    const setIsSimulating = useLabStore(state => state.setIsSimulating);

    const title = activeExperiment ? `${activeExperiment.icon} ${activeExperiment.title}` : 'Wiring Guide';
    const steps = activeExperiment?.steps || [];
    const step = steps[currentStep];

    const hasPrev = currentStep > 0;
    const hasNext = currentStep < steps.length - 1;

    return (
        <VR3DPanel
            title={title}
            width={0.9}
            height={0.4}
            borderColor="#00d2ff"
        >
            {steps.length === 0 ? (
                <VR3DTextLine
                    text="Load an experiment to see the wiring guide."
                    position={[0, -0.05, 0]}
                    fontSize={0.024}
                    color="#636e72"
                    maxWidth={0.8}
                    anchorX="center"
                />
            ) : (
                <group position={[0, -0.05, 0]}>
                    <VR3DTextLine
                        text={`Step ${currentStep + 1} of ${steps.length}`}
                        position={[0, 0, 0]}
                        fontSize={0.020}
                        color="#00d2ff"
                        maxWidth={0.8}
                        anchorX="center"
                    />

                    {/* Main Step Description */}
                    <VR3DTextLine
                        text={step.title}
                        position={[0, -0.05, 0]}
                        fontSize={0.026}
                        color="#f8fafc"
                        maxWidth={0.8}
                        anchorX="center"
                    />

                    <VR3DTextLine
                        text={step.description}
                        position={[0, -0.12, 0]}
                        fontSize={0.020}
                        color="#94a3b8"
                        maxWidth={0.8}
                        anchorX="center"
                    />

                    {/* Navigation Buttons */}
                    <group position={[0, -0.22, 0]}>
                        {hasPrev && (
                            <VR3DButton
                                label="◀ Prev"
                                position={[-0.25, 0, 0]}
                                width={0.25}
                                height={0.06}
                                onClick={prevStep}
                                color="#1e293b"
                            />
                        )}

                        {step.expectedConnection ? (
                            <VR3DTextLine
                                text="🔌 Waiting for connection..."
                                position={[0.25, 0, 0]}
                                fontSize={0.02}
                                color="#f59e0b"
                                anchorX="center"
                            />
                        ) : hasNext ? (
                            <VR3DButton
                                label="Next ▶"
                                position={[0.25, 0, 0]}
                                width={0.25}
                                height={0.06}
                                onClick={nextStep}
                                color="#1e293b"
                            />
                        ) : (
                            <VR3DButton
                                label={isSimulating ? '⏹ STOP SIM' : '🚀 RUN SIMULATION'}
                                position={[0.25, 0, 0]}
                                width={0.25}
                                height={0.06}
                                onClick={() => setIsSimulating(!isSimulating)}
                                active={isSimulating}
                                color={isSimulating ? '#ef4444' : '#00e676'}
                                textColor="#1e293b"
                            />
                        )}
                    </group>
                </group>
            )}
        </VR3DPanel>
    );
};
/* ─── VR CONTROL GUIDE ───
 * Floating panel that always show users the VR control scheme.
 * Mounted left of the VR toolbox so it's always in view.
 */
export const VRControlGuide3D: React.FC = () => {
    const controls = [
        { icon: '🎯', label: 'Trigger → Grab component' },
        { icon: '🔌', label: 'Tap pin → Start wire' },
        { icon: '✅', label: 'Tap 2nd pin → Complete' },
        { icon: '❌', label: 'Menu btn → Cancel' },
        { icon: '🕹', label: 'L-Stick → Walk' },
        { icon: '🔄', label: 'R-Stick → Turn' },
    ];
    const lineH = 0.038;
    const panelH = 0.12 + controls.length * lineH;

    return (
        <VR3DPanel
            title="📶 VR Controls"
            width={0.48}
            height={panelH}
            borderColor="#a78bfa"
        >
            {controls.map((ctrl, i) => (
                <group key={i} position={[-0.18, -i * lineH, 0]}>
                    <VR3DTextLine
                        text={`${ctrl.icon}  ${ctrl.label}`}
                        position={[0, 0, 0]}
                        fontSize={0.024}
                        color={i === 0 ? '#00ffcc' : i <= 2 ? '#60a5fa' : '#94a3b8'}
                        maxWidth={0.42}
                    />
                </group>
            ))}
        </VR3DPanel>
    );
};
