"use client";

import { useState } from "react";
import { PRESETS, randomFx, randomGranular } from "@/audio/presets";
import { DEFAULT_FX, DEFAULT_GRANULAR, FxParams, GranularParams } from "@/audio/types";

const LS_KEY = "stemcell-user-presets";

interface SavedPreset {
  name: string;
  granular: GranularParams;
  fx: FxParams;
}

export default function PresetBar({
  granular,
  fx,
  apply,
}: {
  granular: GranularParams;
  fx: FxParams;
  apply: (g: Partial<GranularParams>, f: Partial<FxParams>) => void;
}) {
  const [saved, setSaved] = useState<SavedPreset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [active, setActive] = useState("");

  const load = (p: { name: string; granular: Partial<GranularParams>; fx: Partial<FxParams> }) => {
    apply(p.granular, p.fx);
    setActive(p.name);
  };

  const surprise = () => {
    apply(
      { ...randomGranular(), regionStart: 0, regionEnd: 1 },
      randomFx()
    );
    setActive("???");
  };

  const reset = () => {
    apply(DEFAULT_GRANULAR, DEFAULT_FX);
    setActive("init");
  };

  const save = () => {
    const name = `patch ${saved.length + 1}`;
    const next = [...saved, { name, granular, fx }];
    setSaved(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setActive(name);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => load(p)}
            className={`border px-2 py-1.5 text-[9px] uppercase tracking-wider transition-colors ${
              active === p.name
                ? "border-acid text-acid"
                : "border-line text-dim hover:border-dim hover:text-bone"
            }`}
          >
            {p.name}
          </button>
        ))}
        {saved.map((p) => (
          <button
            key={p.name}
            onClick={() => load(p)}
            className={`border px-2 py-1.5 text-[9px] uppercase tracking-wider ${
              active === p.name
                ? "border-acid text-acid"
                : "border-dim/50 text-dim hover:text-bone"
            }`}
          >
            ◈ {p.name}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button className="sc-btn sc-btn-acid flex-1" onClick={surprise}>
          ✳ surprise me
        </button>
        <button className="sc-btn flex-1" onClick={save}>
          save
        </button>
        <button className="sc-btn flex-1" onClick={reset}>
          reset
        </button>
      </div>
    </div>
  );
}
