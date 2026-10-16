"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/audio/engine";
import { LIBRARY, LibrarySound } from "@/audio/samples";
import { DEFAULT_OSC, OscParams, SourceInfo } from "@/audio/types";

/* ---------------- microphone ---------------- */

export function MicPanel({
  onReady,
  onError,
}: {
  onReady: (i: SourceInfo) => void;
  onError: (s: string) => void;
}) {
  const [level, setLevel] = useState(0);
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bufRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<number>(0);

  const start = async () => {
    onError("");
    try {
      const rec = await engine.startMic(setLevel);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        engine.stopMic();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        try {
          const raw = await blob.arrayBuffer();
          bufRef.current = await engine.ctx!.decodeAudioData(raw);
          setState("done");
        } catch {
          onError("couldn't decode the recording");
          setState("idle");
        }
      };
      rec.start(250);
      recRef.current = rec;
      setState("recording");
      setElapsed(0);
      timerRef.current = window.setInterval(
        () => setElapsed((e) => e + 0.1),
        100
      );
    } catch {
      onError(
        "microphone unavailable — check permissions and that a device exists"
      );
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    recRef.current?.stop();
    recRef.current = null;
    setLevel(0);
  };

  const cancel = () => {
    clearInterval(timerRef.current);
    if (recRef.current) {
      recRef.current.onstop = null;
      recRef.current.stop();
      recRef.current = null;
    }
    engine.stopMic();
    setLevel(0);
    setState("idle");
  };

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      if (recRef.current) {
        recRef.current.onstop = null;
        recRef.current.ondataavailable = null;
        try {
          recRef.current.stop();
        } catch {
          /* inactive */
        }
        recRef.current = null;
      }
      engine.stopMic();
      engine.stopPreview();
    },
    []
  );

  const use_ = async () => {
    if (!bufRef.current) return;
    const info = engine.setSource(bufRef.current, {
      kind: "mic",
      name: `mic recording ${new Date().toLocaleTimeString()}`,
      duration: bufRef.current.duration,
      channels: bufRef.current.numberOfChannels,
    });
    onReady(info);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="h-1.5 w-56 overflow-hidden bg-line">
        <div
          className="h-full bg-acid transition-[width] duration-75"
          style={{ width: `${Math.min(100, level * 160)}%` }}
        />
      </div>
      {state === "recording" && (
        <div className="sc-readout sc-blink">● REC {elapsed.toFixed(1)}s</div>
      )}
      <div className="flex gap-2">
        {state === "idle" && (
          <button className="sc-btn sc-btn-acid" onClick={start}>
            ● record
          </button>
        )}
        {state === "recording" && (
          <>
            <button className="sc-btn" onClick={stop}>
              ■ stop
            </button>
            <button className="sc-btn sc-btn-danger" onClick={cancel}>
              cancel
            </button>
          </>
        )}
        {state === "done" && (
          <>
            <button
              className="sc-btn"
              onClick={() => engine.preview(bufRef.current!)}
            >
              ▶ playback
            </button>
            <button className="sc-btn" onClick={start}>
              re-record
            </button>
            <button className="sc-btn sc-btn-acid" onClick={use_}>
              use this sound →
            </button>
          </>
        )}
      </div>
      <div className="sc-label text-center">
        {state === "idle" && "your browser will ask for mic permission"}
        {state === "recording" && "make a sound — anything works"}
        {state === "done" && "happy with it?"}
      </div>
    </div>
  );
}

/* ---------------- oscillator ---------------- */

export function OscPanel({ onReady }: { onReady: (i: SourceInfo) => void }) {
  const [p, setP] = useState<OscParams>({ ...DEFAULT_OSC });
  const [busy, setBusy] = useState(false);
  const waves: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];

  const set = <K extends keyof OscParams>(k: K, v: OscParams[K]) =>
    setP((s) => ({ ...s, [k]: v }));

  const generate = async () => {
    setBusy(true);
    try {
      const buf = await engine.renderOscBuffer(p, 4);
      const info = engine.setSource(buf, {
        kind: "osc",
        name: `${p.waveform} @ ${p.freq.toFixed(0)}hz`,
        duration: buf.duration,
        channels: 2,
      });
      engine.osc = p;
      onReady(info);
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    const buf = await engine.renderOscBuffer(p, 1.2);
    engine.preview(buf);
  };

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4">
      <div className="flex gap-1">
        {waves.map((w) => (
          <button
            key={w}
            onClick={() => set("waveform", w)}
            className={`flex-1 border px-2 py-1.5 font-sub text-[10px] uppercase tracking-wider ${
              p.waveform === w
                ? "border-acid text-acid"
                : "border-line text-dim hover:text-bone"
            }`}
          >
            {w.slice(0, 4)}
          </button>
        ))}
      </div>
      {(
        [
          ["freq", 20, 800, "hz", 1],
          ["detune", -100, 100, "ct", 1],
          ["gain", 0, 1, "", 0.01],
          ["lfoRate", 0, 12, "hz", 0.1],
          ["lfoDepth", 0, 100, "ct", 1],
        ] as const
      ).map(([k, min, max, unit, step]) => (
        <div key={k} className="flex items-center gap-3">
          <div className="sc-label w-16">
            {k === "lfoRate" ? "LFO rate" : k === "lfoDepth" ? "LFO amt" : k}
          </div>
          <input
            className="sc-slider flex-1"
            type="range"
            min={min}
            max={max}
            step={step}
            value={p[k]}
            onChange={(e) => set(k, +e.target.value)}
          />
          <div className="sc-readout w-14 text-right">
            {p[k].toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}
            {unit}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["granular", "direct"] as const).map((m) => (
            <button
              key={m}
              onClick={() => set("mode", m)}
              className={`border px-3 py-1.5 font-sub text-[10px] uppercase tracking-wider ${
                p.mode === m ? "border-acid text-acid" : "border-line text-dim"
              }`}
            >
              {m === "granular" ? "→ granular" : "play direct"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="sc-btn" onClick={preview}>
            ▶
          </button>
          <button
            className="sc-btn sc-btn-acid"
            onClick={generate}
            disabled={busy}
          >
            {busy ? "rendering…" : "generate →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- discover ---------------- */

export function LibraryPanel({
  onReady,
}: {
  onReady: (i: SourceInfo) => void;
}) {
  const [sound, setSound] = useState<LibrarySound>(
    () => LIBRARY[(Math.random() * LIBRARY.length) | 0]
  );
  const [busy, setBusy] = useState(false);
  const bufRef = useRef<AudioBuffer | null>(null);
  const bufIdRef = useRef("");

  const getBuf = useCallback(async () => {
    if (bufRef.current && bufIdRef.current === sound.id)
      return bufRef.current;
    setBusy(true);
    await engine.init();
    const b = await sound.render(engine.ctx!);
    bufRef.current = b;
    bufIdRef.current = sound.id;
    setBusy(false);
    return b;
  }, [sound]);

  const pick = () => {
    engine.stopPreview();
    let next = sound;
    while (next.id === sound.id)
      next = LIBRARY[(Math.random() * LIBRARY.length) | 0];
    setSound(next);
  };

  useEffect(() => () => engine.stopPreview(), []);

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4">
      <div className="border border-line p-3">
        <div className="sc-label mb-1">
          field recording · generated in-browser
        </div>
        <div className="font-display text-lg text-bone">
          {sound.name}
        </div>
        <div className="mt-1 text-[10px] text-dim">{sound.description}</div>
      </div>
      <div className="flex items-center justify-between">
        <button className="sc-btn" onClick={pick}>
          ⟳ another
        </button>
        <div className="flex gap-2">
          <button
            className="sc-btn"
            disabled={busy}
            onClick={async () => engine.preview(await getBuf())}
          >
            ▶ preview
          </button>
          <button
            className="sc-btn sc-btn-acid"
            disabled={busy}
            onClick={async () => {
              const b = await getBuf();
              onReady(
                engine.setSource(b, {
                  kind: "library",
                  name: sound.name,
                  duration: b.duration,
                  channels: 2,
                  attribution: "procedurally generated — STEMCELL library",
                })
              );
            }}
          >
            {busy ? "…" : "load →"}
          </button>
        </div>
      </div>
    </div>
  );
}
