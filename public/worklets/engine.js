// STEMCELL audio worklet — granular synthesis engine + recorder tap.
// Registered processors: 'stemcell-granular', 'stemcell-recorder'.

const MAX_GRAINS = 260;
const MAX_VOICES = 16;
const REC_CHUNK = 8192;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Raised-cosine envelope. `att` is the attack/release fraction (0.5 = full Hann).
function grainEnv(t, att) {
  if (t <= 0 || t >= 1) return 0;
  if (t < att) return 0.5 - 0.5 * Math.cos((Math.PI * t) / att);
  if (t > 1 - att) return 0.5 - 0.5 * Math.cos((Math.PI * (1 - t)) / att);
  return 1;
}

class StemcellGranular extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = null; // [channel][samples] Float32Array
    this.bufLen = 0;
    this.sr = sampleRate;
    this.grains = [];
    this.voices = new Map(); // key -> voice
    this.voiceOrder = [];
    this.params = {
      grainSize: 0.09, // seconds
      density: 24, // grains per second per voice
      position: 0.5, // normalized within region
      spray: 0.06, // normalized random offset
      regionStart: 0,
      regionEnd: 1,
      pitchJitter: 0, // semitones
      transpose: 0, // global semitone offset
      speed: 0, // scan rate (region fractions per second, signed)
      spread: 0.6, // stereo spread 0-1
      texture: 0.35, // 0 smooth .. 1 gritty
      mix: 1, // dry/wet vs. clean region loop
      gain: 0.9,
    };
    // Dry loop: plays the selected region unprocessed while notes are held.
    this.dryPos = 0; // in samples, absolute
    this.dryActive = false; // manual override via 'dry' message
    this.gatedCount = 0;
    this.frameCount = 0;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  onMessage(m) {
    switch (m.type) {
      case "buffer":
        this.buf = m.channels;
        this.bufLen = m.length;
        this.grains.length = 0;
        for (const v of this.voices.values()) {
          v.scan = this.params.position;
          v.spawnTimer = 0;
        }
        this.dryPos = this.params.regionStart * this.bufLen;
        break;
      case "param":
        if (m.key in this.params) this.params[m.key] = m.value;
        if (m.key === "regionStart" || m.key === "regionEnd") {
          this.dryPos = this.params.regionStart * this.bufLen;
        }
        break;
      case "noteOn":
        this.noteOn(m.key, m.pitch);
        break;
      case "noteOff":
        this.noteOff(m.key);
        break;
      case "allNotesOff":
        for (const v of this.voices.values()) v.gate = false;
        this.gatedCount = 0;
        break;
      case "dry":
        this.dryActive = !!m.on;
        if (this.buf) this.dryPos = this.params.regionStart * this.bufLen;
        break;
      case "clear":
        this.grains.length = 0;
        this.voices.clear();
        this.voiceOrder.length = 0;
        this.gatedCount = 0;
        break;
    }
  }

  allocVoice(key) {
    let v = this.voices.get(key);
    if (v) return v;
    if (this.voices.size >= MAX_VOICES) {
      // steal oldest
      const old = this.voiceOrder.shift();
      if (old !== undefined) {
        const ov = this.voices.get(old);
        if (ov && ov.gate) this.gatedCount--;
        this.voices.delete(old);
      }
    }
    v = {
      key,
      gate: false,
      pitch: 1,
      spawnTimer: 0,
      scan: this.params.position,
    };
    this.voices.set(key, v);
    this.voiceOrder.push(key);
    return v;
  }

  noteOn(key, pitch) {
    const v = this.allocVoice(key);
    const i = this.voiceOrder.indexOf(key);
    if (i >= 0) this.voiceOrder.splice(i, 1);
    this.voiceOrder.push(key);
    if (!v.gate) {
      this.gatedCount++;
      if (this.gatedCount === 1 && this.buf) {
        this.dryPos = this.params.regionStart * this.bufLen;
      }
    }
    v.gate = true;
    v.pitch = pitch;
    v.spawnTimer = 0;
    v.scan = this.params.position;
  }

  noteOff(key) {
    const v = this.voices.get(key);
    if (v && v.gate) {
      v.gate = false;
      this.gatedCount--;
    }
  }

  spawnGrain(v) {
    if (this.grains.length >= MAX_GRAINS) this.grains.shift();
    const p = this.params;
    const region = Math.max(0.0001, p.regionEnd - p.regionStart);
    let posNorm = v.scan + (Math.random() * 2 - 1) * p.spray * 0.5;
    posNorm = clamp(posNorm, p.regionStart, p.regionEnd - 0.0005);
    const jitterSt = (Math.random() * 2 - 1) * p.pitchJitter;
    const rate = v.pitch * Math.pow(2, (jitterSt + p.transpose) / 12);
    const durS = p.grainSize * (0.9 + Math.random() * 0.2);
    const len = Math.max(16, Math.floor(durS * this.sr));
    const pan = (Math.random() * 2 - 1) * p.spread;
    const panAngle = ((pan + 1) * Math.PI) / 4;
    // overlap-compensated amplitude
    const overlap = (p.density * durS) / 2;
    const amp = p.gain / Math.sqrt(1 + overlap);
    this.grains.push({
      pos: posNorm * this.bufLen,
      len,
      t: 0,
      rate,
      amp,
      panL: Math.cos(panAngle),
      panR: Math.sin(panAngle),
    });
  }

  readBuf(ch, idx) {
    const c = this.buf[ch];
    const i = idx | 0;
    const f = idx - i;
    const i2 = i + 1 < this.bufLen ? i + 1 : this.bufLen - 1;
    return c[i] + (c[i2] - c[i]) * f;
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0];
    const R = out[1] || out[0];
    const n = L.length;
    L.fill(0);
    R.fill(0);
    const p = this.params;
    const wet = Math.sin(p.mix * Math.PI * 0.5);
    const dry = Math.cos(p.mix * Math.PI * 0.5);
    const att = 0.5 - 0.47 * p.texture; // 0.5 smooth .. 0.03 gritty

    if (this.buf && this.bufLen > 256) {
      const regionLen = Math.max(
        64,
        (p.regionEnd - p.regionStart) * this.bufLen
      );
      const spawnInterval = this.sr / Math.max(0.1, p.density);

      // spawn grains per gated voice
      for (const v of this.voices.values()) {
        if (!v.gate) continue;
        // scan drift
        if (p.speed !== 0) {
          v.scan += (p.speed * (regionLen / this.bufLen) * n) / this.sr;
          if (v.scan > p.regionEnd) v.scan = p.regionStart + (v.scan - p.regionEnd);
          if (v.scan < p.regionStart) v.scan = p.regionEnd - (p.regionStart - v.scan);
        } else {
          v.scan = p.position;
        }
        v.spawnTimer -= n;
        while (v.spawnTimer <= 0) {
          this.spawnGrain(v);
          v.spawnTimer += spawnInterval * (0.7 + Math.random() * 0.6);
        }
      }

      // render grains
      const twoCh = this.buf.length > 1 ? 1 : 0;
      for (let g = this.grains.length - 1; g >= 0; g--) {
        const gr = this.grains[g];
        let t = gr.t;
        let pos = gr.pos;
        const step = gr.rate;
        const amp = gr.amp * wet;
        for (let i = 0; i < n; i++) {
          if (t >= gr.len) break;
          if (pos >= this.bufLen - 2) {
            t = gr.len;
            break;
          }
          const e = grainEnv(t / gr.len, att);
          if (e > 0) {
            let iPos = pos;
            if (iPos >= this.bufLen) iPos = this.bufLen - 1;
            if (iPos < 0) iPos = 0;
            const sL = this.readBuf(0, iPos) * e * amp;
            const sR = twoCh ? this.readBuf(1, iPos) * e * amp : sL;
            L[i] += sL * gr.panL;
            R[i] += sR * gr.panR;
          }
          t++;
          pos += step;
        }
        gr.t = t;
        gr.pos = pos;
        if (gr.t >= gr.len) {
          const last = this.grains.length - 1;
          this.grains[g] = this.grains[last];
          this.grains.length = last;
        }
      }

      // dry region loop (while notes held, or manually enabled)
      if ((this.dryActive || this.gatedCount > 0) && dry > 0.001) {
        const start = p.regionStart * this.bufLen;
        const end = p.regionEnd * this.bufLen;
        for (let i = 0; i < n; i++) {
          let dp = this.dryPos;
          if (dp >= end) {
            dp = start;
            this.dryPos = start;
          }
          const s = this.readBuf(0, dp) * dry;
          L[i] += s;
          R[i] += (twoCh ? this.readBuf(1, dp) : this.readBuf(0, dp)) * dry;
          this.dryPos = dp + 1;
        }
      }
    }

    // report active grain positions to the UI (~6x per second)
    this.frameCount++;
    if (this.frameCount % 56 === 0) {
      const count = Math.min(this.grains.length, 120);
      const positions = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const idx = (i * this.grains.length / count) | 0;
        positions[i] = this.bufLen > 0 ? this.grains[idx].pos / this.bufLen : 0;
      }
      const scans = new Float32Array(this.voices.size);
      let vi = 0;
      for (const v of this.voices.values()) scans[vi++] = v.gate ? v.scan : -1;
      this.port.postMessage(
        { type: "grains", positions, scans },
        [positions.buffer, scans.buffer]
      );
    }
    return true;
  }
}

class StemcellRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.chunkL = new Float32Array(REC_CHUNK);
    this.chunkR = new Float32Array(REC_CHUNK);
    this.fill = 0;
    this.port.onmessage = (e) => {
      if (e.data.type === "record") this.recording = e.data.on;
      if (e.data.type === "reset") this.fill = 0;
    };
  }

  process(inputs, outputs) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!inp || !inp[0]) return true;
    const n = inp[0].length;
    out[0].set(inp[0]);
    if (out[1] && inp[1]) out[1].set(inp[1]);
    else if (out[1]) out[1].set(inp[0]);

    if (this.recording) {
      const inR = inp[1] || inp[0];
      for (let i = 0; i < n; i++) {
        this.chunkL[this.fill] = inp[0][i];
        this.chunkR[this.fill] = inR[i];
        this.fill++;
        if (this.fill >= REC_CHUNK) {
          const l = this.chunkL.slice();
          const r = this.chunkR.slice();
          this.port.postMessage({ type: "chunk", l, r }, [l.buffer, r.buffer]);
          this.fill = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor("stemcell-granular", StemcellGranular);
registerProcessor("stemcell-recorder", StemcellRecorder);
