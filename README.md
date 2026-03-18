# Virtual IoT Laboratory 🥽⚡

An immersive, industry-ready WebXR 3D electronics simulation environment built with React, React Three Fiber (R3F), and `avr8js`. The Virtual IoT Laboratory allows users to freely explore a dynamic 3D engineering campus, enter a fully equipped electronics lab, and physically wire and program microcontrollers (Arduino Uno, Raspberry Pi) in Virtual Reality.

## 🌟 Key Features

- **Immersive 3D Environments**: Explore both an interactive interior electronics lab and a procedural exterior college campus with dynamic golden-hour lighting, ambient soundscapes, and scattered educational elements.
- **Physical Electronics Engine**: Features a deterministic NetGraph topology engine running inside a Web Worker. Circuits evaluate realistically, and code executes on an emulated Arduino CPU (`avr8js`) at a stable 60Hz.
- **WebXR Native Controls**: Full support for VR headsets with intuitive grab-and-snap mechanics, wire patching, and free locomotion.
- **LabMate Holographic AI**: An event-driven, spatial-audio holographic assistant that provides guided instructions, component scanning, and error suggestions using the Web Speech API.
- **Visual Circuit Diagnostics**: Animated electron flow visualizations and glowing wire overlays provide instant feedback on voltage state, data transmission, and active circuits.
- **Holographic Panels**: Built-in 3D UI for managing simulations, debugging controllers, tracking experiment guides, and managing component toolboxes.

---

## 🏗️ What the Project Contains

### 1. Hardware Library
- **Microcontrollers**: Arduino Uno R3, Raspberry Pi 4 Model B
- **Prototyping**: Standard Half-Size Breadboard
- **Passive Components**: Resistors, LEDs (Multiple colors), Tactile Push Buttons, Switches
- **Sensors & Actuators**: DHT11 Temperature/Humidity Sensor, Piezo Buzzer

### 2. Core Architecture
- **`src/components/`**: Handles all 3D mesh rendering, lighting, locational logic, and XR interactions (React Three Fiber).
- **`src/services/`**: The backbone of the simulation logic.
  - `Simulator.ts` & `simulation.worker.ts`: Offloads WebAssembly AVR code execution and NetGraph logic to a background thread to maintain stable 90-FPS VR visual performance.
  - `VoiceService.ts`: AI assistant narration and speech queuing.
  - `AudioService.ts`: Real-time synthesized spatial UI and mechanical sound effects.
- **`src/store/useLabStore.ts`**: Zustand global state manager handling UI states, wires, components, and active experiments.

---

## 🎮 Controls

### VR Headset Controls (Oculus / WebXR Standard)
- **Left Thumbstick**: Smooth continuous locomotion (walking).
- **Right Thumbstick**: Snap turning (45-degree increments).
- **Grip Button (Squeeze)**: Grab, lift, and move components. Releasing the grip drops the item, automatically snapping it to the nearest breadboard hole or lab bench surface.
- **Trigger Button (Select)**: 
  - In **Move Mode**: Interact with UI panels and buttons.
  - In **Scan/Inspect Mode**: Point at any component and squeeze the trigger to have LabMate verbally explain what the component is.
  - In **Wire Mode**: Tap a component's pin to start a wire. Tap another pin to finalize the connection.
- **Menu/Y Button**: Cancels a pending wire that is attached to your hand, or turns off Wiring mode.

### Desktop Controls (Fallback)
- **Left Click & Drag**: Orbit the camera or move objects around the bench.
- **Shift + Click & Drag**: Rotate a grabbed component freely in the XY plane.
- **Alt + Click & Drag**: Rotate a grabbed component around its Z axis.
- **Keyboard Shortcuts**:
  - `M`: Toggle **MOVE** Mode (Normal grabbing).
  - `W`: Toggle **WIRE** Mode (Click pins to connect wires).
  - `I` / `S`: Toggle **INSPECT/SCAN** Mode.
  - `Esc`: Cancel a pending wire.

---

## 🔬 List of Built-In Experiments

The laboratory comes with a series of guided, interactive experiments built directly into the Holo-panels, designed to take users from basic electronics to sensor integration.

1. **Digital LED Blink (Arduino)**
   - **Goal**: The "Hello World" of electronics. Learn to connect an LED, understand polarity (Anode/Cathode), and use a current-limiting resistor to safely blink an LED using Arduino Pin 13.
2. **Traffic Light Controller (Arduino)**
   - **Goal**: Simulate a real-world intersection using Red, Yellow, and Green LEDs controlled by sequential timing logic and independent pin outputs.
3. **PWM Potentiometer Dimmer (Arduino)**
   - **Goal**: Understand Pulse Width Modulation (PWM) and Analog Inputs by using a potentiometer to smoothly dim and brighten an LED.
4. **Button & Digital Logic (Arduino)**
   - **Goal**: Learn how to read digital input devices. Wire a tactile push button and use it to execute conditional logic (turning on an LED when pressed).
5. **Raspberry Pi GPIO Control**
   - **Goal**: Shift platforms to the Raspberry Pi 4. Learn standard 40-pin header mapping and execute a Python-style digital blink logic cycle.
6. **RPi Button Input**
   - **Goal**: Continue learning RPi GPIO by taking active 3.3v input from a push button to control software states.
7. **DHT11 Environmental Sensor Integration (Arduino)**
   - **Goal**: Advance to digital data packages. Wire up a 3-pin DHT11 module, capture Temperature and Humidity data over a one-wire serial protocol, and transmit the readings back to the Virtual Serial Monitor.

---

## 🚀 Getting Started Locally

To run the application natively on your development machine:

\`\`\`bash
# 1. Install Dependencies
npm install

# 2. Run the Vite Dev Server
npm run dev
\`\`\`

Access the project at `http://localhost:5173`. We highly recommend using a WebXR-compatible browser (like Google Chrome or the Meta Quest Browser) if entering Immersive VR mode.

## 🛠️ Build & Deployment

The project handles heavy 3D assets and Worker scripts. When deploying a production bundle, Vite will chunk assets accordingly.

\`\`\`bash
# Build for production
npm run build

# Preview production build locally
npm run preview
\`\`\`

> *Currently deployed live to Netlify!*
