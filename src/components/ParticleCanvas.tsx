"use client";

import { useEffect, useRef } from "react";

interface Cell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  energy: number;
}

// Generative "sound cells" — particles that drift, divide and connect.
// If an AnalyserNode is provided, cells respond to real audio energy.
export default function ParticleCanvas({
  analyser,
  density = 70,
  className = "",
}: {
  analyser?: () => AnalyserNode | null;
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    const cells: Cell[] = [];
    const freq = new Uint8Array(256);
    const ACID = "212,255,47";
    const BONE = "240,237,227";

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (c?: Partial<Cell>): Cell => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      energy: 0,
      ...c,
    });
    for (let i = 0; i < density; i++) cells.push(spawn());

    let t = 0;
    let idleFrames = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.008;
      let amp = 0;
      let centroid = 0;
      const an = analyser?.();
      if (an) {
        an.getByteFrequencyData(freq);
        let sum = 0;
        let wsum = 0;
        for (let i = 0; i < freq.length; i++) {
          sum += freq[i];
          wsum += freq[i] * i;
        }
        amp = sum / freq.length / 255;
        centroid = sum > 0 ? wsum / sum / freq.length : 0;
        idleFrames = amp > 0.01 ? 0 : idleFrames + 1;
      }
      // throttle work when idle for a long time
      if (idleFrames > 600 && t % 0.016 > 0.008) return;

      ctx.clearRect(0, 0, w, h);

      for (const c of cells) {
        c.phase += 0.02 + amp * 0.15;
        const wob = Math.sin(c.phase) * (0.15 + amp * 1.4);
        c.x += c.vx + wob * 0.3;
        c.y += c.vy + Math.cos(c.phase * 0.8) * (0.1 + amp * 0.8);
        c.energy += (amp - c.energy) * 0.1;
        if (c.x < -20) c.x = w + 20;
        if (c.x > w + 20) c.x = -20;
        if (c.y < -20) c.y = h + 20;
        if (c.y > h + 20) c.y = -20;
        // occasional cell division
        if (
          !reduced &&
          cells.length < density * 2 &&
          Math.random() < 0.0004 + amp * 0.01
        ) {
          cells.push(
            spawn({
              x: c.x,
              y: c.y,
              vx: -c.vx * 1.5,
              vy: c.vy,
              r: c.r * 0.7,
            })
          );
          c.r *= 0.8;
        }
      }
      // merge back down
      while (cells.length > density) cells.splice((Math.random() * cells.length) | 0, 1);

      // connections
      const linkDist = 70 + amp * 60;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < cells.length; i++) {
        const a = cells[i];
        for (let j = i + 1; j < cells.length; j++) {
          const b = cells[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const al = (1 - Math.sqrt(d2) / linkDist) * (0.12 + amp * 0.5);
            ctx.strokeStyle = `rgba(${a.energy > 0.15 ? ACID : BONE},${al})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // nuclei
      for (const c of cells) {
        const r = c.r * (1 + c.energy * 2.5);
        const hot = c.energy > 0.18;
        ctx.fillStyle = hot
          ? `rgba(${ACID},${0.5 + c.energy})`
          : `rgba(${BONE},${0.25 + c.energy * 0.6})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (hot) {
          ctx.strokeStyle = `rgba(${ACID},0.25)`;
          ctx.beginPath();
          ctx.arc(c.x, c.y, r * 2.6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      void centroid;
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [analyser, density]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
