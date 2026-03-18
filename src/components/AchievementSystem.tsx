
import React, { useEffect } from 'react';
import {
    Plug, Zap, Clock, Target, Wand2, Wrench, Map, Sparkles,
    Activity, Save, Trophy, CheckCircle2, Lock
} from 'lucide-react';

/*
 * AchievementSystem — Tracks and displays student accomplishments.
 *
 * Achievements are unlocked based on student actions (experiments completed,
 * quiz scores, circuit builds, etc.) and stored in localStorage.
 */

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    unlockedAt?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'first-circuit', title: 'First Circuit', description: 'Complete your first experiment', icon: <Plug size={24} /> },
    { id: 'perfect-score', title: 'Perfect Score', description: 'Get 100% on a quiz', icon: <Zap size={24} /> },
    { id: 'speed-builder', title: 'Speed Builder', description: 'Complete an experiment in under 2 minutes', icon: <Clock size={24} /> },
    { id: 'wire-master', title: 'Wire Master', description: 'Connect 10 wires correctly on first try', icon: <Target size={24} /> },
    { id: 'circuit-wizard', title: 'Circuit Wizard', description: 'Complete 5 different experiments', icon: <Wand2 size={24} /> },
    { id: 'debugger', title: 'Debugger', description: 'Fix a circuit error detected by the system', icon: <Wrench size={24} /> },
    { id: 'explorer', title: 'Explorer', description: 'Try both Arduino and Raspberry Pi experiments', icon: <Map size={24} /> },
    { id: 'flow-master', title: 'Flow Master', description: 'Use the current flow visualization', icon: <Sparkles size={24} /> },
    { id: 'instrument-pro', title: 'Instrument Pro', description: 'Use the oscilloscope during simulation', icon: <Activity size={24} /> },
    { id: 'saver', title: 'Circuit Saver', description: 'Save your first circuit design', icon: <Save size={24} /> },
    { id: 'easter-egg', title: 'Campus Explorer', description: 'Find all the hidden campus easter eggs', icon: <Sparkles size={24} /> },
];

const STORAGE_KEY = 'vr-iot-lab-achievements';

export function getUnlockedAchievements(): Record<string, number> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function unlockAchievement(id: string): boolean {
    const unlocked = getUnlockedAchievements();
    if (unlocked[id]) return false; // Already unlocked
    unlocked[id] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    return true;
}

/*
 * AchievementToast — Floating notification when an achievement is unlocked.
 */
export const AchievementToast: React.FC<{ achievement: Achievement; onDismiss: () => void }> = ({
    achievement,
    onDismiss
}) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="achievement-toast">
            <div className="achievement-icon" style={{ display: 'flex' }}>{achievement.icon}</div>
            <div className="achievement-body">
                <div className="achievement-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trophy size={14} /> Achievement Unlocked!
                </div>
                <div className="achievement-title">{achievement.title}</div>
                <div className="achievement-desc">{achievement.description}</div>
            </div>
        </div>
    );
};

/*
 * AchievementPanel — Shows all achievements status.
 */
export const AchievementPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const unlocked = getUnlockedAchievements();
    const total = ACHIEVEMENTS.length;
    const unlockedCount = Object.keys(unlocked).length;

    return (
        <div className="achievement-panel">
            <div className="achievement-panel-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={20} color="#fbbf24" />
                    Achievements ({unlockedCount}/{total})
                </h3>
                <button onClick={onClose}>✕</button>
            </div>
            <div className="achievement-progress-bar">
                <div
                    className="achievement-progress-fill"
                    style={{ width: `${(unlockedCount / total) * 100}%` }}
                />
            </div>
            <div className="achievement-list">
                {ACHIEVEMENTS.map(a => {
                    const isUnlocked = !!unlocked[a.id];
                    return (
                        <div key={a.id} className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                            <span className="achievement-card-icon" style={{ display: 'flex' }}>
                                {isUnlocked ? a.icon : <Lock size={20} />}
                            </span>
                            <div className="achievement-card-body">
                                <div className="achievement-card-title">{a.title}</div>
                                <div className="achievement-card-desc">{a.description}</div>
                            </div>
                            {isUnlocked && (
                                <span className="achievement-card-check" style={{ display: 'flex' }}><CheckCircle2 size={16} color="#27ae60" /></span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
