import { FxParams, GranularParams } from "./types";

export interface Preset {
  name: string;
  granular: Partial<GranularParams>;
  fx: Partial<FxParams>;
}

export const PRESETS: Preset[] = [
  {
    name: "Frozen Memory",
    granular: {
      grainSize: 220,
      density: 12,
      spray: 0.35,
      texture: 0.1,
      speed: 0,
      spread: 0.9,
      pitchJitter: 0,
      mix: 1,
    },
    fx: { reverb: 0.55, delayMix: 0.15, delayTime: 0.5, delayFeedback: 0.4 },
  },
  {
    name: "Broken Radio",
    granular: {
      grainSize: 35,
      density: 40,
      spray: 0.6,
      texture: 0.85,
      speed: 0.8,
      spread: 0.2,
      pitchJitter: 5,
      mix: 1,
    },
    fx: { hp: 800, lp: 4200, reverb: 0.05, delayMix: 0.1, delayTime: 0.09 },
  },
  {
    name: "Liquid Metal",
    granular: {
      grainSize: 60,
      density: 55,
      spray: 0.12,
      texture: 0.3,
      speed: -0.4,
      spread: 0.8,
      pitchJitter: 2,
      mix: 1,
    },
    fx: { reverb: 0.35, delayMix: 0.25, delayTime: 0.16, delayFeedback: 0.55 },
  },
  {
    name: "Dream Choir",
    granular: {
      grainSize: 350,
      density: 8,
      spray: 0.25,
      texture: 0.05,
      speed: 0.15,
      spread: 1,
      pitchJitter: 0.3,
      mix: 1,
    },
    fx: { reverb: 0.8, delayMix: 0.2, delayTime: 0.62, delayFeedback: 0.35 },
  },
  {
    name: "Dust Storm",
    granular: {
      grainSize: 20,
      density: 90,
      spray: 0.8,
      texture: 0.95,
      speed: 1.4,
      spread: 1,
      pitchJitter: 9,
      mix: 0.9,
    },
    fx: { hp: 300, lp: 9000, reverb: 0.25, delayMix: 0.1 },
  },
  {
    name: "Glass Rain",
    granular: {
      grainSize: 45,
      density: 30,
      spray: 0.5,
      texture: 0.6,
      speed: 0.3,
      spread: 0.95,
      pitchJitter: 7,
      mix: 1,
    },
    fx: { reverb: 0.6, delayMix: 0.35, delayTime: 0.31, delayFeedback: 0.5 },
  },
  {
    name: "Alien Flute",
    granular: {
      grainSize: 140,
      density: 18,
      spray: 0.04,
      texture: 0.2,
      speed: 0.6,
      spread: 0.4,
      pitchJitter: 1,
      mix: 1,
    },
    fx: { reverb: 0.45, delayMix: 0.3, delayTime: 0.24, delayFeedback: 0.45 },
  },
  {
    name: "Endless Drone",
    granular: {
      grainSize: 480,
      density: 6,
      spray: 0.15,
      texture: 0,
      speed: 0.05,
      spread: 0.7,
      pitchJitter: 0.1,
      mix: 1,
    },
    fx: { reverb: 0.9, delayMix: 0.4, delayTime: 0.8, delayFeedback: 0.6 },
  },
];

export function randomGranular(): Partial<GranularParams> {
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  return {
    grainSize: r(15, 300),
    density: r(6, 80),
    position: Math.random(),
    spray: r(0, 0.8),
    speed: r(-1, 1),
    spread: r(0.2, 1),
    texture: r(0, 1),
    pitchJitter: r(0, 7) * (Math.random() < 0.4 ? 1 : 0.15),
    mix: r(0.7, 1),
  };
}

export function randomFx(): Partial<FxParams> {
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  return {
    hp: r(30, 500),
    lp: r(3000, 17000),
    reverb: r(0.1, 0.8),
    delayMix: r(0, 0.4),
    delayTime: r(0.08, 0.7),
    delayFeedback: r(0.15, 0.6),
  };
}
