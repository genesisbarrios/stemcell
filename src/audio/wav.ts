// Encode stereo Float32 PCM chunks into a 16-bit WAV Blob.
export function encodeWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const len = left.length;
  const buf = new ArrayBuffer(44 + len * 4);
  const v = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + len * 4, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, len * 4, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    v.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    v.setInt16(off + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    off += 4;
  }
  return new Blob([buf], { type: "audio/wav" });
}
