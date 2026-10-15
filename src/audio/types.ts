export interface GranularParams {
  grainSize: number; // ms
  density: number; // grains/sec
  position: number; // 0-1 within region
  spray: number; // 0-1
  regionStart: number; // 0-1 of buffer
  regionEnd: number;
  pitchJitter: number; // semitones
  transpose: number; // global semitone offset
  speed: number; // scan rate, -2..2
  spread: number; // 0-1
  texture: number; // 0-1
  mix: number; // 0-1 dry/wet
}

export interface FxParams {
  hp: number; // hz
  lp: number; // hz
  delayTime: number; // s
  delayFeedback: number; // 0-0.9
  delayMix: number; // 0-1
  reverb: number; // 0-1
  master: number; // 0-1
}

export interface OscParams {
  waveform: OscillatorType;
  freq: number;
  detune: number; // cents
  gain: number;
  lfoRate: number;
  lfoDepth: number; // cents
  mode: "granular" | "direct";
}

export type SourceKind = "file" | "mic" | "osc" | "library";

export interface SourceInfo {
  kind: SourceKind;
  name: string;
  duration: number;
  channels: number;
  attribution?: string;
}

export const DEFAULT_GRANULAR: GranularParams = {
  grainSize: 90,
  density: 24,
  position: 0.5,
  spray: 0.08,
  regionStart: 0,
  regionEnd: 1,
  pitchJitter: 0,
  transpose: 0,
  speed: 0,
  spread: 0.6,
  texture: 0.35,
  mix: 1,
};

export const DEFAULT_FX: FxParams = {
  hp: 60,
  lp: 16000,
  delayTime: 0.28,
  delayFeedback: 0.35,
  delayMix: 0,
  reverb: 0.15,
  master: 0.8,
};

export const DEFAULT_OSC: OscParams = {
  waveform: "sawtooth",
  freq: 110,
  detune: 0,
  gain: 0.6,
  lfoRate: 0,
  lfoDepth: 0,
  mode: "granular",
};
