"use client";

import { useEffect, useRef, useState } from "react";
import { engine, GrainFrame } from "@/audio/engine";
import {
  FxParams,
  GranularParams,
  OscParams,
  SourceInfo,
} from "@/audio/types";
import WaveformEditor from "./WaveformEditor";
import GranularControls from "./GranularControls";
import EffectsPanel from "./EffectsPanel";
import Visualizer from "./Visualizer";
import Keyboard from "./Keyboard";
import RecorderBar from "./RecorderBar";
import PresetBar from "./PresetBar";

const KEYMAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10,
  j: 11, k: 12, o: 13, l: 14, p: 15, ";": 16,
};

export default function Workspace({
  source,
  buffer,
  granular,
  fx,
  osc,
  onGranular,
  onFx,
  onReplace,
  onSourceLoaded,
}: {
  source: SourceInfo;
  buffer: AudioBuffer | null;
  granular: GranularParams;
  fx: FxParams;
  osc: OscParams | null;
  onGranular: <K extends keyof GranularParams>(k: K, v: number) => void;
  onFx: <K extends keyof FxParams>(k: K, v: number) => void;
  onReplace: () => void;
  onSourceLoaded: (i: SourceInfo) => void;
}) {
  const [octave, setOctave] = useState(4);
  const [poly, setPoly] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [active, setActive] = useState<Set<number>>(new Set());
  const [lastNote, setLastNote] = useState<number | null>(null);
  const grainFrame = useRef<GrainFrame | null>(null);
  const heldRef = useRef<Set<number>>(new Set());
  const monoRef = useRef<number | null>(null);
  const polyRef = useRef(poly);
  polyRef.current = poly;
  const baseMidi = (octave + 1) * 12;

  const noteOn = (midi: number) => {
    if (!polyRef.current && monoRef.current !== null && monoRef.current !== midi) {
      noteOff(monoRef.current);
    }
    monoRef.current = midi;
    heldRef.current.add(midi);
    engine.noteOn(midi, source.kind === "osc" ? osc : null);
    setLastNote(midi);
    setActive(new Set(heldRef.current));
  };

  const noteOff = (midi: number) => {
    heldRef.current.delete(midi);
    if (monoRef.current === midi) monoRef.current = null;
    engine.noteOff(midi);
    setActive(new Set(heldRef.current));
  };

  // grain markers → waveform
  useEffect(() => {
    engine.onGrainFrame = (f) => {
      grainFrame.current = f;
    };
    return () => {
      engine.onGrainFrame = null;
    };
  }, []);

  // computer keyboard
  useEffect(() => {
    const pressed = new Set<string>();
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === "z") return setOctave((o) => Math.max(1, o - 1));
      if (k === "x") return setOctave((o) => Math.min(8, o + 1));
      if (k === "m") return setPoly((p) => !p);
      if (k === " ") {
        e.preventDefault();
        return engine.preview();
      }
      if (!(k in KEYMAP) || pressed.has(k)) return;
      pressed.add(k);
      noteOnRef.current(baseMidiRef.current + KEYMAP[k]);
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(k in KEYMAP)) return;
      pressed.delete(k);
      noteOffRef.current(baseMidiRef.current + KEYMAP[k]);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const noteOnRef = useRef(noteOn);
  const noteOffRef = useRef(noteOff);
  const baseMidiRef = useRef(baseMidi);
  noteOnRef.current = noteOn;
  noteOffRef.current = noteOff;
  baseMidiRef.current = baseMidi;

  // MIDI input
  useEffect(() => {
    let access: MIDIAccess | null = null;
    const onMsg = (e: MIDIMessageEvent) => {
      const [st, note, vel] = e.data!;
      const cmd = st & 0xf0;
      if (cmd === 0x90 && vel > 0) noteOnRef.current(note);
      else if (cmd === 0x80 || (cmd === 0x90 && vel === 0))
        noteOffRef.current(note);
    };
    if (navigator.requestMIDIAccess) {
      navigator
        .requestMIDIAccess()
        .then((a) => {
          access = a;
          a.inputs.forEach((i) => (i.onmidimessage = onMsg));
          a.onstatechange = () =>
            a.inputs.forEach((i) => (i.onmidimessage = onMsg));
        })
        .catch(() => {});
    }
    return () => {
      access?.inputs.forEach((i) => (i.onmidimessage = null));
    };
  }, []);

  const applyPreset = (
    g: Partial<GranularParams>,
    f: Partial<FxParams>
  ) => {
    for (const k in g)
      onGranular(k as keyof GranularParams, g[k as keyof GranularParams]!);
    for (const k in f) onFx(k as keyof FxParams, f[k as keyof FxParams]!);
  };

  const stopAll = () => {
    heldRef.current.clear();
    monoRef.current = null;
    engine.allNotesOff();
    engine.stopPreview();
    setActive(new Set());
  };

  return (
    <div
      className="relative flex min-h-screen flex-col bg-void"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        stopAll();
        try {
          onSourceLoaded(await engine.loadFile(f));
        } catch {
          /* unsupported file — keep current source */
        }
      }}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-acid bg-void/80">
          <div className="font-display text-xl font-bold tracking-widest text-acid">
            DROP TO REPLACE SOURCE
          </div>
        </div>
      )}
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="font-display text-sm font-black tracking-[0.3em]">
            STEM<span className="text-acid">CELL</span>
          </div>
          <div className="h-4 w-px bg-line" />
          <div>
            <div className="text-[11px] text-bone">{source.name}</div>
            <div className="sc-label">
              {source.kind} · {source.duration.toFixed(2)}s ·{" "}
              {source.channels}ch
              {source.attribution ? ` · ${source.attribution}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RecorderBar />
          <div className="h-4 w-px bg-line" />
          <button className="sc-btn" onClick={() => engine.preview()}>
            ▶ source
          </button>
          <button className="sc-btn" onClick={stopAll}>
            ⏹ all
          </button>
          <button className="sc-btn" onClick={onReplace}>
            ⟲ replace
          </button>
        </div>
      </header>

      {/* main */}
      <main className="grid flex-1 grid-cols-1 gap-px bg-line lg:grid-cols-12">
        {/* left: waveform + granular */}
        <section className="sc-panel flex flex-col lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="sc-label">source / drag to select region · click to set position</span>
            <span className="sc-readout">
              {lastNote !== null ? `note ${lastNote}` : ""}
            </span>
          </div>
          <div className="h-40 border-b border-line sm:h-48">
            <WaveformEditor
              buffer={buffer}
              regionStart={granular.regionStart}
              regionEnd={granular.regionEnd}
              position={granular.position}
              grainFrame={grainFrame}
              onRegion={(a, b) => {
                onGranular("regionStart", a);
                onGranular("regionEnd", Math.max(b, a + 0.005));
              }}
              onPosition={(p) => onGranular("position", p)}
            />
          </div>
          <div className="border-b border-line px-4 py-2">
            <span className="sc-label">granular engine</span>
          </div>
          <div className="flex-1 p-4">
            <GranularControls params={granular} onChange={onGranular} />
          </div>
        </section>

        {/* right: visualizer + fx + presets */}
        <section className="grid grid-rows-[auto_1fr_auto] lg:col-span-5">
          <div className="sc-panel border-b border-line">
            <div className="border-b border-line px-4 py-2">
              <span className="sc-label">organism</span>
            </div>
            <div className="h-44 sm:h-52">
              <Visualizer />
            </div>
          </div>
          <div className="sc-panel border-b border-line p-4">
            <div className="sc-label mb-4">effects</div>
            <EffectsPanel fx={fx} onChange={onFx} />
          </div>
          <div className="sc-panel p-4">
            <div className="sc-label mb-3">mutations</div>
            <PresetBar granular={granular} fx={fx} apply={applyPreset} />
          </div>
        </section>
      </main>

      {/* keyboard */}
      <footer className="border-t border-line">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="sc-label">octave</span>
            <button
              className="sc-btn px-2 py-1"
              onClick={() => setOctave((o) => Math.max(1, o - 1))}
            >
              −
            </button>
            <span className="sc-readout w-6 text-center">{octave}</span>
            <button
              className="sc-btn px-2 py-1"
              onClick={() => setOctave((o) => Math.min(8, o + 1))}
            >
              +
            </button>
            <div className="h-4 w-px bg-line" />
            <button
              className={`sc-btn px-2 py-1 ${poly ? "" : "sc-btn-acid"}`}
              onClick={() => setPoly((p) => !p)}
            >
              {poly ? "poly" : "mono"}
            </button>
          </div>
          <div className="sc-label hidden sm:block">
            keys a–; play · z/x octave · space preview · m mono/poly
          </div>
        </div>
        <div className="h-28 sm:h-32">
          <Keyboard
            octave={baseMidi}
            active={active}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
          />
        </div>
      </footer>
    </div>
  );
}
