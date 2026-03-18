import React, { useState, useEffect } from 'react';
import { Save, Download, X } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';

export const LabNotebook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const activeExperiment = useLabStore(state => state.activeExperiment);
    const [notes, setNotes] = useState('');
    const [observations, setObservations] = useState('');

    const storageKey = `notebook_${activeExperiment?.id || 'default'}`;

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setNotes(data.notes || '');
                setObservations(data.observations || '');
            } catch (e) {
                console.error('Failed to load notebook data', e);
            }
        } else {
            setNotes('');
            setObservations('');
        }
    }, [storageKey]);

    const handleSave = () => {
        localStorage.setItem(storageKey, JSON.stringify({ notes, observations }));
    };

    const handleExport = () => {
        handleSave();
        const content = `Digital Lab Notebook\nExperiment: ${activeExperiment?.title || 'Free Play'}\n\nObservations:\n${observations}\n\nNotes:\n${notes}\n`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-notebook-${activeExperiment?.id || 'free-play'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            position: 'absolute',
            top: '80px',
            right: '24px',
            width: '400px',
            backgroundColor: 'rgba(10, 22, 40, 0.95)',
            border: '1px solid #00e676',
            borderRadius: '12px',
            padding: '20px',
            color: '#fff',
            zIndex: 1000,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,230,118,0.15)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#00e676', fontSize: '18px' }}>Lab Notebook</h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '14px', color: '#8892b0' }}>
                Experiment: <strong style={{ color: '#fff' }}>{activeExperiment?.title || 'Free Play'}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#00e676' }}>Observations / Results</label>
                <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Record your experiment observations here..."
                    style={{
                        width: '100%', height: '100px', backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid #1d4ed8', borderRadius: '4px', color: '#fff',
                        padding: '10px', resize: 'vertical', fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#00e676' }}>Additional Notes</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any conclusions, errors encountered, or next steps..."
                    style={{
                        width: '100%', height: '100px', backgroundColor: 'rgba(0,0,0,0.5)',
                        border: '1px solid #1d4ed8', borderRadius: '4px', color: '#fff',
                        padding: '10px', resize: 'vertical', fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                    onClick={handleSave}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        backgroundColor: '#1d4ed8', border: 'none', borderRadius: '4px',
                        color: '#fff', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    <Save size={16} /> Save Local
                </button>
                <button
                    onClick={handleExport}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        backgroundColor: '#00e676', border: 'none', borderRadius: '4px',
                        color: '#000', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    <Download size={16} /> Export .txt
                </button>
            </div>
        </div>
    );
};
