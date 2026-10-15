import {
  DEFAULT_FX,
  DEFAULT_GRANULAR,
  FxParams,
  GranularParams,
  OscParams,
  SourceInfo,
} from "./types";
import { encodeWav } from "./wav";

export interface GrainFrame {
  positions: Float32Array;
  scans: Float32Array;
}

interface OscVoice {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
}

interface FallbackVoice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

const midiToRatio = (midi: number) => Math.pow(2, (midi - 60) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  workletReady = false;

  private granular: AudioWorkletNode | null = null;
  private recorderNode: AudioWorkletNode | null = null;
  private voiceBus!: GainNode;
  private hp!: BiquadFilterNode;
  private lp!: BiquadFilterNode;
  private fxIn!: GainNode;
  private delay!: DelayNode;
  private delayFb!: GainNode;
  private delayOut!: GainNode;
  private convolver!: ConvolverNode;
  private verbOut!: GainNode;
  private sum!: GainNode;
  private master!: GainNode;
  private comp!: DynamicsCompressorNode;
  analyser!: AnalyserNode;
  private micAnalyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;

  source: AudioBuffer | null = null;
  sourceInfo: SourceInfo | null = null;
  params: GranularParams = { ...DEFAULT_GRANULAR };
  fx: FxParams = { ...DEFAULT_FX };
  osc: OscParams | null = null;

  private activeNotes = new Map<number, number>(); // midi -> voiceKey refcount
  private oscVoices = new Map<number, OscVoice>();
  private fallbackVoices = new Map<number, FallbackVoice>();
  private previewSrc: AudioBufferSourceNode | null = null;

  private recChunks: Float32Array[] = [];
  private recLength = 0;
  recording = false;

  onGrainFrame: ((f: GrainFrame) => void) | null = null;
  onRecordStop: ((blob: Blob, duration: number) => void) | null = null;
  onLoadProgress: ((msg: string) => void) | null = null;
  private recStartTime = 0;

  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC({ latencyHint: "interactive" });

    this.voiceBus = this.ctx.createGain();
    this.hp = this.ctx.createBiquadFilter();
    this.hp.type = "highpass";
    this.hp.frequency.value = this.fx.hp;
    this.lp = this.ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.frequency.value = this.fx.lp;
    this.fxIn = this.ctx.createGain();

    this.delay = this.ctx.createDelay(2);
    this.delay.delayTime.value = this.fx.delayTime;
    this.delayFb = this.ctx.createGain();
    this.delayFb.gain.value = this.fx.delayFeedback;
    this.delayOut = this.ctx.createGain();
    this.delayOut.gain.value = this.fx.delayMix;
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);

    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.makeImpulse(2.6, 2.4);
    this.verbOut = this.ctx.createGain();
    this.verbOut.gain.value = this.fx.reverb;

    this.sum = this.ctx.createGain();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.fx.master;
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -6;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 12;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.2;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    this.voiceBus.connect(this.hp);
    this.hp.connect(this.lp);
    this.lp.connect(this.fxIn);
    this.fxIn.connect(this.sum);
    this.fxIn.connect(this.delay);
    this.delay.connect(this.delayOut);
    this.delayOut.connect(this.sum);
    this.fxIn.connect(this.convolver);
    this.convolver.connect(this.verbOut);
    this.verbOut.connect(this.sum);
    this.sum.connect(this.master);
    this.master.connect(this.comp);
    this.comp.connect(this.analyser);

    // worklets (granular + recorder tap)
    if (this.ctx.audioWorklet) {
      try {
        await this.ctx.audioWorklet.addModule("/worklets/engine.js");
        this.granular = new AudioWorkletNode(
          this.ctx,
          "stemcell-granular",
          { outputChannelCount: [2] }
        );
        this.granular.connect(this.voiceBus);
        this.granular.port.onmessage = (e) => {
          if (e.data.type === "grains" && this.onGrainFrame) {
            this.onGrainFrame({
              positions: e.data.positions,
              scans: e.data.scans,
            });
          }
        };
        this.recorderNode = new AudioWorkletNode(
          this.ctx,
          "stemcell-recorder"
        );
        this.recorderNode.port.onmessage = (e) => {
          if (e.data.type === "chunk") {
            this.recChunks.push(e.data.l, e.data.r);
            this.recLength += e.data.l.length;
          }
        };
        this.analyser.connect(this.recorderNode);
        this.recorderNode.connect(this.ctx.destination);
        this.workletReady = true;
      } catch (err) {
        console.warn("AudioWorklet unavailable, using fallback", err);
        this.analyser.connect(this.ctx.destination);
      }
    } else {
      this.analyser.connect(this.ctx.destination);
    }
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // ---------- source loading ----------

  async loadFile(file: File): Promise<SourceInfo> {
    await this.init();
    this.onLoadProgress?.("decoding " + file.name);
    const raw = await file.arrayBuffer();
    const buf = await this.ctx!.decodeAudioData(raw);
    return this.setSource(buf, {
      kind: "file",
      name: file.name,
      duration: buf.duration,
      channels: buf.numberOfChannels,
    });
  }

  setSource(buf: AudioBuffer, info: SourceInfo): SourceInfo {
    this.source = buf;
    this.sourceInfo = info;
    this.stopPreview();
    this.allNotesOff();
    if (this.granular) {
      const chans: Float32Array[] = [];
      for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) {
        chans.push(new Float32Array(buf.getChannelData(c)));
      }
      this.granular.port.postMessage(
        { type: "buffer", channels: chans, length: buf.length },
        chans.map((c) => c.buffer)
      );
      this.pushParams();
    }
    return info;
  }

  pushParams() {
    if (!this.granular) return;
    const p = this.params;
    this.granular.port.postMessage({
      type: "param",
      key: "grainSize",
      value: p.grainSize / 1000,
    });
    const map: Record<string, number> = {
      density: p.density,
      position: p.position,
      spray: p.spray,
      regionStart: p.regionStart,
      regionEnd: p.regionEnd,
      pitchJitter: p.pitchJitter,
      transpose: p.transpose,
      speed: p.speed,
      spread: p.spread,
      texture: p.texture,
      mix: p.mix,
    };
    for (const k in map) {
      this.granular.port.postMessage({
        type: "param",
        key: k,
        value: map[k],
      });
    }
  }

  setParam<K extends keyof GranularParams>(key: K, v: number) {
    this.params[key] = v;
    if (!this.granular) return;
    const val = key === "grainSize" ? v / 1000 : v;
    this.granular.port.postMessage({ type: "param", key, value: val });
  }

  setFx<K extends keyof FxParams>(key: K, v: number) {
    this.fx[key] = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (p: AudioParam) => {
      p.cancelScheduledValues(t);
      p.setTargetAtTime(v, t, 0.03);
    };
    switch (key) {
      case "hp":
        ramp(this.hp.frequency);
        break;
      case "lp":
        ramp(this.lp.frequency);
        break;
      case "delayTime":
        ramp(this.delay.delayTime);
        break;
      case "delayFeedback":
        ramp(this.delayFb.gain);
        break;
      case "delayMix":
        ramp(this.delayOut.gain);
        break;
      case "reverb":
        ramp(this.verbOut.gain);
        break;
      case "master":
        ramp(this.master.gain);
        break;
    }
  }

  setDryLoop(on: boolean) {
    this.granular?.port.postMessage({ type: "dry", on });
  }

  // ---------- notes ----------

  noteOn(midi: number, directOsc: OscParams | null = null) {
    if (!this.ctx || !this.source) return;
    const count = this.activeNotes.get(midi) || 0;
    this.activeNotes.set(midi, count + 1);
    if (count > 0) return;
    if (directOsc && directOsc.mode === "direct") {
      this.oscNoteOn(midi, directOsc);
      return;
    }
    if (this.granular) {
      this.granular.port.postMessage({
        type: "noteOn",
        key: midi,
        pitch: midiToRatio(midi),
      });
    } else {
      this.fallbackNoteOn(midi);
    }
  }

  noteOff(midi: number) {
    const count = (this.activeNotes.get(midi) || 0) - 1;
    if (count > 0) {
      this.activeNotes.set(midi, count);
      return;
    }
    this.activeNotes.delete(midi);
    const ov = this.oscVoices.get(midi);
    if (ov) this.oscNoteOff(midi);
    const fv = this.fallbackVoices.get(midi);
    if (fv) this.fallbackNoteOff(midi);
    this.granular?.port.postMessage({ type: "noteOff", key: midi });
  }

  allNotesOff() {
    this.activeNotes.clear();
    for (const k of [...this.oscVoices.keys()]) this.oscNoteOff(k);
    for (const k of [...this.fallbackVoices.keys()]) this.fallbackNoteOff(k);
    this.granular?.port.postMessage({ type: "allNotesOff" });
  }

  // Direct oscillator voices (bypass granular, still through FX)
  private oscNoteOn(midi: number, p: OscParams) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = p.waveform;
    const freq = p.freq * Math.pow(2, (midi - 60) / 12);
    osc.frequency.value = freq;
    osc.detune.value = p.detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(p.gain, ctx.currentTime + 0.01);
    const voice: OscVoice = { osc, gain: g };
    if (p.lfoRate > 0 && p.lfoDepth > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = p.lfoRate;
      const lg = ctx.createGain();
      lg.gain.value = p.lfoDepth;
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start();
      voice.lfo = lfo;
      voice.lfoGain = lg;
    }
    osc.connect(g);
    g.connect(this.voiceBus);
    osc.start();
    this.oscVoices.set(midi, voice);
  }

  private oscNoteOff(midi: number) {
    const v = this.oscVoices.get(midi);
    if (!v || !this.ctx) return;
    const t = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setTargetAtTime(0, t, 0.04);
    v.osc.stop(t + 0.3);
    v.lfo?.stop(t + 0.3);
    this.oscVoices.delete(midi);
  }

  // Fallback when AudioWorklet is unavailable: simple region-looped playback.
  private fallbackNoteOn(midi: number) {
    if (!this.ctx || !this.source) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.source;
    src.playbackRate.value = midiToRatio(midi);
    src.loop = true;
    const p = this.params;
    src.loopStart = p.regionStart * this.source.duration;
    src.loopEnd = p.regionEnd * this.source.duration;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.02);
    src.connect(g);
    g.connect(this.voiceBus);
    src.start(0, p.regionStart * this.source.duration);
    this.fallbackVoices.set(midi, { src, gain: g });
  }

  private fallbackNoteOff(midi: number) {
    const v = this.fallbackVoices.get(midi);
    if (!v || !this.ctx) return;
    const t = this.ctx.currentTime;
    v.gain.gain.setTargetAtTime(0, t, 0.05);
    v.src.stop(t + 0.3);
    this.fallbackVoices.delete(midi);
  }

  // ---------- preview ----------

  preview(buffer?: AudioBuffer) {
    if (!this.ctx) return;
    this.stopPreview();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer || this.source;
    if (!src.buffer) return;
    src.connect(this.voiceBus);
    src.start();
    this.previewSrc = src;
    src.onended = () => {
      if (this.previewSrc === src) this.previewSrc = null;
    };
  }

  stopPreview() {
    try {
      this.previewSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.previewSrc = null;
  }

  // ---------- microphone ----------

  async startMic(onLevel: (level: number) => void): Promise<MediaRecorder> {
    await this.init();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = stream;
    const src = this.ctx!.createMediaStreamSource(stream);
    this.micAnalyser = this.ctx!.createAnalyser();
    this.micAnalyser.fftSize = 512;
    src.connect(this.micAnalyser);
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    const tick = () => {
      if (!this.micStream) return;
      this.micAnalyser!.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const d = Math.abs(data[i] - 128) / 128;
        if (d > peak) peak = d;
      }
      onLevel(peak);
      requestAnimationFrame(tick);
    };
    tick();
    return new MediaRecorder(stream);
  }

  stopMic() {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    this.micAnalyser = null;
  }

  async decodeBlob(blob: Blob, name: string): Promise<SourceInfo> {
    const raw = await blob.arrayBuffer();
    const buf = await this.ctx!.decodeAudioData(raw);
    return this.setSource(buf, {
      kind: "mic",
      name,
      duration: buf.duration,
      channels: buf.numberOfChannels,
    });
  }

  // ---------- output recording ----------

  startRecording() {
    if (!this.recorderNode || !this.ctx) return;
    this.recChunks = [];
    this.recLength = 0;
    this.recStartTime = this.ctx.currentTime;
    this.recorderNode.port.postMessage({ type: "reset" });
    this.recorderNode.port.postMessage({ type: "record", on: true });
    this.recording = true;
  }

  stopRecording(save: boolean) {
    if (!this.recorderNode || !this.ctx || !this.recording) return;
    this.recording = false;
    this.recorderNode.port.postMessage({ type: "record", on: false });
    if (!save) {
      this.recChunks = [];
      this.recLength = 0;
      return;
    }
    // give the last chunk a tick to flush
    setTimeout(() => {
      const len = this.recLength;
      const L = new Float32Array(len);
      const R = new Float32Array(len);
      let off = 0;
      for (let i = 0; i < this.recChunks.length; i += 2) {
        L.set(this.recChunks[i], off);
        R.set(this.recChunks[i + 1], off);
        off += this.recChunks[i].length;
      }
      const blob = encodeWav(L, R, this.ctx!.sampleRate);
      this.recChunks = [];
      this.recLength = 0;
      this.onRecordStop?.(blob, this.ctx!.currentTime - this.recStartTime);
    }, 80);
  }

  // ---------- oscillator buffer generation ----------

  async renderOscBuffer(p: OscParams, seconds = 4): Promise<AudioBuffer> {
    await this.init();
    const sr = this.ctx!.sampleRate;
    const off = new OfflineAudioContext(2, sr * seconds, sr);
    const osc = off.createOscillator();
    osc.type = p.waveform;
    osc.frequency.value = p.freq;
    osc.detune.value = p.detune;
    const g = off.createGain();
    g.gain.value = p.gain;
    if (p.lfoRate > 0 && p.lfoDepth > 0) {
      const lfo = off.createOscillator();
      lfo.frequency.value = p.lfoRate;
      const lg = off.createGain();
      lg.gain.value = p.lfoDepth;
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(0);
    }
    osc.connect(g);
    g.connect(off.destination);
    osc.start(0);
    return off.startRendering();
  }

  async resume() {
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }
}

export const engine = new AudioEngine();
