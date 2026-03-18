
import React from 'react';
import { useLabStore } from '../store/useLabStore';

interface DiagramProps {
    isModal?: boolean;
}

export const CircuitDiagram: React.FC<DiagramProps> = ({ isModal = false }) => {
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const currentStep = useLabStore(state => state.currentStep);

    if (activeExperiment) {
        // Dynamic experiment-driven diagram
        return (
            <div className={isModal ? "modal-content" : "diagram-mini"}>
                {!isModal && <h4 style={{ fontSize: '10px', margin: '0 0 5px 0', color: '#00d2ff' }}>{activeExperiment.icon} {activeExperiment.title}</h4>}
                <svg viewBox="0 0 500 350" className="blink-svg" style={{ maxHeight: isModal ? '250px' : '80px' }}>
                    {/* Dynamic circuit visualization */}
                    <rect x="20" y="20" width="460" height="310" rx="12" fill="#0a0a1a" stroke="#00d2ff" strokeWidth="1" opacity="0.5" />
                    <text x="250" y="55" textAnchor="middle" fill="#00d2ff" fontSize="16" fontWeight="bold">{activeExperiment.title}</text>

                    {/* Component boxes */}
                    {activeExperiment.components.map((c, i) => {
                        const x = 60 + (i % 4) * 110;
                        const y = 85 + Math.floor(i / 4) * 100;
                        const colors: Record<string, string> = {
                            'ARDUINO_UNO': '#2c3e50', 'RASPBERRY_PI': '#1a7a3a', 'LED_LIGHT': '#ff4d4d',
                            'RESISTOR': '#d1b280', 'BREADBOARD': '#e8d5b7', 'POTENTIOMETER': '#7f8c8d',
                            'SWITCH': '#34495e', 'BATTERY': '#fbbf24', 'BUZZER': '#444', 'DHT11_SENSOR': '#00796b',
                        };
                        const labels: Record<string, string> = {
                            'ARDUINO_UNO': 'UNO', 'RASPBERRY_PI': 'RPi', 'LED_LIGHT': 'LED',
                            'RESISTOR': `R${c.value || ''}`, 'BREADBOARD': 'Board', 'POTENTIOMETER': 'POT',
                            'SWITCH': 'BTN', 'BATTERY': 'BAT', 'BUZZER': 'BZR', 'DHT11_SENSOR': 'DHT11',
                        };
                        return (
                            <g key={c.refId}>
                                <rect x={x} y={y} width="90" height="50" rx="6" fill={colors[c.type] || '#555'} stroke="#00d2ff" strokeWidth="1" opacity="0.9" />
                                <text x={x + 45} y={y + 30} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">{labels[c.type] || c.type}</text>
                            </g>
                        );
                    })}

                    {/* Wire count label */}
                    <text x="250" y="330" textAnchor="middle" fill="#636e72" fontSize="12">{activeExperiment.wiring.length} connections</text>
                </svg>

                {/* Step-by-step instructions */}
                <div className="logic-description" style={{ fontSize: isModal ? '13px' : '10px', marginTop: '8px', display: isModal ? 'block' : 'none' }}>
                    <p style={{ color: '#00d2ff', fontWeight: 700 }}>Steps ({currentStep + 1}/{activeExperiment.steps.length}):</p>
                    <ol style={{ paddingLeft: '18px', margin: '5px 0' }}>
                        {activeExperiment.steps.map((s, i) => (
                            <li key={i} style={{
                                color: i === currentStep ? '#00d2ff' : i < currentStep ? '#636e72' : '#94a3b8',
                                fontWeight: i === currentStep ? 700 : 400,
                                marginBottom: '4px',
                                textDecoration: i < currentStep ? 'line-through' : 'none'
                            }}>
                                {s.title}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        );
    }

    // Default: original blink diagram
    return (
        <div className={isModal ? "modal-content" : "diagram-mini"}>
            {!isModal && <h4 style={{ fontSize: '10px', margin: '0 0 5px 0', color: '#00d2ff' }}>Blink Sketch</h4>}
            <svg viewBox="0 0 500 350" className="blink-svg" style={{ maxHeight: isModal ? '400px' : '80px' }}>
                <rect x="50" y="50" width="160" height="230" rx="8" fill="#2c3e50" stroke="#00d2ff" strokeWidth="2" />
                <text x="130" y="160" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">UNO</text>
                <rect x="25" y="80" width="25" height="40" fill="#f1c40f" opacity="0.8" />
                <text x="0" y="70" fill="#f1c40f" fontSize="12">USB-PC</text>
                <circle cx="400" cy="100" r="18" fill="#ff4d4d" />
                <path d="M 400 118 L 400 170" stroke="#fff" strokeWidth="2" />
                <text x="430" y="105" fill="#ff4d4d" fontSize="14">LED</text>
                <rect x="385" y="170" width="30" height="60" rx="5" fill="#d1b280" />
                <path d="M 400 230 L 400 280" stroke="#fff" strokeWidth="2" />
                <rect x="385" y="185" width="30" height="4" fill="red" />
                <rect x="385" y="195" width="30" height="4" fill="red" />
                <rect x="385" y="205" width="30" height="4" fill="brown" />
                <path d="M 210 100 L 320 100 L 382 100" fill="none" stroke="#00d2ff" strokeWidth="4" />
                <text x="175" y="95" fill="#00d2ff" fontSize="14">PIN 13</text>
                <path d="M 210 280 L 320 280 L 400 280" fill="none" stroke="#fff" strokeWidth="4" opacity="0.8" />
                <text x="175" y="295" fill="#fff" fontSize="14">GND</text>
            </svg>

            <div className="logic-description" style={{ fontSize: isModal ? '14px' : '10px', marginTop: '10px', display: isModal ? 'block' : 'none' }}>
                <p><strong>Instructions:</strong></p>
                <ol>
                    <li>Place LED on Breadboard.</li>
                    <li>Connect Pin 13 from Arduino to the Positive (Long) leg of LED.</li>
                    <li>Connect the Resistor from the Negative leg of LED to GND.</li>
                </ol>
            </div>
        </div>
    );
};
