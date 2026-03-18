import React, { useState, useCallback, useMemo } from 'react';
import {
  Play, Square, Plug, Code2, Tag, Activity, BrainCircuit, RefreshCw,
  Lock, Unlock, RotateCcw, Save, Download, Trophy, Package, Cpu,
  Battery, Lightbulb, Bell, Settings, RefreshCcw, Power, Thermometer,
  SlidersHorizontal, Ruler, Sun, Wind, MonitorSmartphone, Hash, Zap,
  Search, Laptop, MonitorDown, DoorOpen
} from 'lucide-react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { VRButton, XR, Controllers, Hands, useXR } from '@react-three/xr';
import { OrbitControls, Loader, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { LabEnvironment } from './components/LabEnvironment';
import { Wire } from './components/Wire';
import { useLabStore } from './store/useLabStore';
import { useSimulationEffects } from './store/useSimulationEffects';
import { getComponentRenderer } from './services/ComponentRegistry';
import { CodePanel } from './components/CodePanel';
import { SerialMonitor } from './components/SerialMonitor';
import { DraggableControl } from './components/DraggableControl';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { LabNotebook } from './components/LabNotebook';

import { InteractionController } from './components/InteractionController';
import { CircuitDiagram } from './components/CircuitDiagram';
import { ExperimentSelector } from './components/ExperimentSelector';
import { StudentEntry } from './components/StudentEntry';
import type { StudentSession } from './components/StudentEntry';
import { VRLocomotion } from './components/VRLocomotion';
import { DesktopMirror } from './components/DesktopMirror';
import { OutdoorEnvironment } from './components/OutdoorEnvironment';
import { AmbientAudio } from './components/AmbientAudio';
import {
  VRExperimentList3D,
  VRDashboard3D,
  VRCodePanel3D,
  VRSerialMonitor3D,
  VRWiringGuide3D,
  VRControlGuide3D,
  VRDebugPanel3D,
} from './components/vr/VRPanels';
import { VR3DPanel, VR3DButton } from './components/VR3DPanel';
import { QuizPanel } from './components/QuizPanel';
import { CurrentFlowViz } from './components/CurrentFlowViz';
import { CircuitErrorOverlay, CircuitErrorPanel } from './components/CircuitErrorOverlay';
import { Oscilloscope, Multimeter } from './components/VRInstruments';
import { AchievementToast, AchievementPanel, ACHIEVEMENTS, unlockAchievement } from './components/AchievementSystem';
import { createSnapshot, saveCircuit, exportCircuit } from './services/CircuitStorage';
import type { Achievement } from './components/AchievementSystem';
import type { LabComponentType } from './types';
import './App.css';

/* ── DESKTOP wire preview (mouse-based) ── */
const WirePreview: React.FC = () => {
  const pendingWireStart = useLabStore(state => state.pendingWireStart);
  const interactionMode = useLabStore(state => state.interactionMode);
  const { camera } = useThree();
  const { isPresenting } = useXR();
  const [currentPos, setCurrentPos] = useState<[number, number, number]>([0, 0, 0]);

  useFrame((state) => {
    // In XR the XRWirePreview handles updates — skip mouse logic
    if (isPresenting) return;
    if (interactionMode !== 'WIRE' || !pendingWireStart || !state.mouse) return;
    const vector = new THREE.Vector3(state.mouse.x, state.mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    if (Math.abs(dir.y) < 0.001) return;
    const pinHeight = 0.03;
    const distance = (pinHeight - camera.position.y) / dir.y;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    setCurrentPos([pos.x, Math.max(pos.y, 0.765), pos.z]);
  });

  if (isPresenting || interactionMode !== 'WIRE' || !pendingWireStart) return null;

  const startComp = useLabStore.getState().components.find(c => c.id === pendingWireStart.componentId);
  if (!startComp) return null;

  const startX = startComp.position.x + pendingWireStart.position.x;
  const startY = startComp.position.y + pendingWireStart.position.y;
  const startZ = startComp.position.z + pendingWireStart.position.z;

  return (
    <Wire
      start={[startX, startY, startZ]}
      end={currentPos}
      color="#00d2ff"
    />
  );
};

/* ── XR wire preview — follows dominant controller world position ── */
const XRWirePreview: React.FC = () => {
  const pendingWireStart = useLabStore(state => state.pendingWireStart);
  const { controllers, isPresenting } = useXR();
  const [end, setEnd] = useState<[number, number, number]>([0, 0, 0]);
  const temp = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!isPresenting || !pendingWireStart) return;
    // Prefer right hand, fall back to any controller
    const ctrl = controllers.find(c => c?.inputSource?.handedness === 'right') ?? controllers[0];
    if (!ctrl?.controller) return;
    ctrl.controller.getWorldPosition(temp);
    setEnd([temp.x, temp.y, temp.z]);
  });

  if (!isPresenting || !pendingWireStart) return null;

  const startComp = useLabStore.getState().components.find(c => c.id === pendingWireStart.componentId);
  if (!startComp) return null;

  const startX = startComp.position.x + pendingWireStart.position.x;
  const startY = startComp.position.y + pendingWireStart.position.y;
  const startZ = startComp.position.z + pendingWireStart.position.z;

  return (
    <Wire
      start={[startX, startY, startZ]}
      end={end}
      color="#ff00cc"
    />
  );
};



/* STEP GUIDE PANEL */
const StepGuide: React.FC = () => {
  const activeExperiment = useLabStore(state => state.activeExperiment);
  const currentStep = useLabStore(state => state.currentStep);
  const nextStep = useLabStore(state => state.nextStep);
  const prevStep = useLabStore(state => state.prevStep);
  const connectionFeedback = useLabStore(state => state.connectionFeedback);
  const completedSteps = useLabStore(state => state.completedSteps);
  const [collapsed, setCollapsed] = useState(false);

  if (!activeExperiment) return null;
  const step = activeExperiment.steps[currentStep];
  const isWiringStep = !!step.expectedConnection;
  const isStepDone = completedSteps.has(currentStep);
  const totalCompleted = [...completedSteps].length;

  return (
    <div className={`step-guide ${collapsed ? 'collapsed' : ''}`}>
      <div className="step-guide-header">
        <span className="step-badge">{activeExperiment.title}</span>
        <span className="step-counter">Step {currentStep + 1} / {activeExperiment.steps.length} · {totalCompleted} done</span>
        <button className="step-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>
      <div className="step-progress-bar">
        <div className="step-progress-fill" style={{ width: `${((currentStep + 1) / activeExperiment.steps.length) * 100}%` }} />
      </div>

      {/* Connection feedback toast */}
      {connectionFeedback === 'correct' && (
        <div className="feedback-toast feedback-correct">Correct connection!</div>
      )}
      {connectionFeedback === 'incorrect' && (
        <div className="feedback-toast feedback-incorrect">Wrong connection — try again</div>
      )}

      <div className="step-content">
        <h4>{step.title}</h4>
        <p>{step.description}</p>
        {isWiringStep && !isStepDone && activeExperiment.difficulty !== 'Advanced' && (
          <p className="step-hint">{step.hint || 'Connect the highlighted pins to proceed.'}</p>
        )}
        {isStepDone && isWiringStep && (
          <p className="step-done">Connection verified</p>
        )}
      </div>
      <div className="step-nav">
        <button className="step-nav-btn" onClick={prevStep} disabled={currentStep === 0}>← Prev</button>
        <button
          className="step-nav-btn"
          onClick={nextStep}
          disabled={currentStep === activeExperiment.steps.length - 1 || (isWiringStep && !isStepDone)}
        >
          {isWiringStep && !isStepDone ? 'Connect First' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

/* ── UI OVERLAY ── */
const UI: React.FC<{
  showVRUI: boolean;
  setShowVRUI: (v: boolean) => void;
  session: StudentSession;
  onEndSession: () => void;
}> = ({ showVRUI, setShowVRUI, session, onEndSession }) => {
  const addComponent = useLabStore(state => state.addComponent);
  const clearLab = useLabStore(state => state.clearLab);
  const interactionMode = useLabStore(state => state.interactionMode);
  const setInteractionMode = useLabStore(state => state.setInteractionMode);
  const isSimulating = useLabStore(state => state.isSimulating);
  const setIsSimulating = useLabStore(state => state.setIsSimulating);
  const simulationError = useLabStore(state => state.simulationError);
  const setSimulationError = useLabStore(state => state.setSimulationError);
  const activeExperiment = useLabStore(state => state.activeExperiment);
  const currentStep = useLabStore(state => state.currentStep);
  const showLabels = useLabStore(state => state.showLabels);
  const setShowLabels = useLabStore(state => state.setShowLabels);
  const resetAllOrientations = useLabStore(state => state.resetAllOrientations);
  const resetComponentOrientation = useLabStore(state => state.resetComponentOrientation);
  const toggleComponentLock = useLabStore(state => state.toggleComponentLock);
  const focusedComponentId = useLabStore(state => state.focusedComponentId);
  const components = useLabStore(state => state.components);

  const [showModal, setShowModal] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [showSerial, setShowSerial] = useState(false);
  const [showExperiments, setShowExperiments] = useState(false);
  const [showToolbox, setShowToolbox] = useState(false);
  const showQuiz = useLabStore(state => state.showQuiz);
  const setShowQuiz = useLabStore(state => state.setShowQuiz);
  const showCurrentFlow = useLabStore(state => state.showCurrentFlow);
  const setShowCurrentFlow = useLabStore(state => state.setShowCurrentFlow);
  const setQuizScore = useLabStore(state => state.setQuizScore);
  const wires = useLabStore(state => state.wires);
  const [showAchievements, setShowAchievements] = useState(false);
  const showPerformance = useLabStore(state => state.showPerformance);
  const setShowPerformance = useLabStore(state => state.setShowPerformance);
  const showNotebook = useLabStore(state => state.showNotebook);
  const setShowNotebook = useLabStore(state => state.setShowNotebook);
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);
  const connectionFeedback = useLabStore(state => state.connectionFeedback);

  // LabMate AI — Speak experiment steps (event-driven, throttled)
  React.useEffect(() => {
    import('./services/VoiceService').then(({ VoiceService }) => {
      if (activeExperiment && activeExperiment.steps[currentStep]) {
        const step = activeExperiment.steps[currentStep];
        VoiceService.speak(`Step ${currentStep + 1}. ${step.title}. ${step.description}`);
      } else {
        VoiceService.stop();
      }
    });
  }, [activeExperiment, currentStep]);

  // LabMate AI — Warn on wrong connections
  React.useEffect(() => {
    if (connectionFeedback === 'incorrect') {
      import('./services/VoiceService').then(({ VoiceService }) => {
        VoiceService.warn('That connection appears incorrect. Check your wiring and try again.');
      });
    }
  }, [connectionFeedback]);

  // Achievement: first circuit completion
  React.useEffect(() => {
    if (isSimulating && activeExperiment) {
      const isNew = unlockAchievement('first-circuit');
      if (isNew) {
        const a = ACHIEVEMENTS.find(x => x.id === 'first-circuit');
        if (a) setToastAchievement(a);
      }
    }
  }, [isSimulating, activeExperiment]);

  // Achievement: current flow used
  React.useEffect(() => {
    if (showCurrentFlow) {
      const isNew = unlockAchievement('flow-master');
      if (isNew) {
        const a = ACHIEVEMENTS.find(x => x.id === 'flow-master');
        if (a) setToastAchievement(a);
      }
    }
  }, [showCurrentFlow]);

  const handleSaveCircuit = () => {
    const name = activeExperiment ? activeExperiment.title : `Circuit ${Date.now()}`;
    const snapshot = createSnapshot(name, components, wires, activeExperiment?.id);
    saveCircuit(snapshot);
    const isNew = unlockAchievement('saver');
    if (isNew) {
      const a = ACHIEVEMENTS.find(x => x.id === 'saver');
      if (a) setToastAchievement(a);
    }
  };

  const handleExportCircuit = () => {
    const name = activeExperiment ? activeExperiment.title : `Circuit`;
    const snapshot = createSnapshot(name, components, wires, activeExperiment?.id);
    exportCircuit(snapshot);
  };

  const standardResistors = ["100", "220", "330", "470", "1k", "2.2k", "4.7k", "10k", "100k"];

  const handleAdd = (type: LabComponentType, value?: string) => {
    addComponent(type, { x: (Math.random() - 0.5) * 0.5, y: 0.765, z: (Math.random() - 0.5) * 0.3 }, value);
    setShowToolbox(false);
  };

  return (
    <div className="ui-overlay">
      {/* ═══ SLIM HEADER BAR ═══ */}
      <header className="lab-header-v2">
        <div className="header-left">
          <div className="lab-brand">
            <span className="brand-icon">🔬</span>
            <span className="brand-text">IoT Lab</span>
          </div>
          <div className="student-badge">
            <span className="student-name">{session.name}</span>
            <span className="student-roll">{session.rollNumber}</span>
          </div>
        </div>

        <div className="header-center">
          <button className="header-action-btn experiments-btn" onClick={() => setShowExperiments(true)}>
            <span className="hab-icon">📚</span>
            <span className="hab-label">Experiments</span>
          </button>
          <button className={`header-action-btn ${showToolbox ? 'active' : ''}`} onClick={() => setShowToolbox(!showToolbox)}>
            <span className="hab-icon">🧰</span>
            <span className="hab-label">Components</span>
          </button>
          <button className="header-action-btn" onClick={clearLab}>
            <span className="hab-icon">🔄</span>
            <span className="hab-label">Reset</span>
          </button>
        </div>

        <div className="header-right">
          <div className="mode-toggle">
            <button className={`mode-btn ${!showVRUI ? 'active' : ''}`} onClick={() => setShowVRUI(false)}><Laptop size={18} /></button>
            <button className={`mode-btn ${showVRUI ? 'active' : ''}`} onClick={() => setShowVRUI(true)}><MonitorDown size={18} /></button>
          </div>
          <button className="end-session-btn" onClick={onEndSession}>
            <DoorOpen size={16} /> <span>End</span>
          </button>
        </div>
      </header>

      {/* ═══ COMPONENT TOOLBOX (Floating Panel) ═══ */}
      {showToolbox && (
        <>
          <div className="toolbox-backdrop" onClick={() => setShowToolbox(false)} />
          <div className="component-toolbox">
            <div className="toolbox-header">
              <h3>📦 Component Toolbox</h3>
              <button className="toolbox-close" onClick={() => setShowToolbox(false)}>✕</button>
            </div>

            <div className="toolbox-category">
              <div className="category-label">🖥 Boards & Power</div>
              <div className="category-grid">
                <button className="comp-btn" onClick={() => handleAdd('ARDUINO_UNO')}>
                  <span className="comp-icon"><Cpu size={24} /></span>
                  <span className="comp-name">Arduino UNO</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('RASPBERRY_PI')}>
                  <span className="comp-icon"><Package size={24} /></span>
                  <span className="comp-name">Raspberry Pi</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('BREADBOARD')}>
                  <span className="comp-icon"><Hash size={24} /></span>
                  <span className="comp-name">Breadboard</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('BATTERY')}>
                  <span className="comp-icon"><Battery size={24} /></span>
                  <span className="comp-name">Battery 9V</span>
                </button>
              </div>
            </div>

            <div className="toolbox-category">
              <div className="category-label">💡 Outputs</div>
              <div className="category-grid">
                <button className="comp-btn" onClick={() => handleAdd('LED_LIGHT')}>
                  <span className="comp-icon"><Lightbulb size={24} /></span>
                  <span className="comp-name">LED 5mm</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('BUZZER')}>
                  <span className="comp-icon"><Bell size={24} /></span>
                  <span className="comp-name">Buzzer</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('SERVO_MOTOR')}>
                  <span className="comp-icon"><Settings size={24} /></span>
                  <span className="comp-name">Servo SG90</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('DC_MOTOR')}>
                  <span className="comp-icon"><RefreshCcw size={24} /></span>
                  <span className="comp-name">DC Motor</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('RELAY')}>
                  <span className="comp-icon"><Power size={24} /></span>
                  <span className="comp-name">Relay</span>
                </button>
              </div>
            </div>

            <div className="toolbox-category">
              <div className="category-label">📡 Sensors & Inputs</div>
              <div className="category-grid">
                <button className="comp-btn" onClick={() => handleAdd('DHT11_SENSOR')}>
                  <span className="comp-icon"><Thermometer size={24} /></span>
                  <span className="comp-name">DHT11</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('POTENTIOMETER')}>
                  <span className="comp-icon"><SlidersHorizontal size={24} /></span>
                  <span className="comp-name">Potentiometer</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('SWITCH')}>
                  <span className="comp-icon"><Power size={24} /></span>
                  <span className="comp-name">Push Button</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('ULTRASONIC_SENSOR')}>
                  <span className="comp-icon"><Ruler size={24} /></span>
                  <span className="comp-name">HC-SR04</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('LIGHT_SENSOR')}>
                  <span className="comp-icon"><Sun size={24} /></span>
                  <span className="comp-name">LDR Sensor</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('GAS_SENSOR')}>
                  <span className="comp-icon"><Wind size={24} /></span>
                  <span className="comp-name">Gas (MQ)</span>
                </button>
              </div>
            </div>

            <div className="toolbox-category">
              <div className="category-label">📺 Displays</div>
              <div className="category-grid">
                <button className="comp-btn" onClick={() => handleAdd('LCD1602')}>
                  <span className="comp-icon"><MonitorSmartphone size={24} /></span>
                  <span className="comp-name">LCD 16×2</span>
                </button>
                <button className="comp-btn" onClick={() => handleAdd('SEVEN_SEGMENT')}>
                  <span className="comp-icon"><Hash size={24} /></span>
                  <span className="comp-name">7-Segment</span>
                </button>
              </div>
            </div>

            <div className="toolbox-category">
              <div className="category-label">🔧 Passive Components</div>
              <div className="category-grid resistor-grid">
                {standardResistors.map(val => (
                  <button key={val} className="comp-btn comp-btn-sm" onClick={() => handleAdd('RESISTOR', val)}>
                    <span className="comp-icon"><Zap size={16} /></span>
                    <span className="comp-name">{val}Ω</span>
                  </button>
                ))}
                <button className="comp-btn comp-btn-sm" onClick={() => handleAdd('CAPACITOR', '100uF')}>
                  <span className="comp-icon"><Battery size={16} /></span>
                  <span className="comp-name">100µF</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EXPERIMENT INFO BAR */}
      {activeExperiment && (
        <div className="experiment-info-bar">
          <span>{activeExperiment.icon} <strong>{activeExperiment.title}</strong></span>
          <span className="exp-info-cat">{activeExperiment.category} · {activeExperiment.difficulty}</span>
          <span className="exp-info-parts">{activeExperiment.components.length} parts · {activeExperiment.wiring.length} wires</span>
        </div>
      )}

      {/* LEARNING OBJECTIVE BAR */}
      {activeExperiment?.learning && (
        <div className="learning-bar">
          <span className="learning-concept" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> {activeExperiment.learning.concept}
          </span>
          <span className="learning-divider" />
          <span className="learning-objective">{activeExperiment.learning.objective}</span>
        </div>
      )}

      {/* MINI GUIDE */}
      <div className="mini-guide-card" onClick={() => setShowModal(true)}>
        <CircuitDiagram />
        <p style={{ fontSize: '10px', color: '#00d2ff', marginTop: '5px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          Click for Guide <Search size={12} />
        </p>
      </div>

      {/* CONTROL GUIDE */}
      <div className="control-guide">
        Move: <b>Drag</b><br />
        Rot: <b>Shift+Drag</b><br />
        Fix: <b>Right-Click</b>
      </div>

      {/* STEP GUIDE */}
      <StepGuide />

      {/* SIMULATION ERROR TOAST */}
      {simulationError && (
        <div className="simulation-error-toast">
          <div className="sim-err-icon" style={{ color: '#d32f2f', display: 'flex' }}><Zap size={24} /></div>
          <div className="sim-err-body">
            <strong>Simulation Blocked</strong>
            <p>{simulationError}</p>
          </div>
          <button className="sim-err-close" onClick={() => setSimulationError(null)}>✕</button>
        </div>
      )}

      {/* ═══ CONTROLS REFERENCE ═══ */}
      <div className="controls-hint">
        <div className="controls-hint-title">⌨ Controls</div>
        <div className="controls-hint-row"><b>Drag</b> — Move component</div>
        <div className="controls-hint-row"><b>Shift + Drag</b> — Rotate X/Y</div>
        <div className="controls-hint-row"><b>Alt + Drag</b> — Rotate Z</div>
        <div className="controls-hint-row"><b>Right-click</b> — Reset orientation</div>
        <div className="controls-hint-row"><b>Hover pin</b> — Show pin name</div>
        <div className="controls-hint-row"><b>Scroll</b> — Zoom in/out</div>
      </div>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      <div className="bottom-bar">
        <button className={`bar-btn ${isSimulating ? 'bar-btn-active bar-btn-sim' : ''}`} onClick={() => { setIsSimulating(!isSimulating); setShowToolbox(false); }}>
          <span className="bar-icon">{isSimulating ? <Square size={20} /> : <Play size={20} />}</span>
          <span className="bar-label">{isSimulating ? 'Stop' : 'Simulate'}</span>
        </button>
        <button className={`bar-btn ${interactionMode === 'WIRE' ? 'bar-btn-active bar-btn-wire' : ''}`} onClick={() => { setInteractionMode(interactionMode === 'WIRE' ? 'MOVE' : 'WIRE'); setShowToolbox(false); }}>
          <span className="bar-icon"><Plug size={20} /></span>
          <span className="bar-label">{interactionMode === 'WIRE' ? 'Wiring ON' : 'Wire'}</span>
        </button>
        <button className={`bar-btn ${showProgram ? 'bar-btn-active' : ''}`} onClick={() => { setShowProgram(!showProgram); setShowToolbox(false); }}>
          <span className="bar-icon"><Code2 size={20} /></span>
          <span className="bar-label">Code</span>
        </button>
        <button className={`bar-btn ${showLabels ? 'bar-btn-active bar-btn-labels' : ''}`} onClick={() => { setShowLabels(!showLabels); setShowToolbox(false); }}>
          <span className="bar-icon"><Tag size={20} /></span>
          <span className="bar-label">{showLabels ? 'Labels ON' : 'Labels'}</span>
        </button>
        <button className={`bar-btn ${showSerial ? 'bar-btn-active bar-btn-serial' : ''}`} onClick={() => { setShowSerial(!showSerial); setShowToolbox(false); }}>
          <span className="bar-icon"><Activity size={20} /></span>
          <span className="bar-label">Serial</span>
        </button>
        <button className={`bar-btn ${showCurrentFlow ? 'bar-btn-active bar-btn-flow' : ''}`} onClick={() => { setShowCurrentFlow(!showCurrentFlow); setShowToolbox(false); }}>
          <span className="bar-icon"><Zap size={20} /></span>
          <span className="bar-label">{showCurrentFlow ? 'Flow ON' : 'Current'}</span>
        </button>
        {activeExperiment?.quiz && activeExperiment.quiz.length > 0 && (
          <button className={`bar-btn ${showQuiz ? 'bar-btn-active' : ''}`} onClick={() => { setShowQuiz(!showQuiz); setShowToolbox(false); }}>
            <span className="bar-icon"><BrainCircuit size={20} /></span>
            <span className="bar-label">Quiz</span>
          </button>
        )}
        <button className="bar-btn" onClick={() => { resetAllOrientations(); setShowToolbox(false); }}>
          <span className="bar-icon"><RefreshCw size={20} /></span>
          <span className="bar-label">Reset All</span>
        </button>
        {focusedComponentId && (
          <button
            className={`bar-btn ${components.find(c => c.id === focusedComponentId)?.locked ? 'bar-btn-active' : ''}`}
            onClick={() => toggleComponentLock(focusedComponentId)}
          >
            <span className="bar-icon">{components.find(c => c.id === focusedComponentId)?.locked ? <Lock size={20} /> : <Unlock size={20} />}</span>
            <span className="bar-label">{components.find(c => c.id === focusedComponentId)?.locked ? 'Fixed' : 'Lock Pos'}</span>
          </button>
        )}
        {focusedComponentId && (
          <button className="bar-btn" onClick={() => resetComponentOrientation(focusedComponentId)}>
            <span className="bar-icon"><RotateCcw size={20} /></span>
            <span className="bar-label">Reset</span>
          </button>
        )}
        <button className={`bar-btn ${showNotebook ? 'bar-btn-active' : ''}`} onClick={() => { setShowNotebook(!showNotebook); setShowToolbox(false); }}>
          <span className="bar-icon"><Laptop size={20} /></span>
          <span className="bar-label">Notebook</span>
        </button>
        <button className="bar-btn" onClick={handleSaveCircuit}>
          <span className="bar-icon"><Save size={20} /></span>
          <span className="bar-label">Save</span>
        </button>
        <button className="bar-btn" onClick={handleExportCircuit}>
          <span className="bar-icon"><Download size={20} /></span>
          <span className="bar-label">Export</span>
        </button>
        <button className={`bar-btn ${showAchievements ? 'bar-btn-active' : ''}`} onClick={() => setShowAchievements(!showAchievements)}>
          <span className="bar-icon"><Trophy size={20} /></span>
          <span className="bar-label">Awards</span>
        </button>
        <button className={`bar-btn ${showPerformance ? 'bar-btn-active' : ''}`} onClick={() => setShowPerformance(!showPerformance)}>
          <span className="bar-icon"><Activity size={20} /></span>
          <span className="bar-label">FPS</span>
        </button>
      </div>

      {/* CODE PANEL */}
      {showProgram && (
        <div style={{ position: 'absolute', bottom: '80px', right: '24px', width: '380px', pointerEvents: 'auto' }}>
          <CodePanel />
        </div>
      )}

      {/* SERIAL MONITOR PANEL */}
      {showSerial && (
        <div style={{ position: 'absolute', bottom: '80px', right: showProgram ? '420px' : '24px', pointerEvents: 'auto' }}>
          <SerialMonitor />
        </div>
      )}

      {/* LAB NOTEBOOK PANEL */}
      {showNotebook && (
        <LabNotebook onClose={() => setShowNotebook(false)} />
      )}

      {/* QUIZ PANEL */}
      {showQuiz && activeExperiment?.quiz && (
        <QuizPanel
          questions={activeExperiment.quiz}
          onComplete={(score, total) => {
            setQuizScore(activeExperiment.id, score, total);
            if (score === total) {
              const isNew = unlockAchievement('perfect-score');
              if (isNew) {
                const a = ACHIEVEMENTS.find(x => x.id === 'perfect-score');
                if (a) setToastAchievement(a);
              }
            }
          }}
        />
      )}

      {/* CIRCUIT ERROR PANEL */}
      {isSimulating && <CircuitErrorPanel />}

      {/* ACHIEVEMENT TOAST */}
      {toastAchievement && (
        <AchievementToast
          achievement={toastAchievement}
          onDismiss={() => setToastAchievement(null)}
        />
      )}

      {/* ACHIEVEMENT PANEL */}
      {showAchievements && (
        <>
          <div className="modal-overlay-bg" onClick={() => setShowAchievements(false)} />
          <AchievementPanel onClose={() => setShowAchievements(false)} />
        </>
      )}

      {/* EXPERIMENT SELECTOR MODAL */}
      {showExperiments && (
        <>
          <div className="modal-overlay-bg" onClick={() => setShowExperiments(false)} />
          <div className="experiment-modal">
            <ExperimentSelector onClose={() => setShowExperiments(false)} />
          </div>
        </>
      )}

      {/* STUDENT GUIDE MODAL */}
      {showModal && (
        <>
          <div className="modal-overlay-bg" onClick={() => setShowModal(false)} />
          <div className="circuit-diagram-modal">
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px' }}>
              {activeExperiment ? `${activeExperiment.icon} ${activeExperiment.title} Guide` : 'Student Wiring Guide'}
            </h2>
            <CircuitDiagram isModal={true} />
          </div>
        </>
      )}
    </div>
  );
};

/* Auto-toggle VR UI when ENTERING a VR session. On desktop, let manual toggle persist. */
const VRSessionWatcher: React.FC<{ onSessionChange: (inVR: boolean) => void }> = ({ onSessionChange }) => {
  const { isPresenting } = useXR();
  React.useEffect(() => {
    if (isPresenting) {
      onSessionChange(true);
    }
  }, [isPresenting, onSessionChange]);
  return null;
};

/* ── 3D SCENE (Memoized to prevent XR remounts on parent state changes) ── */
const SceneContent: React.FC<{ showVRUI: boolean; onVRSessionChange: (inVR: boolean) => void }> = React.memo(({ showVRUI, onVRSessionChange }) => {
  const components = useLabStore(state => state.components);
  const wires = useLabStore(state => state.wires);
  const focusedComponentId = useLabStore(state => state.focusedComponentId);
  const addComponent = useLabStore(state => state.addComponent);
  const activeExperiment = useLabStore(state => state.activeExperiment);
  const currentStep = useLabStore(state => state.currentStep);
  const isSimulating = useLabStore(state => state.isSimulating);
  const { scene } = useThree();
  const { isPresenting } = useXR(); // ADDED to disable OrbitControls in VR

  void currentStep; // force reactivity so getExpectedPinsForStep() re-evaluates


  const focusedComponent = components.find(c => c.id === focusedComponentId);
  const targetPos: [number, number, number] = focusedComponent
    ? [focusedComponent.position.x, focusedComponent.position.y, focusedComponent.position.z]
    : [0, 0.9, 0];

  const handleVRAdd = (type: LabComponentType) => {
    // Generate a slight random offset so multiple appended components don't perfectly overlap
    const rx = (Math.random() - 0.5) * 0.15;
    const rz = (Math.random() - 0.5) * 0.1;
    addComponent(type, { x: rx, y: 0.765, z: rz });
  };

  return (
    <>
      <VRSessionWatcher onSessionChange={onVRSessionChange} />
      <LabEnvironment />
      <OutdoorEnvironment />
      <OrbitControls
        makeDefault
        enabled={!isPresenting}
        target={targetPos}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={0.3}
        maxDistance={250}
        maxPolarAngle={Math.PI / 2.02}
        ref={(ref) => ((scene as any).orbitControls = ref)}
      />

      {/* ✅ FIX: Controllers & Hands are ALWAYS mounted at root — never inside a visible-gated group.
           Hiding them disables XR raycasters entirely. */}
      <Controllers />
      <Hands />

      {/* Always-on locomotion & ambient (not VR-gated) */}
      <VRLocomotion />
      <AmbientAudio />

      {/* VR FLOATING UI — Native 3D Panels (visibility gated for aesthetics only) */}
      <group visible={showVRUI}>

        {/* VR Toolbox — Left of experiment table */}
        <group position={[-1.4, 1.2, -0.2]} rotation={[0, Math.PI / 6, 0]}>
          <VR3DPanel title="VR Toolbox" width={0.8} height={1.05} borderColor="#00d2ff">
            <VR3DButton label="Breadboard" position={[-0.19, 0, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('BREADBOARD')} />
            <VR3DButton label="Arduino UNO" position={[0.19, 0, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('ARDUINO_UNO')} />
            <VR3DButton label="Raspberry Pi" position={[-0.19, -0.065, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('RASPBERRY_PI')} />
            <VR3DButton label="LED 5mm" position={[0.19, -0.065, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('LED_LIGHT')} />
            <VR3DButton label="Battery 9V" position={[-0.19, -0.13, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('BATTERY')} />
            <VR3DButton label="Buzzer" position={[0.19, -0.13, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('BUZZER')} />
            <VR3DButton label="DHT11" position={[-0.19, -0.195, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('DHT11_SENSOR')} color="#0a2e1a" />
            <VR3DButton label="Switch" position={[0.19, -0.195, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('SWITCH')} />
            <VR3DButton label="Resistor 220Ω" position={[-0.19, -0.26, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('RESISTOR')} />
            <VR3DButton label="Potentiometer" position={[0.19, -0.26, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('POTENTIOMETER')} />
            <VR3DButton label="Capacitor" position={[-0.19, -0.325, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('CAPACITOR')} />
            <VR3DButton label="Servo SG90" position={[0.19, -0.325, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('SERVO_MOTOR')} />
            <VR3DButton label="DC Motor" position={[-0.19, -0.39, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('DC_MOTOR')} />
            <VR3DButton label="Relay" position={[0.19, -0.39, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('RELAY')} />
            <VR3DButton label="LCD 16×2" position={[-0.19, -0.455, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('LCD1602')} />
            <VR3DButton label="7-Segment" position={[0.19, -0.455, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('SEVEN_SEGMENT')} />
            <VR3DButton label="HC-SR04" position={[-0.19, -0.52, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('ULTRASONIC_SENSOR')} />
            <VR3DButton label="LDR Sensor" position={[0.19, -0.52, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('LIGHT_SENSOR')} />
            <VR3DButton label="Gas (MQ)" position={[-0.19, -0.585, 0]} width={0.35} height={0.05} onClick={() => handleVRAdd('GAS_SENSOR')} />
          </VR3DPanel>
        </group>

        {/* VR Dashboard — Right of experiment table */}
        <group position={[1.4, 1.2, -0.2]} rotation={[0, -Math.PI / 6, 0]}>
          <VRDashboard3D />
        </group>

        {/* VR Debug Panel — Below VR Dashboard */}
        <group position={[1.4, 0.7, -0.1]} rotation={[0, -Math.PI / 6, 0]}>
          <VRDebugPanel3D />
        </group>

        {/* VR Code Panel — Behind experiment table (glass board style) */}
        <group position={[0, 1.6, -1.4]} rotation={[0.05, 0, 0]}>
          <VRCodePanel3D />
        </group>

        {/* VR Serial Monitor — Right of code panel */}
        <group position={[2.0, 1.5, -1.0]} rotation={[0, -Math.PI / 4, 0]}>
          <VRSerialMonitor3D />
        </group>

        {/* VR Wiring Guide — Left of code panel */}
        <group position={[-2.0, 1.5, -1.0]} rotation={[0, Math.PI / 4, 0]}>
          <VRWiringGuide3D />
        </group>

        {/* VR Experiment List — Much closer, angled perfectly so the user can easily click it */}
        <group position={[1.8, 1.3, 0.4]} rotation={[0, -Math.PI / 3, 0]}>
          <VRExperimentList3D />
        </group>

        {/* VR Step Guide — Floating above table (only when experiment active) */}
        {activeExperiment && (
          <group position={[0, 1.8, -0.8]} rotation={[0.08, 0, 0]}>
            <VRWiringGuide3D />
          </group>
        )}

        {/* VR Control Guide — always visible, left of toolbox, teaches control scheme */}
        <group position={[-2.0, 1.05, 0.5]} rotation={[0, Math.PI / 4, 0]}>
          <VRControlGuide3D />
        </group>
      </group>

      {/* 3D COMPONENTS — Registry-driven rendering */}
      <group>
        {components.map((c) => {
          const Renderer = getComponentRenderer(c.type);
          if (!Renderer) return null;

          return (
            <DraggableControl key={c.id} id={c.id} type={c.type}>
              <Renderer id={c.id} />
            </DraggableControl>
          );
        })}
      </group>

      {wires.map((w) => {
        const startComp = components.find(c => c.id === w.startComponentId);
        const endComp = components.find(c => c.id === w.endComponentId);
        if (!startComp || !endComp) return null;
        return (
          <Wire
            key={w.id}
            wire={w}
            start={[startComp.position.x + w.startOffset.x, startComp.position.y + w.startOffset.y, startComp.position.z + w.startOffset.z]}
            end={[endComp.position.x + w.endOffset.x, endComp.position.y + w.endOffset.y, endComp.position.z + w.endOffset.z]}
            color={w.color}
          />
        );
      })}
      <WirePreview />
      <XRWirePreview />

      {/* Circuit Error 3D Overlays */}
      <CircuitErrorOverlay />

      {/* VR Instruments — on the workbench */}
      <Oscilloscope position={[0.55, 0.83, 0.25]} />
      <Multimeter position={[0.7, 0.835, 0.25]} />

      {/* Current Flow Visualization — particles on active wires */}
      <CurrentFlowViz
        wirePositions={wires.map(w => {
          const sc = components.find(c => c.id === w.startComponentId);
          const ec = components.find(c => c.id === w.endComponentId);
          if (!sc || !ec) return { start: [0, 0, 0] as [number, number, number], end: [0, 0, 0] as [number, number, number], active: false };

          let pColor = '#00d2ff'; // Default blue (data signal)
          if (w.color === '#e74c3c' || w.color === '#e67e22' || w.color === '#2c3e50') {
            pColor = '#ffee00'; // Red/Orange/Black -> Yellow (power/gnd)
          }

          return {
            start: [sc.position.x + w.startOffset.x, sc.position.y + w.startOffset.y, sc.position.z + w.startOffset.z] as [number, number, number],
            end: [ec.position.x + w.endOffset.x, ec.position.y + w.endOffset.y, ec.position.z + w.endOffset.z] as [number, number, number],
            active: isSimulating,
            particleColor: pColor
          };
        })}
      />
    </>
  );
});

function App() {
  const [showVRUI, setShowVRUI] = useState(false);
  const [session, setSession] = useState<StudentSession | null>(null);

  // Lifted from JSX to top-level to prevent Error 310
  const showPerformance = useLabStore(state => state.showPerformance);

  // Mount simulation effects ONCE — outside Canvas
  useSimulationEffects();

  const handleVRSessionChange = useCallback((inVR: boolean) => {
    setShowVRUI(inVR);
  }, []);

  const handleEndSession = useCallback(() => {
    setSession(null);
  }, []);

  // Gate: Show student entry panel until logged in
  if (!session) {
    return <StudentEntry onStart={setSession} />;
  }

  return (
    <>
      <VRButton />
      <Canvas
        shadows
        camera={{ position: [0, 1.6, 15], fov: 55, near: 0.01, far: 500 }}
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Sky distance={450000} sunPosition={[100, 20, 100]} inclination={0.49} azimuth={0.25} />
        <fog attach="fog" args={['#b0d4f1', 60, 250]} />
        <Environment preset="sunset" />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <XR>
          <VRLocomotion />
          <InteractionController />
          <DesktopMirror />
          <React.Suspense fallback={null}>
            <SceneContent showVRUI={showVRUI} onVRSessionChange={handleVRSessionChange} />
          </React.Suspense>
        </XR>
        <PerformanceMonitor visible={showPerformance} />
      </Canvas>
      <Loader
        containerStyles={{ background: '#0a1628' }}
        innerStyles={{ width: '300px' }}
        barStyles={{ background: '#00d2ff' }}
        dataInterpolation={(p: number) => `Loading Lab Assets: ${p.toFixed(0)}%`}
      />
      <UI showVRUI={showVRUI} setShowVRUI={setShowVRUI} session={session} onEndSession={handleEndSession} />
    </>
  );
}

export default App;
