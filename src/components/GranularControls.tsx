"use client";

import { GranularParams } from "@/audio/types";
import ParamSlider from "./ParamSlider";

export default function GranularControls({
  params,
  onChange,
}: {
  params: GranularParams;
  onChange: <K extends keyof GranularParams>(k: K, v: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      <ParamSlider
        label="position"
        value={params.position}
        min={0}
        max={1}
        onChange={(v) => onChange("position", v)}
      />
      <ParamSlider
        label="grain size"
        value={params.grainSize}
        min={8}
        max={500}
        step={1}
        unit="ms"
        onChange={(v) => onChange("grainSize", v)}
      />
      <ParamSlider
        label="density"
        value={params.density}
        min={1}
        max={100}
        step={1}
        unit="/s"
        onChange={(v) => onChange("density", v)}
      />
      <ParamSlider
        label="spray"
        value={params.spray}
        min={0}
        max={1}
        onChange={(v) => onChange("spray", v)}
      />
      <ParamSlider
        label="speed"
        value={params.speed}
        min={-2}
        max={2}
        format={(v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
        onChange={(v) => onChange("speed", v)}
      />
      <ParamSlider
        label="pitch"
        value={params.transpose}
        min={-24}
        max={24}
        step={0.5}
        unit="st"
        format={(v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
        onChange={(v) => onChange("transpose", v)}
      />
      <ParamSlider
        label="pitch spray"
        value={params.pitchJitter}
        min={0}
        max={12}
        step={0.1}
        unit="st"
        onChange={(v) => onChange("pitchJitter", v)}
      />
      <ParamSlider
        label="texture"
        value={params.texture}
        min={0}
        max={1}
        onChange={(v) => onChange("texture", v)}
      />
      <ParamSlider
        label="stereo"
        value={params.spread}
        min={0}
        max={1}
        onChange={(v) => onChange("spread", v)}
      />
      <ParamSlider
        label="mix"
        value={params.mix}
        min={0}
        max={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange("mix", v)}
      />
    </div>
  );
}
