# Virtual IoT Laboratory — Complete Project Documentation

## Abstract

The **Virtual IoT Laboratory** is an immersive, browser-based 3D simulation platform that enables students to learn IoT (Internet of Things) concepts through hands-on experimentation with virtual electronic components. The platform supports both **desktop** and **WebXR (VR headset)** modes, allowing users to drag-and-drop Arduino UNO, Raspberry Pi, breadboards, LEDs, sensors, and other components onto a realistic virtual workbench, wire them together, write embedded code, and simulate real-time electrical behavior — all without any physical hardware.

The simulation engine runs on a **Web Worker** thread for non-blocking performance, featuring an **avr8js**-powered Arduino MCU emulator, a **Net/Node topology-driven electrical engine** with Ohm's law voltage propagation, and a **deterministic 60Hz tick loop** that accurately models GPIO pin states, voltage distribution, and serial communication.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Core Systems](#core-systems)
5. [Component Library](#component-library)
6. [Experiment System](#experiment-system)
7. [VR (WebXR) Features](#vr-webxr-features)
8. [State Management](#state-management)
9. [Getting Started](#getting-started)
10. [Build & Deployment](#build--deployment)
11. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **UI Framework** | React | 18.3 | Component-based UI rendering |
| **3D Engine** | Three.js | 0.164 | WebGL 3D rendering |
| **3D React Bindings** | @react-three/fiber (R3F) | 8.16 | Declarative Three.js in React |
| **3D Utilities** | @react-three/drei | 9.105 | Pre-built 3D helpers (OrbitControls, Text, Environment, etc.) |
| **VR/XR** | @react-three/xr | 5.7 | WebXR session management, controllers, hands |
| **MCU Emulation** | avr8js | 0.21 | Arduino ATmega328p instruction-level emulation |
| **State Management** | Zustand | 5.0 | Lightweight global store |
| **Build Tool** | Vite | 5.3 | Fast HMR dev server + production bundling |
| **Language** | TypeScript | 5.2 | Type-safe development |
| **Threading** | Web Workers API | native | Offload simulation to background thread |
| **SSL (Dev)** | @vitejs/plugin-basic-ssl | 2.1 | HTTPS for WebXR (required by browsers) |

---

## Project Structure

```
virtual-iot-lab/
├── public/                          # Static assets (3D models, textures)
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root app: Canvas, XR, SceneContent, UI
│   ├── App.css                      # Global styles
│   ├── types.ts                     # TypeScript interfaces & types
│   │
│   ├── components/                  # 3D & UI React components
│   │   ├── Arduino.tsx              # Arduino UNO 3D model + 26 GPIO pins
│   │   ├── RaspberryPi.tsx          # Raspberry Pi 3D model + 40 GPIO pins
│   │   ├── Breadboard.tsx           # Breadboard 3D model (GLTF)
│   │   ├── LED.tsx                  # 5mm LED with glow effect
│   │   ├── Resistor.tsx             # Resistor with band colors
│   │   ├── Battery.tsx              # 9V battery
│   │   ├── Buzzer.tsx               # Piezo buzzer
│   │   ├── DHT11Sensor.tsx          # Temperature/humidity sensor
│   │   ├── Potentiometer.tsx        # Variable resistor
│   │   ├── Switch.tsx               # Toggle switch
│   │   ├── Microcontroller.tsx      # Generic MCU
│   │   ├── Pin.tsx                  # Individual GPIO pin (snap, hover, wire)
│   │   ├── Wire.tsx                 # 3D wire (CatmullRom curve)
│   │   ├── DraggableControl.tsx     # XR-compatible drag-and-drop wrapper
│   │   ├── InteractionController.tsx # XR ray interaction manager
│   │   ├── LabEnvironment.tsx       # Full lab room (walls, table, lighting)
│   │   ├── VR3DPanel.tsx            # Floating glassmorphic VR UI panel
│   │   ├── VRLocomotion.tsx         # Thumbstick locomotion + table collision
│   │   ├── CodePanel.tsx            # Desktop code editor panel
│   │   ├── SerialMonitor.tsx        # Desktop serial output viewer
│   │   ├── CircuitDiagram.tsx       # Wiring diagram overlay
│   │   ├── ExperimentSelector.tsx   # Experiment chooser UI
│   │   ├── StudentEntry.tsx         # Student login / session gate
│   │   └── vr/
│   │       └── VRPanels.tsx         # VR-specific panels (dashboard, code, serial, etc.)
│   │
│   ├── services/                    # Business logic & engines
│   │   ├── Simulator.ts            # Arduino MCU emulator (avr8js wrapper)
│   │   ├── ElectricalEngine.ts     # Legacy electrical engine
│   │   ├── ComponentRegistry.ts    # Dynamic component type → renderer mapping
│   │   └── electrical/             # Net/Node electrical engine
│   │       ├── index.ts            # Public API
│   │       ├── NetGraph.ts         # Topology graph (nets, nodes, edges)
│   │       ├── VoltageEngine.ts    # Iterative voltage solver (Ohm's law)
│   │       ├── TopologyValidator.ts # Circuit validation
│   │       ├── DeviceModule.ts     # Device abstraction
│   │       └── devices/            # Per-component electrical models
│   │           ├── ArduinoDevice.ts
│   │           ├── LEDDevice.ts
│   │           ├── RaspberryPiDevice.ts
│   │           └── ResistorDevice.ts
│   │
│   ├── store/                       # State management
│   │   ├── useLabStore.ts          # Zustand global store
│   │   └── useSimulationEffects.ts # Worker lifecycle + message handling
│   │
│   ├── workers/
│   │   └── simulation.worker.ts    # Web Worker: MCU + electrical sim loop
│   │
│   ├── data/
│   │   └── experiments.ts          # Pre-built experiment definitions
│   │
│   └── utils/
│       └── pinRegistry.ts          # Pin metadata & layout definitions
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (Main Thread)                │
│                                                         │
│  ┌─────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │ React   │───▶│ Zustand Store │◀──▶│ R3F Canvas     │ │
│  │ UI      │    │ (useLabStore) │    │ + Three.js     │ │
│  └─────────┘    └──────┬───────┘    │ + WebXR        │ │
│                        │            └────────────────┘ │
│                        │ postMessage                    │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Web Worker Thread                     │   │
│  │  ┌──────────────┐    ┌───────────────────────┐  │   │
│  │  │ ArduinoSim   │───▶│ Electrical Engine      │  │   │
│  │  │ (avr8js MCU) │    │ (Net/Node + Voltage)   │  │   │
│  │  │ GPIO R/W     │    │ Ohm's law propagation  │  │   │
│  │  └──────────────┘    └───────────────────────┘  │   │
│  │         60Hz deterministic tick loop             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User places components and wires them on the 3D workbench
2. Zustand store holds all component/wire state
3. When simulation starts, the Web Worker receives circuit topology
4. Worker runs 60Hz MCU tick loop: reads GPIO → propagates voltage → updates outputs
5. Worker sends `TICK_UPDATE` messages back to main thread
6. Zustand store updates → React re-renders LED glow, serial output, etc.

---

## Core Systems

### 1. Arduino MCU Emulator (`Simulator.ts`)

- **Engine**: `avr8js` — instruction-level ATmega328p emulator
- **Features**: Full GPIO port B/C/D, timer0/1/2, USART serial TX
- **Clock**: 16MHz simulated, with deterministic 16ms tick batches (~60Hz)
- **Hex Loading**: Accepts pre-compiled Intel HEX firmware
- **Serial**: Real USART data register output (not fake logs)

### 2. Electrical Engine (`services/electrical/`)

- **Topology**: Net/Node graph built from wires and component pin definitions
- **Solver**: Iterative relaxation (BFS-based voltage propagation)
- **Physics**: Ohm's law, voltage division, forward voltage drops (LED ~2.0V, DHT11 ~3.3V)
- **Floating nets**: Unconnected nets resolve to `null` voltage
- **Device models**: Each component type has its own electrical model

### 3. Web Worker (`simulation.worker.ts`)

- **Messages IN**: `INIT_CIRCUIT`, `START_SIMULATION`, `STOP_SIMULATION`, `LOAD_HEX`, `SET_USER_INPUT_SIGNAL`
- **Messages OUT**: `TICK_UPDATE` (pin voltages, LED states, serial data), `SERIAL_OUTPUT`, `ERROR`
- **Purpose**: Non-blocking simulation — UI stays smooth at 60fps even under heavy MCU emulation

### 4. Component Registry (`ComponentRegistry.ts`)

- Dynamic `Map<LabComponentType, React.FC>` — no hardcoded switch-case
- New components only need: (1) add to `LabComponentType` union, (2) call `registerComponent()`
- SceneContent renders via single `getComponentRenderer(type)` lookup

---

## Component Library

### Electronic Components (11 types)

| Component | Type Key | 3D Model | Pins | Electrical Model |
|-----------|----------|----------|------|-----------------|
| Arduino UNO | `ARDUINO_UNO` | GLTF | D0–D13, A0–A5, 5V, 3.3V, GND, VIN, RESET | MCU (avr8js) |
| Raspberry Pi | `RASPBERRY_PI` | GLTF | 40-pin GPIO header | Power source |
| Breadboard | `BREADBOARD` | GLTF | 830 tie points | Passive bus |
| LED 5mm | `LED_LIGHT` | GLTF | Anode, Cathode | Vf=2.0V diode |
| Resistor | `RESISTOR` | Procedural | Lead1, Lead2 | Ohmic (220Ω default) |
| Battery 9V | `BATTERY` | Procedural | +, − | 9V source |
| Buzzer | `BUZZER` | GLTF | +, − | Active output |
| DHT11 | `DHT11_SENSOR` | GLTF | VCC, DATA, GND | 3.3V threshold |
| Potentiometer | `POTENTIOMETER` | Procedural | 3 terminals | Variable resistor |
| Switch | `SWITCH` | Procedural | 2 terminals | Open/closed |
| Microcontroller | `MICROCONTROLLERS` | Procedural | Generic | Passive |

### Interaction System

- **Desktop**: Mouse drag-and-drop, orbit camera, click-to-wire
- **VR**: XR controller ray-casting, squeeze-to-grab, thumbstick locomotion
- **Wiring**: Click pin → click pin → wire auto-routes with CatmullRom spline
- **Snap anchors**: Invisible sphere colliders on each pin for precision wiring

---

## Experiment System

Pre-built guided learning experiments with step-by-step instructions:

### Experiment Definition Schema (`data/experiments.ts`)

Each experiment defines:
- **Components**: What to place and where
- **Wiring**: Expected connections with color coding
- **Code**: Arduino C++ or Raspberry Pi Python source
- **Steps**: Ordered instructions with connection validation

### Available Experiments

1. **LED Blink** (Arduino, Beginner) — Basic digital output
2. **Traffic Light** (Arduino, Intermediate) — Sequential LED control
3. **Temperature Monitor** (Arduino, Intermediate) — DHT11 serial readout
4. **Buzzer Alarm** (Arduino, Beginner) — Tone generation
5. **Button LED** (Arduino, Beginner) — Digital input/output
6. **Potentiometer LED** (Arduino, Intermediate) — Analog input control
7. **Raspberry Pi GPIO** (RPi, Beginner) — Basic GPIO blink

### Step Validation

- Each step has an `expectedConnection` (from pin → to pin)
- Real-time feedback: ✅ correct / ❌ incorrect wire placement
- Progress tracking with `completedSteps` set

---

## VR (WebXR) Features

### Locomotion (`VRLocomotion.tsx`)
- **Left thumbstick**: Smooth camera-relative translation
- **Right thumbstick**: 45° snap turning with arc compensation
- **Table collision**: AABB pushout prevents walking through workbench
- **Room bounds**: Soft clamp to 7m × 6.5m area
- **Spawn reset**: Auto-position behind table on session start

### VR UI Panels (`VR3DPanel.tsx` + `VRPanels.tsx`)
- **Glassmorphic 3D panels**: Frosted glass effect with border glow
- **Billboard effect**: Y-axis face-camera with smooth lerp
- **Floating animation**: 2mm hover oscillation
- **Available panels**:
  - 📦 VR Toolbox — Add components
  - ⚙ Lab Control — Start/stop sim, toggle wiring mode
  - ⚡ Code Panel — View source with thumbstick scroll
  - 📟 Serial Monitor — Real-time output
  - 📚 Experiment List — Load experiments
  - 🔌 Wiring Guide — Step-by-step instructions

### Interaction
- **Controllers**: XR ray-based interaction via `@react-three/xr`
- **Hands**: WebXR hand tracking support
- **Grab**: Squeeze to grab components
- **Wire**: Point-and-click pin wiring

---

## State Management

### Zustand Store (`useLabStore.ts`)

| State Slice | Description |
|-------------|-------------|
| `components` | Array of placed `LabComponent` objects |
| `wires` | Array of `Wire` connections |
| `isSimulating` | Simulation on/off flag |
| `simulationSignals` | GPIO pin states (HIGH/LOW) |
| `pinVoltages` | Voltage at each pin (from electrical engine) |
| `serialOutput` | USART serial log lines |
| `activeExperiment` | Currently loaded experiment |
| `currentStep` | Step progress index |
| `completedSteps` | Set of completed step indices |
| `connectionFeedback` | Wire validation result |
| `interactionMode` | `'MOVE'` or `'WIRE'` |
| `focusedComponentId` | Camera focus target |
| `showLabels` | Pin label visibility |

### Worker Communication (`useSimulationEffects.ts`)

- Creates/destroys Web Worker on simulation toggle
- Sends `INIT_CIRCUIT` with current component + wire topology
- Receives `TICK_UPDATE` and dispatches to store via `_setTickUpdate()`

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- Modern browser with WebGL2 support
- For VR: WebXR-compatible browser (Chrome/Edge) + VR headset (Quest, etc.)

### Installation

```bash
git clone <repository-url>
cd virtual-iot-lab
npm install
```

### Development Server

```bash
npm run dev
```

Opens at `https://localhost:5173` (HTTPS required for WebXR).

### Enter VR Mode

1. Connect VR headset to PC or use Quest browser
2. Navigate to the dev server URL
3. Click the **"Enter VR"** button in the bottom-left corner
4. Use thumbstick to walk around the lab

---

## Build & Deployment

```bash
npm run build     # TypeScript check + Vite production build
npm run preview   # Preview production build locally
```

**Output**: `dist/` folder with:
- `index.html` — Entry page
- `assets/index-*.js` — Main bundle (~1.4MB gzipped ~400KB)
- `assets/simulation.worker-*.js` — Worker chunk (~52KB)
- `assets/index-*.css` — Styles (~18KB)

### Deployment Options
- **Static hosting**: Netlify, Vercel, GitHub Pages, AWS S3 + CloudFront
- **Requirements**: HTTPS (mandatory for WebXR), CORS headers for GLTF models

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Web Worker for simulation** | MCU emulation is CPU-intensive; offloading prevents UI jank |
| **Net/Node electrical engine** | Physically accurate voltage propagation vs. simple boolean logic |
| **Zustand over Redux** | Lightweight, no boilerplate, excellent selector performance |
| **ComponentRegistry pattern** | Extensible — new components don't require editing core render loop |
| **React.memo on SceneContent** | Prevents XR tree remount when parent state changes |
| **Shadow budget** | Only table surface casts shadows; small objects receive only — saves GPU |
| **Y-axis billboard** | VR panels always face player without full-billboard Z-rotation |
| **Ref-based VR spawn** | No state trigger on session start — prevents re-render cascade |
| **Baked environment map** | Warehouse HDR gives realistic metallic reflections without real-time GI |
| **useMemo materials** | Shared materials across all pins reduces GPU state changes |

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Bundle size (gzip) | ~400KB |
| Worker chunk | 52KB |
| Shadow casters | 1 (table only) |
| Shadow receivers | All components |
| Simulation tick rate | 60Hz (16ms) |
| MCU clock | 16MHz (simulated) |
| Max components | ~50 before frame drop |
| VR target FPS | 72Hz (Quest 2) |

---

*Document generated: February 2026*
*Platform: Virtual IoT Laboratory v0.0.0*
