"use client";

import { useRef } from "react";

// Rotary knob — drag vertically (or scroll) to change. Compact so more
// controls fit on one line than a fader.
export default function Knob({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const norm = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = -135 + norm * 270;

  const apply = (v: number) =>
    onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));

  const shown = format
    ? format(value)
    : `${value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2)}${unit}`;

  return (
    <div className="flex w-10 select-none flex-col items-center gap-0.5 sm:w-16">
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8 cursor-ns-resize touch-none sm:h-11 sm:w-11"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dv = ((drag.current.y - e.clientY) / 150) * (max - min);
          apply(drag.current.v + dv);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) =>
          apply(value - Math.sign(e.deltaY) * (max - min) * 0.04)
        }
      >
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="2.5"
          pathLength={360}
          strokeDasharray="270 360"
          transform="rotate(135 20 20)"
        />
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          stroke="var(--color-acid)"
          strokeWidth="2.5"
          pathLength={360}
          strokeDasharray={`${norm * 270} 360`}
          transform="rotate(135 20 20)"
        />
        <circle
          cx="20"
          cy="20"
          r="10.5"
          fill="var(--color-panel2)"
          stroke="var(--color-line)"
        />
        <line
          x1="20"
          y1="20"
          x2="20"
          y2="12"
          stroke="var(--color-bone)"
          strokeWidth="1.5"
          transform={`rotate(${angle} 20 20)`}
        />
      </svg>
      <span className="sc-label text-center leading-tight">{label}</span>
      <span className="sc-readout text-[9px]">{shown}</span>
    </div>
  );
}
