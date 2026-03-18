
import React, { useEffect, useRef } from 'react';
import { useXR } from '@react-three/xr';

/* ═══════════════════════════════════════════════════════════════════
   AMBIENT AUDIO — Procedural environmental sound for VR immersion
   
   Generates subtle background audio using Web Audio API:
   - Soft fan/AC hum (low frequency oscillator)
   - Filtered noise for distant hallway ambience
   
   No external audio files needed.
   Auto-starts when VR session begins. Volume kept very low.
   Cleans up on unmount.
   ═══════════════════════════════════════════════════════════════════ */

export const AmbientAudio: React.FC = () => {
    const { isPresenting } = useXR();
    const audioCtxRef = useRef<AudioContext | null>(null);
    const nodesRef = useRef<AudioNode[]>([]);

    useEffect(() => {
        if (!isPresenting) {
            // Stop audio when leaving VR
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => { });
                audioCtxRef.current = null;
                nodesRef.current = [];
            }
            return;
        }

        // Create audio context on VR entry
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.06; // Very low volume
        masterGain.connect(ctx.destination);

        // ── Fan Hum: Low-frequency oscillator ──
        const fanOsc = ctx.createOscillator();
        fanOsc.type = 'sine';
        fanOsc.frequency.value = 55; // Low hum (~55Hz)

        const fanGain = ctx.createGain();
        fanGain.gain.value = 0.3;

        // Add a subtle second harmonic for realism
        const fanOsc2 = ctx.createOscillator();
        fanOsc2.type = 'sine';
        fanOsc2.frequency.value = 110;
        const fanGain2 = ctx.createGain();
        fanGain2.gain.value = 0.08;

        fanOsc.connect(fanGain);
        fanGain.connect(masterGain);
        fanOsc2.connect(fanGain2);
        fanGain2.connect(masterGain);

        fanOsc.start();
        fanOsc2.start();

        // ── Hallway Ambience: Filtered noise ──
        // Create white noise buffer
        const bufferSize = ctx.sampleRate * 2; // 2 seconds
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // Low-pass filter for muffled hallway sound
        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = 300;
        lpFilter.Q.value = 1;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.15;

        noiseSource.connect(lpFilter);
        lpFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSource.start();

        // Fade in gently
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);

        // ── Outdoor Wind: Modulated noise ──
        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 400;

        const windLFO = ctx.createOscillator();
        windLFO.frequency.value = 0.15; // Slow wind variation
        const windLFOGain = ctx.createGain();
        windLFOGain.gain.value = 300; // Sweep 400Hz +/- 300Hz

        windLFO.connect(windLFOGain);
        windLFOGain.connect(windFilter.frequency);
        windLFO.start();

        const windGain = ctx.createGain();
        windGain.gain.value = 0.08; // Gentle wind volume

        // Reuse white noise buffer for wind
        noiseSource.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);

        // ── Procedural Bird Chirps ──
        const chirpInterval = setInterval(() => {
            if (ctx.state !== 'running') return;
            if (Math.random() > 0.4) return; // 60% chance to play a bird sound

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            const baseFreq = 2500 + Math.random() * 1500;
            osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 800, ctx.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

            osc.connect(gainNode);
            gainNode.connect(masterGain);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        }, 2500);

        // ── Distant Bus Engine Idle ──
        const busOsc = ctx.createOscillator();
        busOsc.type = 'sawtooth';
        busOsc.frequency.value = 35; // Very low rumble
        const busGain = ctx.createGain();
        busGain.gain.value = 0.02; // Barely audible
        const busFilter = ctx.createBiquadFilter();
        busFilter.type = 'lowpass';
        busFilter.frequency.value = 80;
        busOsc.connect(busFilter);
        busFilter.connect(busGain);
        busGain.connect(masterGain);
        busOsc.start();

        nodesRef.current = [fanOsc, fanOsc2, noiseSource, windLFO, busOsc];

        return () => {
            clearInterval(chirpInterval);
            // Cleanup
            try {
                fanOsc.stop();
                fanOsc2.stop();
                noiseSource.stop();
            } catch { /* already stopped */ }
            if (ctx.state !== 'closed') {
                ctx.close().catch(() => { });
            }
            audioCtxRef.current = null;
            nodesRef.current = [];
        };
    }, [isPresenting]);

    return null; // Audio-only component, no visual output
};
