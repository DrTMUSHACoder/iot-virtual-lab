/**
 * AudioService.ts
 * 
 * Provides simple synthesized sound effects using the Web Audio API
 * to enhance the VR and desktop interactions without needing external asset files.
 */

class AudioEngine {
    private ctx: AudioContext | null = null;
    private initialized = false;
    private activeBuzzers: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();

    private init() {
        if (!this.initialized && typeof window !== 'undefined') {
            try {
                this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.initialized = true;
            } catch (e) {
                console.warn('Web Audio API not supported', e);
            }
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playClick() {
        this.playTone(800, 'sine', 0.1, 0.05);
    }

    public playConnect() {
        this.playTone(600, 'square', 0.15, 0.03);
    }

    public playSuccess() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        // Arpeggio
        setTimeout(() => this.playTone(440, 'sine', 0.2, 0.1), 0);
        setTimeout(() => this.playTone(554, 'sine', 0.2, 0.1), 100);
        setTimeout(() => this.playTone(659, 'sine', 0.4, 0.15), 200);
    }

    public playGrab() {
        // Soft mechanical thud
        this.playTone(150, 'triangle', 0.08, 0.05);
    }

    public playSnap() {
        // Crisp click
        this.playTone(800, 'square', 0.04, 0.02);
        setTimeout(() => this.playTone(1200, 'sine', 0.05, 0.04), 20);
    }

    public playError() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        setTimeout(() => this.playTone(200, 'sawtooth', 0.2, 0.1), 0);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.3, 0.1), 150);
    }

    public playAssistantMessage() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Sci-fi friendly double chirp for the assistant
        setTimeout(() => this.playTone(880, 'sine', 0.1, 0.05), 0);
        setTimeout(() => this.playTone(1108, 'sine', 0.15, 0.05), 100);
    }

    /** Short soft release pop */
    public playRelease() {
        this.playTone(400, 'sine', 0.06, 0.04);
    }

    /** Electric zap for wire connection */
    public playWireConnect() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        setTimeout(() => this.playTone(220, 'sawtooth', 0.08, 0.06), 0);
        setTimeout(() => this.playTone(660, 'sine', 0.12, 0.08), 40);
        setTimeout(() => this.playTone(880, 'sine', 0.2, 0.05), 100);
    }

    /** Power-up hum for simulation start */
    public playSimulationStart() {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        setTimeout(() => this.playTone(110, 'triangle', 0.4, 0.06), 0);
        setTimeout(() => this.playTone(220, 'sine', 0.3, 0.06), 100);
        setTimeout(() => this.playTone(330, 'sine', 0.3, 0.08), 200);
    }

    public startBuzzer(id: string, freq: number = 2000) {
        if (!this.ctx) this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.activeBuzzers.has(id)) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.02);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        this.activeBuzzers.set(id, { osc, gain });
    }

    public stopBuzzer(id: string) {
        const buzzer = this.activeBuzzers.get(id);
        if (buzzer && this.ctx) {
            const { osc, gain } = buzzer;
            gain.gain.cancelScheduledValues(this.ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.02);

            setTimeout(() => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) { }
                this.activeBuzzers.delete(id);
            }, 30);
        }
    }
}

export const AudioService = new AudioEngine();

