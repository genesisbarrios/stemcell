"use client";

import { useEffect, useRef, useState } from "react";
import { engine } from "@/audio/engine";

export default function RecorderBar() {
  const [state, setState] = useState<"idle" | "rec" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const timerRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSupported(!!window.AudioWorkletNode);
    engine.onRecordStop = (b) => {
      clearInterval(timerRef.current);
      setBlob(b);
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
      setState("done");
    };
    return () => {
      engine.onRecordStop = null;
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  const start = () => {
    engine.startRecording();
    setElapsed(0);
    setState("rec");
    timerRef.current = window.setInterval(
      () => setElapsed((e) => e + 0.1),
      100
    );
  };
  const stop = () => engine.stopRecording(true);
  const cancel = () => {
    clearInterval(timerRef.current);
    engine.stopRecording(false);
    setState("idle");
  };
  const play = () => {
    if (!url) return;
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.play();
  };

  if (!supported)
    return (
      <div className="sc-label">recording requires AudioWorklet support</div>
    );

  return (
    <div className="flex items-center gap-2">
      {state === "rec" && (
        <span className="sc-readout sc-blink mr-1">
          ● {elapsed.toFixed(1)}s
        </span>
      )}
      {state === "idle" && (
        <button className="sc-btn" onClick={start}>
          ● rec
        </button>
      )}
      {state === "rec" && (
        <>
          <button className="sc-btn sc-btn-acid" onClick={stop}>
            ■ keep
          </button>
          <button className="sc-btn sc-btn-danger" onClick={cancel}>
            cancel
          </button>
        </>
      )}
      {state === "done" && (
        <>
          <button className="sc-btn" onClick={play}>
            ▶
          </button>
          <a
            className="sc-btn sc-btn-acid"
            href={url!}
            download={`stemcell-${Date.now()}.wav`}
          >
            ↓ wav
          </a>
          <button className="sc-btn" onClick={start}>
            ↺ new
          </button>
        </>
      )}
      {blob && state === "done" && (
        <span className="sc-label">{(blob.size / 1024).toFixed(0)}kb</span>
      )}
    </div>
  );
}
