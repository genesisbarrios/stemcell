"use client";

import { FxParams } from "@/audio/types";
import Knob from "./Knob";

export default function EffectsPanel({
  fx,
  onChange,
}: {
  fx: FxParams;
  onChange: <K extends keyof FxParams>(k: K, v: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-3">
      <Knob
        label="high-pass"
        value={fx.hp}
        min={20}
        max={4000}
        step={1}
        unit="hz"
        format={(v) => `${Math.round(v)}`}
        onChange={(v) => onChange("hp", v)}
      />
      <Knob
        label="low-pass"
        value={fx.lp}
        min={400}
        max={18000}
        step={1}
        unit="hz"
        format={(v) => `${Math.round(v)}`}
        onChange={(v) => onChange("lp", v)}
      />
      <Knob
        label="delay time"
        value={fx.delayTime}
        min={0.03}
        max={1.2}
        unit="s"
        format={(v) => v.toFixed(2)}
        onChange={(v) => onChange("delayTime", v)}
      />
      <Knob
        label="delay fdbk"
        value={fx.delayFeedback}
        min={0}
        max={0.85}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange("delayFeedback", v)}
      />
      <Knob
        label="delay mix"
        value={fx.delayMix}
        min={0}
        max={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange("delayMix", v)}
      />
      <Knob
        label="reverb"
        value={fx.reverb}
        min={0}
        max={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange("reverb", v)}
      />
      <Knob
        label="master"
        value={fx.master}
        min={0}
        max={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onChange("master", v)}
      />
    </div>
  );
}
