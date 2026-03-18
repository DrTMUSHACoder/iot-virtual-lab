import { create } from 'zustand';

/* ═══════════════════════════════════════════════════════════════════
   useAssistantStore — Event-Driven LabMate AI State Machine
   ═══════════════════════════════════════════════════════════════════

   States:
     idle       → calm breathing, quiet
     explaining → speaking experiment instructions
     warning    → circuit error, rings speed up, glow orange
     scanning   → user pointed at a component, about to explain
     disabled   → user muted the assistant
   ═══════════════════════════════════════════════════════════════════ */

export type AssistantMode = 'idle' | 'explaining' | 'warning' | 'scanning' | 'disabled';

interface AssistantState {
    mode: AssistantMode;
    message: string;
    targetComponent: string | null;
    isVisible: boolean;
    isMuted: boolean;

    // Cooldown tracking to prevent speech spam
    lastSpeechTime: number;
    cooldownMs: number;

    // Actions
    setMode: (mode: AssistantMode) => void;
    setMessage: (msg: string) => void;
    setTargetComponent: (id: string | null) => void;
    show: () => void;
    hide: () => void;
    toggleMute: () => void;

    /** Returns true if speech is allowed (cooldown elapsed) */
    canSpeak: () => boolean;

    /** Mark a speech event just happened */
    markSpeech: () => void;
}

const SPEECH_COOLDOWN_MS = 3000; // 3-second minimum between messages

export const useAssistantStore = create<AssistantState>((set, get) => ({
    mode: 'idle',
    message: '',
    targetComponent: null,
    isVisible: true,
    isMuted: false,

    lastSpeechTime: 0,
    cooldownMs: SPEECH_COOLDOWN_MS,

    setMode: (mode) => set({ mode }),
    setMessage: (message) => set({ message }),
    setTargetComponent: (targetComponent) => set({ targetComponent }),
    show: () => set({ isVisible: true }),
    hide: () => set({ isVisible: false }),
    toggleMute: () => {
        const muted = !get().isMuted;
        set({ isMuted: muted, mode: muted ? 'disabled' : 'idle' });
    },

    canSpeak: () => {
        const state = get();
        if (state.isMuted) return false;
        return Date.now() - state.lastSpeechTime >= state.cooldownMs;
    },

    markSpeech: () => set({ lastSpeechTime: Date.now() }),
}));
