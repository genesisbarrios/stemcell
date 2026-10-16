# STEMCELL

**Every sound is an instrument.**

An experimental browser-based granular synthesizer. Capture a sound, shred it
into grains, and play it melodically — all client-side, no account, no upload.

## Run

```bash
npm install
npm run dev   # → http://localhost:3000
npm run build
```

Requires Node 20+.

## The loop

1. Press START CREATING, then load a source from the waveform area — record
   through the mic, import/drop audio (WAV/MP3/OGG), browse the procedurally
   generated library, or generate an oscillator tone.
2. Drag on the waveform to select a region, click to set grain position.
3. Play the keyboard (on-screen, `a`–`;` keys, `z`/`x` octave, `m` mono/poly,
   or a MIDI controller).
4. Mutate with granular controls, effects, presets, or SURPRISE ME.
5. Record the output and download a WAV.

## Architecture

- `src/audio/engine.ts` — AudioContext lifecycle + graph:
  granular worklet / osc voices → voice bus → high-pass → low-pass →
  delay + reverb sends → master → limiter → analyser → recorder worklet → out
- `public/worklets/engine.js` — `stemcell-granular` (grain scheduling, Hann
  envelopes, per-voice scan positions, voice stealing, dry region loop) and
  `stemcell-recorder` (pass-through PCM capture → WAV)
- `src/audio/samples.ts` — self-contained library sounds rendered with
  OfflineAudioContext (license-free by construction)
- `src/audio/presets.ts` — handcrafted presets + musically-bounded randomizers
- `src/components/` — React UI; the engine owns all audio state, React owns
  UI state only

If `AudioWorklet` is unavailable, the engine falls back to plain region-looped
buffer playback (notes still play, granular is bypassed) and output recording
is disabled.

3D icons: [3dicons.co](https://3dicons.co) (CC0).
