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
import { LibraryPanel, MicPanel, OscPanel } from "./SourcePanels";

const KEYMAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10,
  j: 11, k: 12, o: 13, l: 14, p: 15, ";": 16,
};

type Panel = "choose" | "mic" | "osc" | "library" | null;

export default function Workspace({
  source,
  buffer,
  granular,
  fx,
  osc,
  onGranular,
  onFx,
  onSourceLoaded,
  onHome,
}: {
  source: SourceInfo | null;
  buffer: AudioBuffer | null;
  granular: GranularParams;
  fx: FxParams;
  osc: OscParams | null;
  onGranular: <K extends keyof GranularParams>(k: K, v: number) => void;
  onFx: <K extends keyof FxParams>(k: K, v: number) => void;
  onSourceLoaded: (i: SourceInfo) => void;
  onHome: () => void;
}) {
  const [octave, setOctave] = useState(4);
  const [wide, setWide] = useState(false);
  const [poly, setPoly] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [mutOpen, setMutOpen] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    engine.noteOn(midi, source?.kind === "osc" ? osc : null);
    setLastNote(midi);
    setActive(new Set(heldRef.current));
  };

  const noteOff = (midi: number) => {
    heldRef.current.delete(midi);
    if (monoRef.current === midi) monoRef.current = null;
    engine.noteOff(midi);
    setActive(new Set(heldRef.current));
  };

  const stopAll = () => {
    heldRef.current.clear();
    monoRef.current = null;
    engine.allNotesOff();
    engine.stopPreview();
    setActive(new Set());
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const f = () => setWide(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // grain markers → waveform
  useEffect(() => {
    engine.onGrainFrame = (f) => {
      grainFrame.current = f;
    };
    return () => {
      engine.onGrainFrame = null;
    };
  }, []);

  const noteOnRef = useRef(noteOn);
  const noteOffRef = useRef(noteOff);
  const baseMidiRef = useRef(baseMidi);
  noteOnRef.current = noteOn;
  noteOffRef.current = noteOff;
  baseMidiRef.current = baseMidi;

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

  const importFile = async (f: File) => {
    stopAll();
    setImporting(true);
    setPanelError("");
    try {
      const info = await engine.loadFile(f);
      setPanel(null);
      onSourceLoaded(info);
    } catch {
      setPanelError("couldn't decode that file — try WAV, MP3 or OGG");
    } finally {
      setImporting(false);
    }
  };

  const handleReady = (info: SourceInfo) => {
    setPanel(null);
    setPanelError("");
    onSourceLoaded(info);
  };

  const applyPreset = (
    g: Partial<GranularParams>,
    f: Partial<FxParams>
  ) => {
    for (const k in g)
      onGranular(k as keyof GranularParams, g[k as keyof GranularParams]!);
    for (const k in f) onFx(k as keyof FxParams, f[k as keyof FxParams]!);
  };

  const showChooser = !buffer || panel === "choose";
  const showPanel = panel !== null && panel !== "choose";

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-void"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) importFile(f);
      }}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-acid bg-void/80">
          <div className="font-display text-xl tracking-widest text-acid">
            DROP TO LOAD SOURCE
          </div>
        </div>
      )}
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-1.5 sm:py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onHome}
            aria-label="back to home"
            className="transition-opacity hover:opacity-70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo-horizontal_for-dark-bg.svg"
              alt="STEMCELL"
              className="h-4 w-auto sm:h-5"
            />
          </button>
          <div className="h-4 w-px bg-line" />
          {source ? (
            <div>
              <div className="text-[11px] text-bone">{source.name}</div>
              <div className="sc-label">
                {source.kind} · {source.duration.toFixed(2)}s ·{" "}
                {source.channels}ch
                {source.attribution ? ` · ${source.attribution}` : ""}
              </div>
            </div>
          ) : (
            <div className="sc-label">no source loaded</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RecorderBar />
          <div className="h-4 w-px bg-line" />
          <button
            className="sc-btn"
            onClick={() => engine.preview()}
            disabled={!buffer}
          >
            ▶ source
          </button>
          <button className="sc-btn" onClick={stopAll} disabled={!buffer}>
            ⏹ all
          </button>
          <button className="sc-btn" onClick={() => setPanel("choose")}>
            + new
          </button>
        </div>
      </header>

      {/* main */}
      <main className="relative flex min-h-0 flex-1 flex-col gap-px overflow-y-auto bg-line lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible">
        {/* desktop left column: source + granular */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-px">
          <section className="sc-panel relative order-1 flex flex-col">
            <div className="flex h-7 items-center justify-between border-b border-line px-4 sm:h-9">
              <span className="sc-label">
                source / drag to select region · click to set position
              </span>
              <span className="sc-readout">
                {lastNote !== null ? `note ${lastNote}` : ""}
              </span>
            </div>
            <div className="relative h-24 sm:h-44">
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
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </section>
          <section className="sc-panel order-3 flex flex-col lg:min-h-0 lg:flex-1">
            <div className="flex h-7 items-center border-b border-line px-4 sm:h-9">
              <span className="sc-label">granular engine</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
              <GranularControls params={granular} onChange={onGranular} />
            </div>
          </section>
        </div>

        {/* desktop right column: organism + fx + mutations */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-px">
          <section className="sc-panel order-2 flex flex-col lg:min-h-0 lg:flex-1">
            <div className="flex h-7 items-center border-b border-line px-4 sm:h-9">
              <span className="sc-label">organism</span>
            </div>
            <div className="h-32 min-h-0 lg:h-auto lg:flex-1">
              <Visualizer />
            </div>
          </section>
          <div className="order-4 flex flex-col">
            <div className="sc-panel border-b border-line p-2 sm:p-3">
              <div className="sc-label mb-2">effects</div>
              <EffectsPanel fx={fx} onChange={onFx} />
            </div>
            <div className="sc-panel p-2 sm:p-3">
              <button
                className={`sc-label flex w-full items-center justify-between lg:pointer-events-none ${mutOpen ? "mb-2" : ""} lg:mb-2`}
                onClick={() => setMutOpen((o) => !o)}
                aria-expanded={mutOpen}
              >
                <span>mutations</span>
                <span className="lg:hidden">{mutOpen ? "−" : "+"}</span>
              </button>
              <div className={`${mutOpen ? "block" : "hidden"} lg:block`}>
                <PresetBar granular={granular} fx={fx} apply={applyPreset} />
              </div>
            </div>
          </div>
        </div>

        {/* source chooser / panels — overlaid on the whole main area */}
        {(showChooser || showPanel) && (
          <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto bg-void/95">
                {showChooser && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4">
                    <div className="sc-label">load a source</div>
                    <div className="flex flex-wrap items-center justify-center gap-2 px-4">
                      <button
                        className="sc-btn sc-btn-acid"
                        onClick={() => setPanel("mic")}
                      >
                        ● record
                      </button>
                      <button
                        className="sc-btn"
                        onClick={() => fileRef.current?.click()}
                        disabled={importing}
                      >
                        {importing ? "decoding…" : "↑ import"}
                      </button>
                      <button
                        className="sc-btn"
                        onClick={() => setPanel("library")}
                      >
                        ◎ browse
                      </button>
                      <button
                        className="sc-btn"
                        onClick={() => setPanel("osc")}
                      >
                        ~ generate
                      </button>
                    </div>
                    <div className="sc-label">
                      or drop an audio file anywhere
                    </div>
                    {panelError && (
                      <div className="px-4 text-center text-[10px] text-[#e06c5c]">
                        {panelError}
                      </div>
                    )}
                    {buffer && (
                      <button
                        className="sc-btn mt-1"
                        onClick={() => setPanel(null)}
                      >
                        ✕ close
                      </button>
                    )}
                  </div>
                )}
                {panel === "mic" && (
                  <MicPanel onReady={handleReady} onError={setPanelError} />
                )}
                {panel === "osc" && <OscPanel onReady={handleReady} />}
                {panel === "library" && (
                  <LibraryPanel onReady={handleReady} />
                )}
                {showPanel && (
                  <div className="absolute right-2 top-2">
                    <button
                      className="sc-btn px-2 py-1"
                      onClick={() => {
                        setPanel("choose");
                        setPanelError("");
                      }}
                    >
                      ←
                    </button>
                  </div>
                )}
                {showPanel && panelError && (
                  <div className="absolute bottom-2 left-0 right-0 px-4 text-center text-[10px] text-[#e06c5c]">
                    {panelError}
                  </div>
                )}
              </div>
            )}
      </main>

      {/* keyboard */}
      <footer className="border-t border-line">
        <div className="flex items-center justify-between px-4 py-1.5">
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
        <div className="h-20 sm:h-28">
          <Keyboard
            octave={baseMidi}
            octaves={wide ? 3 : 2}
            active={active}
            onNoteOn={noteOn}
            onNoteOff={noteOff}
          />
        </div>
      </footer>
    </div>
  );
}
