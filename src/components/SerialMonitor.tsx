
import React, { useRef, useEffect } from 'react';
import { useLabStore } from '../store/useLabStore';

interface SerialMonitorProps {
    isVR?: boolean;
}

export const SerialMonitor: React.FC<SerialMonitorProps> = ({ isVR = false }) => {
    const serialOutput = useLabStore(state => state.serialOutput);
    const clearSerialOutput = useLabStore(state => state.clearSerialOutput);
    const isSimulating = useLabStore(state => state.isSimulating);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [serialOutput]);

    return (
        <div style={{
            background: 'rgba(5, 5, 5, 0.98)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: isVR ? '16px' : '12px',
            overflow: 'hidden',
            fontFamily: "'Courier New', monospace",
            width: isVR ? '500px' : '380px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0, 230, 118, 0.03)',
        }}>
            {/* Header bar */}
            <div style={{
                background: 'rgba(0, 230, 118, 0.08)',
                borderBottom: '1px solid rgba(0, 230, 118, 0.2)',
                padding: isVR ? '12px 16px' : '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isSimulating ? '#00e676' : '#555',
                        boxShadow: isSimulating ? '0 0 6px #00e676' : 'none',
                        display: 'inline-block',
                    }} />
                    <span style={{
                        color: '#00e676',
                        fontSize: isVR ? '16px' : '11px',
                        fontWeight: 700,
                        letterSpacing: '1px',
                    }}>
                        SERIAL MONITOR
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                        color: '#4a5568',
                        fontSize: isVR ? '14px' : '9px',
                        fontFamily: 'monospace',
                    }}>
                        9600 baud
                    </span>
                    <button
                        onClick={clearSerialOutput}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: isVR ? '6px 14px' : '3px 8px',
                            borderRadius: '6px',
                            fontSize: isVR ? '14px' : '9px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            pointerEvents: 'auto',
                        }}
                    >
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Output area */}
            <div
                ref={scrollRef}
                style={{
                    padding: isVR ? '14px 16px' : '10px 12px',
                    maxHeight: isVR ? '400px' : '200px',
                    overflowY: 'auto',
                    minHeight: isVR ? '200px' : '100px',
                }}
            >
                {serialOutput.length === 0 ? (
                    <div style={{
                        color: '#4a5568',
                        fontSize: isVR ? '14px' : '10px',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        padding: '20px',
                    }}>
                        {isSimulating ? 'Waiting for serial data...' : 'Start simulation to see output'}
                    </div>
                ) : (
                    serialOutput.map((line, i) => (
                        <div
                            key={i}
                            style={{
                                color: line.startsWith('[ERROR]') ? '#ef4444'
                                    : line.startsWith('[WARN]') ? '#f59e0b'
                                        : '#00e676',
                                fontSize: isVR ? '14px' : '10px',
                                lineHeight: '1.6',
                                fontFamily: "'Courier New', monospace",
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            <span style={{ color: '#4a5568', marginRight: '6px', userSelect: 'none' }}>
                                {String(i + 1).padStart(3, ' ')}│
                            </span>
                            {line}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom status */}
            <div style={{
                borderTop: '1px solid rgba(0, 230, 118, 0.1)',
                padding: isVR ? '8px 16px' : '4px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{
                    color: '#4a5568',
                    fontSize: isVR ? '12px' : '8px',
                    fontFamily: 'monospace',
                }}>
                    {serialOutput.length} lines
                </span>
                <span style={{
                    color: isSimulating ? '#00e676' : '#4a5568',
                    fontSize: isVR ? '12px' : '8px',
                    fontFamily: 'monospace',
                }}>
                    {isSimulating ? '● CONNECTED' : '○ IDLE'}
                </span>
            </div>
        </div>
    );
};
