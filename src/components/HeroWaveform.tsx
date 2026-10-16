"use client";

import { useEffect, useRef } from "react";

// Decorative animated "organism" — mirrors the synth's Visualizer
// (membrane ring + radial spectrum nucleus) but self-driven, no audio.
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
    const ACID = "63,216,240";

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

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += reduced ? 0.002 : 0.012;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.28;
      const amp = 0.6 + 0.4 * Math.sin(t * 0.9); // slow energy swell

      // membrane: organic wave deforms the ring
      ctx.beginPath();
      const N = 128;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const dev =
          Math.sin(a * 3 + t * 2) * 0.12 +
          Math.sin(a * 5 - t * 1.3) * 0.07 +
          Math.sin(a * 8 + t * 2.7) * 0.05;
        const breathe = Math.sin(t * 2 + a * 4) * 1.5;
        const r = base + dev * base * amp * 2 + breathe;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${ACID},0.9)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = `rgba(${ACID},${0.04 + amp * 0.05})`;
      ctx.fill();

      // spectrum nucleus — radial bars
      const bars = 48;
      for (let i = 0; i < bars; i++) {
        const v =
          ((Math.sin(i * 1.3 + t * 4) + 1) / 2) *
          (0.35 + 0.65 * ((Math.sin(i * 2.7 - t * 1.7) + 1) / 2)) *
          amp;
        const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const r0 = base * 0.18;
        const r1 = r0 + v * base * 0.55;
        ctx.strokeStyle = `rgba(${ACID},${0.2 + v * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // nucleus dot
      const spec = (Math.sin(t * 2.2) + 1) / 2;
      const nr = base * (0.1 + spec * 0.3 * amp);
      ctx.fillStyle = `rgba(${ACID},${0.5 + spec * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, nr * 0.35), 0, Math.PI * 2);
      ctx.fill();
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
