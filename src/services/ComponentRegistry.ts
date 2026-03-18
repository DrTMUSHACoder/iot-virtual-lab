import React from 'react';
import type { LabComponentType } from '../types';

/**
 * ComponentRegistry — Maps LabComponentType strings to their React 3D components.
 *
 * Eliminates the 11-branch if/else chain in SceneContent.
 * New component types only need: 1) add to LabComponentType union, 2) register here.
 */

type ComponentRenderer = React.FC<{ id: string }>;

const registry = new Map<LabComponentType, ComponentRenderer>();

/** Register a 3D component for a given LabComponentType */
export function registerComponent(type: LabComponentType, renderer: ComponentRenderer) {
    registry.set(type, renderer);
}

/** Retrieve the renderer for a type (returns undefined if not registered) */
export function getComponentRenderer(type: LabComponentType): ComponentRenderer | undefined {
    return registry.get(type);
}

/** Get all registered component types */
export function getRegisteredTypes(): LabComponentType[] {
    return Array.from(registry.keys());
}

// ── Auto-register all known components ──
// Lazy imports to avoid circular dependency issues

import { Breadboard } from '../components/Breadboard';
import { LED } from '../components/LED';
import { Arduino } from '../components/Arduino';
import { Microcontroller } from '../components/Microcontroller';
import { Battery } from '../components/Battery';
import { Resistor } from '../components/Resistor';
import { Potentiometer } from '../components/Potentiometer';
import { Switch } from '../components/Switch';
import { RaspberryPi } from '../components/RaspberryPi';
import { Buzzer } from '../components/Buzzer';
import { DHT11Sensor } from '../components/DHT11Sensor';
import { Capacitor } from '../components/Capacitor';
import { ServoMotor } from '../components/ServoMotor';
import { DCMotor } from '../components/DCMotor';
import { Relay } from '../components/Relay';
import { LCD1602 } from '../components/LCD1602';
import { SevenSegment } from '../components/SevenSegment';
import { UltrasonicSensor } from '../components/UltrasonicSensor';
import { LightSensor } from '../components/LightSensor';
import { GasSensor } from '../components/GasSensor';

registerComponent('BREADBOARD', Breadboard);
registerComponent('LED_LIGHT', LED);
registerComponent('ARDUINO_UNO', Arduino);
registerComponent('MICROCONTROLLERS', Microcontroller);
registerComponent('BATTERY', Battery);
registerComponent('RESISTOR', Resistor);
registerComponent('POTENTIOMETER', Potentiometer);
registerComponent('SWITCH', Switch);
registerComponent('RASPBERRY_PI', RaspberryPi);
registerComponent('BUZZER', Buzzer);
registerComponent('DHT11_SENSOR', DHT11Sensor);
registerComponent('CAPACITOR', Capacitor);
registerComponent('SERVO_MOTOR', ServoMotor);
registerComponent('DC_MOTOR', DCMotor);
registerComponent('RELAY', Relay);
registerComponent('LCD1602', LCD1602);
registerComponent('SEVEN_SEGMENT', SevenSegment);
registerComponent('ULTRASONIC_SENSOR', UltrasonicSensor);
registerComponent('LIGHT_SENSOR', LightSensor);
registerComponent('GAS_SENSOR', GasSensor);
