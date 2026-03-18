
import React, { useState } from 'react';
import { BookOpen, Cpu, Package, Microscope, Book, CheckCircle2, Play } from 'lucide-react';
import { useLabStore } from '../store/useLabStore';
import { EXPERIMENTS } from '../data/experiments';
import type { ExperimentCategory } from '../types';

interface ExperimentSelectorProps {
    onClose: () => void;
}

export const ExperimentSelector: React.FC<ExperimentSelectorProps> = ({ onClose }) => {
    const loadExperiment = useLabStore(state => state.loadExperiment);
    const quizScores = useLabStore(state => state.quizScores);
    const [filter, setFilter] = useState<ExperimentCategory | 'All'>('All');

    const filtered = filter === 'All'
        ? EXPERIMENTS
        : EXPERIMENTS.filter(e => e.category === filter);

    const handleLoad = (expId: string) => {
        const exp = EXPERIMENTS.find(e => e.id === expId);
        if (exp) {
            loadExperiment(exp);
            onClose();
        }
    };

    const difficultyColor: Record<string, string> = {
        'Beginner': '#27ae60',
        'Intermediate': '#f39c12',
        'Advanced': '#e74c3c',
    };

    return (
        <div className="experiment-selector">
            <div className="exp-selector-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={24} /> Experiments
                </h2>
                <button className="exp-close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Filter Tabs */}
            <div className="exp-filter-tabs">
                {(['All', 'Arduino', 'Raspberry Pi'] as const).map(cat => (
                    <button
                        key={cat}
                        className={`exp-filter-tab ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {cat === 'Arduino' ? <Cpu size={16} /> : cat === 'Raspberry Pi' ? <Package size={16} /> : <Microscope size={16} />}
                        {cat}
                    </button>
                ))}
            </div>

            {/* Experiment Cards */}
            <div className="exp-cards-grid">
                {filtered.map(exp => {
                    const score = quizScores[exp.id];
                    const hasQuiz = exp.quiz && exp.quiz.length > 0;
                    return (
                        <div key={exp.id} className="exp-card">
                            <div className="exp-card-icon">{exp.icon}</div>
                            <div className="exp-card-body">
                                <div className="exp-card-header">
                                    <h3>{exp.title}</h3>
                                    <span
                                        className="exp-difficulty"
                                        style={{ background: difficultyColor[exp.difficulty] + '22', color: difficultyColor[exp.difficulty], borderColor: difficultyColor[exp.difficulty] }}
                                    >
                                        {exp.difficulty}
                                    </span>
                                </div>
                                <p className="exp-card-desc">{exp.description}</p>

                                {/* Learning Objective */}
                                {exp.learning && (
                                    <div style={{ fontSize: '11px', color: '#00d2ff', margin: '4px 0', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <Book size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <span><strong>{exp.learning.concept}</strong> — {exp.learning.objective}</span>
                                    </div>
                                )}

                                <div className="exp-card-meta">
                                    <span className="exp-category-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {exp.category === 'Arduino' ? <Cpu size={14} /> : <Package size={14} />} {exp.category}
                                    </span>
                                    <span className="exp-parts-count">
                                        {exp.components.length} parts · {exp.steps.length} steps
                                        {hasQuiz && ` · ${exp.quiz!.length}Q`}
                                    </span>
                                    {score && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: score.score === score.total ? '#27ae60' : '#f39c12',
                                            marginLeft: 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <CheckCircle2 size={12} /> {score.score}/{score.total}
                                        </span>
                                    )}
                                </div>
                                <button className="exp-load-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => handleLoad(exp.id)}>
                                    <Play size={14} /> Load Experiment
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
