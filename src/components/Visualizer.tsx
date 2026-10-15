"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/audio/engine";

// Signature visual: a "cell" organism — radial membrane deformed by the
// oscilloscope, with a spectrum nucleus. Driven by real analyser data.
export default function Visualizer() {
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
    let t = 0;
    let idle = 0;
    const time = new Uint8Array(1024);
    const freq = new Uint8Array(512);
    const trail: number[] = [];

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
      const an = engine.analyser;
      if (!an || !engine.ctx) return;
      an.getByteTimeDomainData(time);
      an.getByteFrequencyData(freq);

      let amp = 0;
      for (let i = 0; i < time.length; i += 4)
        amp = Math.max(amp, Math.abs(time[i] - 128) / 128);
      let spec = 0;
      for (let i = 2; i < 200; i++) spec += freq[i];
      spec /= 198 * 255;

      if (amp < 0.01 && spec < 0.01) idle++;
      else idle = 0;
      if (idle > 900) return; // sleep when silent for a while
      t += reduced ? 0.002 : 0.01;

      trail.push(amp);
      if (trail.length > 140) trail.shift();

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.28;

      // amplitude trail — faint ghost cells
      ctx.strokeStyle = "rgba(131,131,122,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const r = base * (0.6 + trail[i] * 1.4);
        const a = (i / trail.length) * Math.PI * 2 + t;
        const x = cx + Math.cos(a) * (r + 8 + i * 0.06);
        const y = cy + Math.sin(a) * (r + 8 + i * 0.06);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // membrane: scope data deforms a circle
      ctx.beginPath();
      const N = 128;
      for (let i = 0; i <= N; i++) {
        const td = time[(i / N) * time.length | 0];
        const dev = (td - 128) / 128;
        const breathe = Math.sin(t * 2 + (i / N) * Math.PI * 4) * 2;
        const r = base + dev * base * 0.9 + breathe;
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = amp > 0.02 ? "#d4ff2f" : "#4a4a40";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = `rgba(212,255,47,${Math.min(0.12, amp * 0.2)})`;
      ctx.fill();

      // spectrum nucleus — radial bars
      const bars = 48;
      for (let i = 0; i < bars; i++) {
        const fi = Math.pow(i / bars, 1.6) * 220 + 2;
        const v = freq[fi | 0] / 255;
        const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const r0 = base * 0.18;
        const r1 = r0 + v * base * 0.5;
        ctx.strokeStyle = `rgba(212,255,47,${0.25 + v * 0.75})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // nucleus dot
      const nr = base * (0.1 + spec * 0.35);
      ctx.fillStyle = `rgba(212,255,47,${0.5 + spec * 0.5})`;
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

  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />;
}
