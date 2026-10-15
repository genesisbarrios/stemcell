"use client";

export default function ParamSlider({
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
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="sc-label">{label}</span>
        <span className="sc-readout">
          {format ? format(value) : value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="sc-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  );
}
