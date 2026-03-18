
import React, { useState } from 'react';
import { Trophy, CheckCircle2, BookOpen, BrainCircuit } from 'lucide-react';
import type { QuizQuestion } from '../types';

/*
 * QuizPanel — Renders after experiment completion.
 *
 * Displays quiz questions from the active experiment's learning system.
 * Tracks score and shows explanations after each answer.
 */

interface QuizPanelProps {
    questions: QuizQuestion[];
    onComplete: (score: number, total: number) => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({ questions, onComplete }) => {
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);

    const question = questions[currentQ];
    if (!question && !completed) return null;

    const handleSelect = (idx: number) => {
        if (showExplanation) return; // already answered
        setSelectedIdx(idx);
        setShowExplanation(true);
        if (question.options[idx].correct) {
            setScore(s => s + 1);
        }
    };

    const handleNext = () => {
        if (currentQ + 1 < questions.length) {
            setCurrentQ(q => q + 1);
            setSelectedIdx(null);
            setShowExplanation(false);
        } else {
            setCompleted(true);
            onComplete(score + (selectedIdx !== null && question.options[selectedIdx].correct ? 0 : 0), questions.length);
            // Score already includes this answer from handleSelect
            onComplete(score, questions.length);
        }
    };

    if (completed) {
        const pct = Math.round((score / questions.length) * 100);
        return (
            <div className="quiz-panel quiz-complete">
                <div className="quiz-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="quiz-icon"><Trophy size={20} color="#fbbf24" /></span>
                    <h3>Quiz Complete!</h3>
                </div>
                <div className="quiz-score">
                    <div className="score-circle" style={{
                        background: `conic-gradient(${pct >= 70 ? '#00e676' : '#ff9800'} ${pct}%, #1e293b ${pct}%)`
                    }}>
                        <span>{pct}%</span>
                    </div>
                    <p>{score} / {questions.length} correct</p>
                    {pct >= 70 ? (
                        <p className="quiz-pass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={16} /> Great understanding!</p>
                    ) : (
                        <p className="quiz-retry" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><BookOpen size={16} /> Review the concept and try again.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="quiz-panel">
            <div className="quiz-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="quiz-icon"><BrainCircuit size={20} color="#00d2ff" /></span>
                <h3>Knowledge Check</h3>
                <span className="quiz-progress">{currentQ + 1} / {questions.length}</span>
            </div>

            <p className="quiz-question">{question.question}</p>

            <div className="quiz-options">
                {question.options.map((opt, idx) => {
                    let className = 'quiz-option';
                    if (showExplanation) {
                        if (opt.correct) className += ' correct';
                        else if (idx === selectedIdx) className += ' incorrect';
                    } else if (idx === selectedIdx) {
                        className += ' selected';
                    }
                    return (
                        <button
                            key={idx}
                            className={className}
                            onClick={() => handleSelect(idx)}
                            disabled={showExplanation}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                            {opt.text}
                        </button>
                    );
                })}
            </div>

            {showExplanation && (
                <div className="quiz-explanation">
                    <p>{question.explanation}</p>
                    <button className="quiz-next-btn" onClick={handleNext}>
                        {currentQ + 1 < questions.length ? 'Next Question →' : 'See Results'}
                    </button>
                </div>
            )}
        </div>
    );
};
