
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export type LabComponentType = 'BREADBOARD' | 'LED_LIGHT' | 'ARDUINO_UNO' | 'MICROCONTROLLERS' | 'BATTERY' | 'RESISTOR' | 'POTENTIOMETER' | 'SWITCH' | 'RASPBERRY_PI' | 'BUZZER' | 'DHT11_SENSOR' | 'CAPACITOR' | 'SERVO_MOTOR' | 'DC_MOTOR' | 'RELAY' | 'LCD1602' | 'SEVEN_SEGMENT' | 'ULTRASONIC_SENSOR' | 'LIGHT_SENSOR' | 'GAS_SENSOR';

export interface LabComponent {
    id: string;
    type: LabComponentType;
    position: Vec3;
    rotation: Vec3;
    value?: string;
    locked?: boolean;
    placement?: ComponentPlacement;
}

export interface Wire {
    id: string;
    startComponentId: string;
    startPin: string;
    startOffset: Vec3;
    endComponentId: string;
    endPin: string;
    endOffset: Vec3;
    color: string;
}

/* ─── Experiment System ─── */

export type ExperimentCategory = 'Arduino' | 'Raspberry Pi';
export type ExperimentDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface BreadboardPlacement {
    type: 'breadboard';
    refId: string; // the ID of the breadboard to snap to
    holes: string[]; // e.g., ["E12", "E14"] for an LED
}

export type ComponentPlacement =
    | { type: 'world'; position: Vec3; rotation?: Vec3 }
    | BreadboardPlacement;

export interface ExperimentComponent {
    refId: string;          // e.g. 'arduino-1', 'led-1'
    type: LabComponentType;
    placement?: ComponentPlacement;
    position?: Vec3;        // Fallback or legacy world position
    rotation?: Vec3;        // Fallback or legacy world rotation
    value?: string;         // e.g. '220' for resistor
}

export interface ExperimentWire {
    startRefId: string;
    startPin: string;
    startOffset: Vec3;
    endRefId: string;
    endPin: string;
    endOffset: Vec3;
    color: string;
}

export interface ExpectedConnection {
    fromRefId: string;
    fromPin: string;
    toRefId: string;
    toPin: string;
    wireColor: string;
}

export interface ExperimentStep {
    title: string;
    description: string;
    expectedConnection?: ExpectedConnection;
    hint?: string;                       // Guidance hint shown on incorrect attempts
    highlightHoles?: string[];           // Breadboard holes to glow during this step
}

/* ─── Learning System ─── */

export interface QuizOption {
    text: string;
    correct: boolean;
}

export interface QuizQuestion {
    question: string;
    options: QuizOption[];
    explanation: string;                 // Shown after answer
}

export interface LearningObjective {
    concept: string;                     // e.g. "Digital Output Control"
    objective: string;                   // e.g. "Understand HIGH and LOW signals"
}

export interface Experiment {
    id: string;
    title: string;
    description: string;
    category: ExperimentCategory;
    difficulty: ExperimentDifficulty;
    icon: string;
    components: ExperimentComponent[];
    wiring: ExperimentWire[];
    code: string;
    codeLanguage: 'cpp' | 'python';
    steps: ExperimentStep[];
    /* ── Learning System ── */
    learning?: LearningObjective;
    quiz?: QuizQuestion[];
}

export interface LabState {
    components: LabComponent[];
    wires: Wire[];
    simulationSignals: Record<string, boolean>;
    addComponent: (type: LabComponentType, position?: Vec3, value?: string) => void;
    removeComponent: (id: string) => void;
    updateComponentPosition: (id: string, position: Vec3) => void;
    updateComponentRotation: (id: string, rotation: Vec3) => void;
    addWire: (wire: Omit<Wire, 'id'>) => void;
    removeWire: (id: string) => void;
    clearLab: () => void;
    setSignal: (pin: string, value: boolean) => void;
    focusedComponentId: string | null;
    setFocusedComponentId: (id: string | null) => void;
    // Old interaction state removed. Let's make sure nothing else breaks.
    pendingWireStart: { componentId: string; pinName: string; position: Vec3 } | null;
    setPendingWire: (wire: { componentId: string; pinName: string; position: Vec3 } | null) => void;
    isSimulating: boolean;
    setIsSimulating: (active: boolean) => void;
    simulationError: string | null;
    setSimulationError: (error: string | null) => void;
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
    pinVoltages: Record<string, number>;
    serialOutput: string[];
    addSerialLine: (line: string) => void;
    clearSerialOutput: () => void;
    showLabels: boolean;
    setShowLabels: (v: boolean) => void;
    resetAllOrientations: () => void;
    resetComponentOrientation: (id: string) => void;
    toggleComponentLock: (id: string) => void;
}
