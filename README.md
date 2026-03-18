# Virtual IoT Laboratory 🔬⚡

An immersive, industry-ready **WebXR 3D electronics simulation** environment built with React, React Three Fiber (R3F), and `avr8js`. The Virtual IoT Laboratory allows users to freely explore a dynamic 3D engineering campus, enter a fully equipped electronics lab, and physically wire and program microcontrollers (Arduino Uno, Raspberry Pi) in Virtual Reality.

[![Netlify Status](https://api.netlify.com/api/v1/sites/4c86ed87-ecb4-4156-b4c6-e954590ee96b/deploy-status.png)](https://app.netlify.com/sites/4c86ed87-ecb4-4156-b4c6-e954590ee96b/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

- **🔋 Physical Electronics Engine**: Features a deterministic **NetGraph topology engine** running inside a Web Worker. Circuits evaluate realistically with Ohm's law voltage propagation.
- **📟 Instruction-Level Emulation**: Code executes on an emulated **Arduino CPU (avr8js)** at a stable 60Hz. Support for real UART serial communication.
- **🥽 WebXR Native Controls**: Full support for VR headsets with intuitive grab-and-snap mechanics, wire patching, and free locomotion.
- **🤖 LabMate Holographic AI**: An event-driven, spatial-audio holographic assistant that provides guided instructions and error suggestions.
- **📈 Visual Circuit Diagnostics**: Animated electron flow visualizations and glowing wire overlays provide instant feedback on voltage state and active circuits.
- **🏗️ Immersive 3D Environment**: Explore a high-fidelity lab room with dynamic lighting and PBR materials.

---

## 🏗️ Hardware Library

The laboratory comes equipped with:
- **Microcontrollers**: Arduino Uno R3, Raspberry Pi 4 Model B
- **Prototyping**: Standard Half-Size Breadboard (830 tie points)
- **Passive Components**: Resistors (multiple values), LEDs, Tactile Push Buttons, Switches, Capacitors
- **Sensors & Actuators**: DHT11 Temp/Humidity Sensor, Piezo Buzzer, Servo SG90, DC Motor, Ultrasonic Sensor (HC-SR04), Light Sensor (LDR), Gas Sensor (MQ)
- **Displays**: LCD 16×2, 7-Segment Display

---

## 🛠️ Architecture Overview

The platform is designed for high-performance simulation without blocking the UI thread:

- **Main Thread**: React UI + React Three Fiber (R3F) Canvas + WebXR interaction.
- **Web Worker**: Background simulation of MCU instructions and the Electrical Engine.
- **Zustand Store**: Centralized reactive state for all components, wires, and simulation signals.

---

## 🚀 Getting Started Locally

```bash
# 1. Clone the repository
git clone https://github.com/DrTMUSHACoder/iot-virtual-lab.git
cd iot-virtual-lab

# 2. Install dependencies
npm install

# 3. Start the dev server (HTTPS enabled)
npm run dev
```

> **Note:** HTTPS is required for WebXR features. The project uses `basicSsl`, so you may need to bypass the browser's certificate warning during development.

---

## 📦 Deployment

### To Render.com
This project is pre-configured with a `render.yaml` Blueprint.
1. Connect your GitHub repository to **Render.com**.
2. Create a new **Static Site**.
3. Render will automatically detect the settings from `render.yaml`.

### To Netlify
The project includes a `netlify.toml` for seamless deployment.
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

---

## 📜 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **Dr. TMUSHACoder**
