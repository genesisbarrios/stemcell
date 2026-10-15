// Built-in sound library. All sounds are generated procedurally with
// OfflineAudioContext, so they are self-contained and license-free.

export interface LibrarySound {
  id: string;
  name: string;
  description: string;
  render: (ctx: BaseAudioContext) => Promise<AudioBuffer>;
}

async function render(
  ctx: BaseAudioContext,
  seconds: number,
  build: (ctx: OfflineAudioContext, t: number) => void
): Promise<AudioBuffer> {
  const sr = ctx.sampleRate;
  const off = new OfflineAudioContext(2, Math.floor(sr * seconds), sr);
  build(off, seconds);
  return off.startRendering();
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(sr * seconds), sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function out(ctx: OfflineAudioContext, node: AudioNode, gain = 1) {
  const g = ctx.createGain();
  g.gain.value = gain;
  node.connect(g);
  g.connect(ctx.destination);
  return g;
}

export const LIBRARY: LibrarySound[] = [
  {
    id: "solar-wind",
    name: "Solar Wind",
    description: "Slow filtered noise sweep",
    render: (ctx) =>
      render(ctx, 6, (o) => {
        const src = o.createBufferSource();
        src.buffer = noiseBuffer(o, 6);
        src.loop = true;
        const bp = o.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 3;
        bp.frequency.setValueAtTime(200, 0);
        bp.frequency.exponentialRampToValueAtTime(3200, 3);
        bp.frequency.exponentialRampToValueAtTime(300, 6);
        const lfo = o.createOscillator();
        lfo.frequency.value = 0.6;
        const lg = o.createGain();
        lg.gain.value = 0.4;
        lfo.connect(lg);
        src.connect(bp);
        const g = out(o, bp, 0.5);
        lg.connect(g.gain);
        lfo.start();
        src.start();
      }),
  },
  {
    id: "glass-rain",
    name: "Glass Rain",
    description: "Sparse sine pings",
    render: (ctx) =>
      render(ctx, 5, (o) => {
        for (let i = 0; i < 40; i++) {
          const t = Math.random() * 4.5;
          const osc = o.createOscillator();
          osc.type = "sine";
          osc.frequency.value = 600 + Math.random() * 3200;
          const g = o.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.25, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
          const pan = o.createStereoPanner();
          pan.pan.value = Math.random() * 2 - 1;
          osc.connect(g);
          g.connect(pan);
          pan.connect(o.destination);
          osc.start(t);
          osc.stop(t + 0.7);
        }
      }),
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    description: "Sub drone with slow pulses",
    render: (ctx) =>
      render(ctx, 7, (o) => {
        const osc = o.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 52;
        const osc2 = o.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.value = 52.7;
        const src = o.createBufferSource();
        src.buffer = noiseBuffer(o, 7);
        src.loop = true;
        const lp = o.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 160;
        src.connect(lp);
        const ng = out(o, lp, 0.25);
        const lfo = o.createOscillator();
        lfo.frequency.value = 0.4;
        const lg = o.createGain();
        lg.gain.value = 0.18;
        lfo.connect(lg);
        lg.connect(ng.gain);
        out(o, osc, 0.4);
        out(o, osc2, 0.25);
        lfo.start();
        osc.start();
        osc2.start();
        src.start();
      }),
  },
  {
    id: "machine-hum",
    name: "Machine Hum",
    description: "Detuned saw stack, mechanical",
    render: (ctx) =>
      render(ctx, 5, (o) => {
        [60, 60.5, 120.3, 240].forEach((f, i) => {
          const osc = o.createOscillator();
          osc.type = i === 3 ? "square" : "sawtooth";
          osc.frequency.value = f;
          const lp = o.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 900;
          osc.connect(lp);
          out(o, lp, i === 3 ? 0.06 : 0.18);
          osc.start();
        });
        const trem = o.createOscillator();
        trem.frequency.value = 7;
        const tg = o.createGain();
        tg.gain.value = 0.05;
        const g = o.createGain();
        g.gain.value = 0.9;
        g.connect(o.destination);
        trem.connect(tg);
        tg.connect(g.gain);
        trem.start();
      }),
  },
  {
    id: "night-insects",
    name: "Night Insects",
    description: "Chirping high pulses",
    render: (ctx) =>
      render(ctx, 6, (o) => {
        for (let i = 0; i < 30; i++) {
          const t = Math.random() * 5.4;
          const osc = o.createOscillator();
          osc.type = "square";
          const f0 = 2400 + Math.random() * 2200;
          osc.frequency.value = f0;
          const g = o.createGain();
          const chirps = 3 + Math.floor(Math.random() * 5);
          for (let c = 0; c < chirps; c++) {
            const ct = t + c * 0.07;
            g.gain.setValueAtTime(0, ct);
            g.gain.linearRampToValueAtTime(0.12, ct + 0.01);
            g.gain.linearRampToValueAtTime(0, ct + 0.05);
          }
          g.gain.setValueAtTime(0, t + chirps * 0.07 + 0.1);
          const pan = o.createStereoPanner();
          pan.pan.value = Math.random() * 2 - 1;
          osc.connect(g);
          g.connect(pan);
          pan.connect(o.destination);
          osc.start(t);
          osc.stop(t + 1);
        }
      }),
  },
  {
    id: "coral-bell",
    name: "Coral Bell",
    description: "FM bell tone cluster",
    render: (ctx) =>
      render(ctx, 6, (o) => {
        [220, 277, 330, 415].forEach((f) => {
          const car = o.createOscillator();
          car.frequency.value = f;
          const mod = o.createOscillator();
          mod.frequency.value = f * 2.76;
          const mg = o.createGain();
          mg.gain.setValueAtTime(f * 1.8, 0);
          mg.gain.exponentialRampToValueAtTime(1, 5.5);
          mod.connect(mg);
          mg.connect(car.frequency);
          const g = o.createGain();
          g.gain.setValueAtTime(0.22, 0);
          g.gain.exponentialRampToValueAtTime(0.02, 6);
          car.connect(g);
          g.connect(o.destination);
          car.start();
          mod.start();
        });
      }),
  },
];
