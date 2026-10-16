"use client";

import { useEffect, useRef } from "react";

// Decorative animated waveform — echoes the STEMCELL mark (waveform in a ring).
export default function HeroWaveform({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let t = Math.random() * 100;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // organic wave: layered inharmonic sines
    const wave = (u: number, ph: number) =>
      Math.sin(u * 6.5 + ph) * 0.55 +
      Math.sin(u * 11.3 - ph * 1.4) * 0.3 +
      Math.sin(u * 23.7 + ph * 0.6) * 0.15;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += reduced ? 0.004 : 0.022;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h);

      // faint ring — echoes the mark
      ctx.strokeStyle = "rgba(240,237,227,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      const span = R * 0.6;
      const amp = R * 0.15 * (0.75 + 0.25 * Math.sin(t * 0.7));
      const N = 140;
      const trace = (ph: number, jitter: number) => {
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const x = cx - span + u * span * 2;
          const env = Math.sin(u * Math.PI);
          const y =
            cy + wave(u * Math.PI * 2, ph) * amp * env +
            (Math.random() - 0.5) * jitter;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      ctx.strokeStyle = "rgba(176,231,235,0.35)";
      ctx.lineWidth = 1;
      trace(t - 0.9, reduced ? 0 : 0.8);

      ctx.strokeStyle = "#3fd8f0";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(63,216,240,0.55)";
      ctx.shadowBlur = 12;
      trace(t, reduced ? 0 : 1.6);
      ctx.shadowBlur = 0;
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
