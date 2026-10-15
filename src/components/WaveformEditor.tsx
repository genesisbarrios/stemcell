"use client";

import { useEffect, useRef } from "react";
import { GrainFrame } from "@/audio/engine";
import { computePeaks } from "@/audio/waveform";

export default function WaveformEditor({
  buffer,
  regionStart,
  regionEnd,
  position,
  grainFrame,
  onRegion,
  onPosition,
}: {
  buffer: AudioBuffer | null;
  regionStart: number;
  regionEnd: number;
  position: number;
  grainFrame: React.MutableRefObject<GrainFrame | null>;
  onRegion: (a: number, b: number) => void;
  onPosition: (p: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<{ min: Float32Array; max: Float32Array } | null>(
    null
  );
  const dragRef = useRef<{ startX: number; startN: number; moved: boolean }>({
    startX: 0,
    startN: 0,
    moved: false,
  });
  const stateRef = useRef({ regionStart, regionEnd, position });
  stateRef.current = { regionStart, regionEnd, position };

  useEffect(() => {
    peaksRef.current = buffer ? computePeaks(buffer, 1400) : null;
  }, [buffer]);

  // drawing loop (reads mutable refs — no react re-render needed)
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
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
      const { regionStart: rs, regionEnd: re, position: pos } =
        stateRef.current;
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      const peaks = peaksRef.current;

      // grid
      ctx.strokeStyle = "#1e1e19";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      for (let i = 1; i < 8; i++) {
        ctx.moveTo((w / 8) * i, 0);
        ctx.lineTo((w / 8) * i, h);
      }
      ctx.stroke();

      if (peaks) {
        const n = peaks.min.length;
        const bw = w / n;
        // waveform
        ctx.fillStyle = "#6f6f63";
        for (let i = 0; i < n; i++) {
          const x = i * bw;
          const y1 = mid - peaks.max[i] * mid * 0.92;
          const y2 = mid - peaks.min[i] * mid * 0.92;
          ctx.fillRect(x, y1, Math.max(1, bw * 0.8), Math.max(1, y2 - y1));
        }
        // dim outside region
        ctx.fillStyle = "rgba(11,11,10,0.72)";
        ctx.fillRect(0, 0, rs * w, h);
        ctx.fillRect(re * w, 0, w - re * w, h);
        // region borders
        ctx.strokeStyle = "#d4ff2f";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rs * w, 0);
        ctx.lineTo(rs * w, h);
        ctx.moveTo(re * w, 0);
        ctx.lineTo(re * w, h);
        ctx.stroke();
        ctx.fillStyle = "rgba(212,255,47,0.08)";
        ctx.fillRect(rs * w, 0, (re - rs) * w, h);

        // grain markers
        const gf = grainFrame.current;
        if (gf) {
          ctx.fillStyle = "rgba(212,255,47,0.85)";
          for (let i = 0; i < gf.positions.length; i++) {
            const x = gf.positions[i] * w;
            ctx.fillRect(x, mid - 3 - ((i * 7) % 9), 1.5, 3);
          }
          // scan cursors
          ctx.strokeStyle = "rgba(212,255,47,0.9)";
          for (let i = 0; i < gf.scans.length; i++) {
            const s = gf.scans[i];
            if (s < 0) continue;
            ctx.beginPath();
            ctx.moveTo(s * w, 4);
            ctx.lineTo(s * w, h - 4);
            ctx.stroke();
          }
        }
        // position marker
        ctx.strokeStyle = "#f0ede3";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(pos * w, 0);
        ctx.lineTo(pos * w, h);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = "#3a3a32";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("no source loaded", w / 2, mid);
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [grainFrame]);

  const toNorm = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  return (
    <canvas
      ref={ref}
      className="h-full w-full cursor-crosshair touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          startX: e.clientX,
          startN: toNorm(e),
          moved: false,
        };
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!e.buttons) return;
        const n = toNorm(e);
        if (!d.moved && Math.abs(e.clientX - d.startX) > 6) d.moved = true;
        if (d.moved) {
          onRegion(Math.min(d.startN, n), Math.max(d.startN, n));
        }
      }}
      onPointerUp={(e) => {
        const d = dragRef.current;
        if (!d.moved) onPosition(toNorm(e));
        else {
          const n = toNorm(e);
          const a = Math.min(d.startN, n);
          const b = Math.max(d.startN, n);
          if (b - a < 0.005) onPosition(n);
        }
        d.moved = false;
      }}
      onDoubleClick={() => onRegion(0, 1)}
    />
  );
}
