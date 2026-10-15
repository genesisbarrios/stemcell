"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/audio/engine";
import { LIBRARY, LibrarySound } from "@/audio/samples";
import { DEFAULT_OSC, OscParams, SourceInfo } from "@/audio/types";

export type ModalTab = "file" | "mic" | "osc" | "library";

export default function SourceModal({
  initialTab,
  onReady,
  onClose,
}: {
  initialTab: ModalTab;
  onReady: (info: SourceInfo) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ModalTab>(initialTab);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const importFile = async (f: File) => {
    setError("");
    setLoading(true);
    try {
      const info = await engine.loadFile(f);
      onReady(info);
    } catch {
      setError("couldn't decode that file — try WAV, MP3 or OGG");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTab === "file") fileRef.current?.click();
  }, [initialTab]);

  const tabs: { id: ModalTab; label: string }[] = [
    { id: "file", label: "IMPORT" },
    { id: "mic", label: "RECORD" },
    { id: "osc", label: "GENERATE" },
    { id: "library", label: "DISCOVER" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="sc-panel w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-line">
          <div className="flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-[10px] tracking-[0.15em] ${
                  tab === t.id
                    ? "bg-panel2 text-acid"
                    : "text-dim hover:text-bone"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-3 text-dim hover:text-bone"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {tab === "file" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) importFile(f);
              }}
              className="flex h-48 flex-col items-center justify-center border border-dashed border-line text-center"
            >
              <div className="sc-label mb-3">drop audio here</div>
              <button
                className="sc-btn"
                onClick={() => fileRef.current?.click()}
              >
                or browse files
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile(f);
                }}
              />
              {loading && (
                <div className="sc-label mt-4 sc-blink text-acid">
                  decoding…
                </div>
              )}
            </div>
          )}
          {tab === "mic" && <MicPanel onReady={onReady} onError={setError} />}
          {tab === "osc" && <OscPanel onReady={onReady} />}
          {tab === "library" && <LibraryPanel onReady={onReady} />}
          {error && (
            <div className="mt-4 border border-[#5c2a2a] p-3 text-[10px] text-[#e06c5c]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- microphone ---------------- */

function MicPanel({
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
    <div className="flex h-48 flex-col items-center justify-center gap-4">
      {/* level meter */}
      <div className="h-1.5 w-56 overflow-hidden bg-line">
        <div
          className="h-full bg-acid transition-[width] duration-75"
          style={{ width: `${Math.min(100, level * 160)}%` }}
        />
      </div>
      {state === "recording" && (
        <div className="sc-readout sc-blink">
          ● REC {elapsed.toFixed(1)}s
        </div>
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
        {state === "idle" &&
          "your browser will ask for mic permission"}
        {state === "recording" && "make a sound — anything works"}
        {state === "done" && "happy with it?"}
      </div>
    </div>
  );
}

/* ---------------- oscillator ---------------- */

function OscPanel({ onReady }: { onReady: (i: SourceInfo) => void }) {
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
    <div className="flex h-48 flex-col justify-center gap-4">
      <div className="flex gap-1">
        {waves.map((w) => (
          <button
            key={w}
            onClick={() => set("waveform", w)}
            className={`flex-1 border px-2 py-2 text-[10px] uppercase tracking-wider ${
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
          <div className="sc-label w-16">{k === "lfoRate" ? "LFO rate" : k === "lfoDepth" ? "LFO amt" : k}</div>
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
              className={`border px-3 py-1.5 text-[10px] uppercase tracking-wider ${
                p.mode === m
                  ? "border-acid text-acid"
                  : "border-line text-dim"
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

function LibraryPanel({ onReady }: { onReady: (i: SourceInfo) => void }) {
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
    <div className="flex h-48 flex-col justify-center gap-4">
      <div className="border border-line p-4">
        <div className="sc-label mb-1">field recording · generated in-browser</div>
        <div className="font-display text-xl font-bold text-bone">
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
