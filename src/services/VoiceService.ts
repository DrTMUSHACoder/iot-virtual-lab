import { useAssistantStore } from '../store/useAssistantStore';
import { AudioService } from './AudioService';

/* ═══════════════════════════════════════════════════════════════════
   VoiceService — Throttled, Fallback-Aware Speech Engine
   ═══════════════════════════════════════════════════════════════════

   Priority:
     1. Web Speech API (desktop + some VR browsers)
     2. Subtitle-only fallback (if speech fails or is muted)

   Features:
     • 3-second cooldown prevents spam
     • Queue system for sequential messages
     • Automatic subtitle sync with AssistantStore
   ═══════════════════════════════════════════════════════════════════ */

class VoiceEngine {
    private synth: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;
    private speechQueue: string[] = [];
    private isProcessing = false;

    constructor() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.synth = window.speechSynthesis;
            this.initVoice();
        }
    }

    private initVoice() {
        if (!this.synth) return;

        const setPreferredVoice = () => {
            const voices = this.synth!.getVoices();
            if (voices.length === 0) return;

            // Prefer a clear English voice for the AI
            const preferred = [
                'Google UK English Female',
                'Samantha',
                'Zira',
                'Microsoft Zira',
            ];

            this.voice =
                voices.find(v => preferred.some(p => v.name.includes(p))) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
        };

        setPreferredVoice();

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = setPreferredVoice;
        }
    }

    /** Queue a speech message (respects cooldown + mute) */
    public speak(text: string) {
        const store = useAssistantStore.getState();

        // Always update subtitle (works even when muted or speech API unavailable)
        store.setMessage(text);

        // If muted, show subtitle only
        if (store.isMuted) {
            store.setMode('explaining');
            // Auto-clear subtitle after reading time
            setTimeout(() => {
                const current = useAssistantStore.getState();
                if (current.message === text) {
                    store.setMode('idle');
                }
            }, Math.max(3000, text.length * 60)); // ~60ms per character reading time
            return;
        }

        // Cooldown check
        if (!store.canSpeak()) {
            // Still show subtitle
            store.setMode('explaining');
            setTimeout(() => {
                const current = useAssistantStore.getState();
                if (current.message === text) {
                    store.setMode('idle');
                }
            }, 4000);
            return;
        }

        this.speechQueue.push(text);
        this.processQueue();
    }

    /** Process speech queue sequentially */
    private processQueue() {
        if (this.isProcessing || this.speechQueue.length === 0) return;

        const text = this.speechQueue.shift()!;
        this.isProcessing = true;

        const store = useAssistantStore.getState();
        store.markSpeech();

        // Play spatial/web-audio fallback sound for VR 
        AudioService.playAssistantMessage();

        // Try Web Speech API
        if (this.synth) {
            this.synth.cancel(); // Clear any pending

            const utterance = new SpeechSynthesisUtterance(text);
            if (this.voice) utterance.voice = this.voice;

            utterance.pitch = 1.1;
            utterance.rate = 1.0;

            utterance.onstart = () => {
                useAssistantStore.getState().setMode('explaining');
                useAssistantStore.getState().setMessage(text);
            };

            utterance.onend = () => {
                useAssistantStore.getState().setMode('idle');
                this.isProcessing = false;
                this.processQueue(); // Process next in queue
            };

            utterance.onerror = () => {
                // Fallback: subtitle-only
                useAssistantStore.getState().setMode('explaining');
                setTimeout(() => {
                    useAssistantStore.getState().setMode('idle');
                    this.isProcessing = false;
                    this.processQueue();
                }, 4000);
            };

            this.synth.speak(utterance);
        } else {
            // No speech API — subtitle fallback
            store.setMode('explaining');
            setTimeout(() => {
                useAssistantStore.getState().setMode('idle');
                this.isProcessing = false;
                this.processQueue();
            }, Math.max(3000, text.length * 60));
        }
    }

    /** Queue speech for a specific event type */
    public queueSpeech(text: string) {
        this.speechQueue.push(text);
        if (!this.isProcessing) this.processQueue();
    }

    /** Stop all speech immediately */
    public stop() {
        this.speechQueue = [];
        this.isProcessing = false;
        if (this.synth) this.synth.cancel();
        useAssistantStore.getState().setMode('idle');
    }

    /** Trigger a warning event (orange state) */
    public warn(text: string) {
        const store = useAssistantStore.getState();
        if (!store.canSpeak()) return;

        store.setMode('warning');
        store.setMessage(text);
        store.markSpeech();

        AudioService.playError();

        if (this.synth && !store.isMuted) {
            this.synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            if (this.voice) utterance.voice = this.voice;
            utterance.pitch = 0.9;
            utterance.rate = 0.95;

            utterance.onend = () => {
                useAssistantStore.getState().setMode('idle');
            };
            utterance.onerror = () => {
                setTimeout(() => useAssistantStore.getState().setMode('idle'), 4000);
            };

            this.synth.speak(utterance);
        } else {
            setTimeout(() => useAssistantStore.getState().setMode('idle'), 4000);
        }
    }
}

export const VoiceService = new VoiceEngine();
