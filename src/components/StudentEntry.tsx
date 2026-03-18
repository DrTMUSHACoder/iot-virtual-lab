import React, { useState, useCallback } from 'react';
import { MicroscopeIcon, AlertTriangle, Rocket, Lock } from 'lucide-react';

/*
 * StudentEntry — Professional entry panel for the VR IoT Lab.
 *
 * Requires Name and Roll Number before lab access.
 * Stores session data in memory for tracking/personalization.
 * VR-optimized: large fonts, clean layout, centered panel.
 */

export interface StudentSession {
    name: string;
    rollNumber: string;
    startTime: Date;
    experiments: {
        id: string;
        title: string;
        startedAt: Date;
        completedAt?: Date;
        stepsCompleted: number;
        totalSteps: number;
    }[];
}

interface StudentEntryProps {
    onStart: (session: StudentSession) => void;
}

export const StudentEntry: React.FC<StudentEntryProps> = ({ onStart }) => {
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [error, setError] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    const validate = useCallback(() => {
        const trimName = name.trim();
        const trimRoll = rollNumber.trim();

        if (!trimName) {
            setError('Please enter your full name.');
            return false;
        }
        if (trimName.length < 2) {
            setError('Name must be at least 2 characters.');
            return false;
        }
        if (!trimRoll) {
            setError('Please enter your roll number.');
            return false;
        }
        if (!/^[a-zA-Z0-9\-\/]+$/.test(trimRoll)) {
            setError('Roll number must be alphanumeric (letters, numbers, - or /).');
            return false;
        }
        setError('');
        return true;
    }, [name, rollNumber]);

    const handleStart = useCallback(() => {
        if (!validate()) return;

        setIsAnimating(true);
        setTimeout(() => {
            onStart({
                name: name.trim(),
                rollNumber: rollNumber.trim(),
                startTime: new Date(),
                experiments: [],
            });
        }, 600);
    }, [name, rollNumber, validate, onStart]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleStart();
    };

    const isValid = name.trim().length >= 2 && rollNumber.trim().length > 0;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 30%, #1b2838 60%, #0a0a1a 100%)',
            fontFamily: "'Poppins', 'Segoe UI', system-ui, sans-serif",
            overflow: 'hidden',
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
            {/* Background grid pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(0,210,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,210,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                pointerEvents: 'none',
            }} />

            {/* Ambient glow */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,210,255,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Entry Card */}
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(0, 210, 255, 0.2)',
                padding: '48px',
                width: '440px',
                maxWidth: '92vw',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,210,255,0.05)',
                position: 'relative',
            }}>
                {/* Logo / Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        marginBottom: '8px',
                        filter: 'drop-shadow(0 0 15px rgba(0,210,255,0.3))',
                        color: '#00d2ff',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <MicroscopeIcon size={48} />
                    </div>
                    <h1 style={{
                        color: '#fff',
                        fontSize: '28px',
                        fontWeight: 700,
                        margin: '0 0 4px 0',
                        letterSpacing: '-0.02em',
                    }}>
                        IoT Virtual Laboratory
                    </h1>
                    <p style={{
                        color: 'rgba(148, 163, 184, 0.8)',
                        fontSize: '14px',
                        margin: '0 0 6px 0',
                        letterSpacing: '0.05em',
                    }}>
                        STUDENT SESSION LOGIN
                    </p>
                    <p style={{
                        color: '#00d2ff',
                        fontSize: '12px',
                        margin: 0,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                    }}>
                        Ramachandra College of Engineering
                    </p>
                </div>

                {/* Name Field */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your full name"
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(0, 210, 255, 0.15)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '17px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(0,210,255,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(0,210,255,0.15)'}
                    />
                </div>

                {/* Roll Number Field */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block',
                        color: '#94a3b8',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}>
                        Roll Number
                    </label>
                    <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => { setRollNumber(e.target.value); setError(''); }}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. 21CS101"
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(0, 210, 255, 0.15)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '17px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(0,210,255,0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(0,210,255,0.15)'}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '18px',
                        color: '#f87171',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    disabled={!isValid}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: isValid
                            ? 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)'
                            : 'rgba(30, 41, 59, 0.6)',
                        border: isValid
                            ? '1px solid rgba(0, 210, 255, 0.4)'
                            : '1px solid rgba(100, 116, 139, 0.2)',
                        borderRadius: '12px',
                        color: isValid ? '#fff' : 'rgba(148, 163, 184, 0.5)',
                        fontSize: '17px',
                        fontWeight: 700,
                        cursor: isValid ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.03em',
                        transition: 'all 0.3s ease',
                        boxShadow: isValid ? '0 4px 20px rgba(0, 180, 216, 0.3)' : 'none',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isValid ? <Rocket size={20} /> : <Lock size={20} />}
                        {isValid ? 'Start Lab Session' : 'Fill All Fields to Continue'}
                    </div>
                </button>

                {/* Footer info */}
                <p style={{
                    textAlign: 'center',
                    color: 'rgba(148, 163, 184, 0.4)',
                    fontSize: '12px',
                    marginTop: '20px',
                    marginBottom: 0,
                }}>
                    Your session will be tracked for academic purposes
                </p>
            </div>
        </div>
    );
};
