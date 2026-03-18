import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export const PerformanceMonitor: React.FC<{ visible: boolean }> = ({ visible }) => {
    const { gl } = useThree();
    const fpsRef = useRef<HTMLDivElement>(null);
    const callsRef = useRef<HTMLDivElement>(null);
    const trisRef = useRef<HTMLDivElement>(null);
    const memRef = useRef<HTMLDivElement>(null);

    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());

    useFrame(() => {
        if (!visible) return;
        frameCount.current++;
        const now = performance.now();
        if (now >= lastTime.current + 500) {
            const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
            if (fpsRef.current) fpsRef.current.innerText = `FPS: ${fps}`;
            if (callsRef.current) callsRef.current.innerText = `Draw Calls: ${gl.info.render.calls}`;
            if (trisRef.current) trisRef.current.innerText = `Triangles: ${gl.info.render.triangles}`;

            const performanceAny = performance as any;
            if (performanceAny.memory && memRef.current) {
                memRef.current.innerText = `Memory: ${Math.round(performanceAny.memory.usedJSHeapSize / 1048576)} MB`;
            }

            frameCount.current = 0;
            lastTime.current = now;
        }
    });

    if (!visible) return null;

    return (
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
                position: 'fixed',
                top: 20,
                right: 20,
                backgroundColor: 'rgba(0,0,0,0.85)',
                color: '#00e676',
                fontFamily: 'monospace',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 9999,
                border: '1px solid #1a1a1a',
                minWidth: '150px',
                backdropFilter: 'blur(4px)'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>Performance (VR)</div>
                <div ref={fpsRef}>FPS: 0</div>
                <div ref={callsRef}>Draw Calls: 0</div>
                <div ref={trisRef}>Triangles: 0</div>
                <div ref={memRef}>Memory: -</div>
            </div>
        </Html>
    );
};
