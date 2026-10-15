// Compute min/max peak pairs for waveform drawing.
export function computePeaks(
  buf: AudioBuffer,
  buckets: number
): { min: Float32Array; max: Float32Array } {
  const ch = buf.getChannelData(0);
  const ch2 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const per = Math.max(1, Math.floor(ch.length / buckets));
  for (let b = 0; b < buckets; b++) {
    let lo = 1;
    let hi = -1;
    const start = b * per;
    const end = Math.min(ch.length, start + per);
    for (let i = start; i < end; i += 4) {
      let s = ch[i];
      if (ch2) s = (s + ch2[i]) * 0.5;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    min[b] = lo;
    max[b] = hi;
  }
  return { min, max };
}
