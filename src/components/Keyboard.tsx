"use client";

import { useCallback } from "react";

const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const BLACK: Record<number, number> = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export function noteName(midi: number) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export default function Keyboard({
  octave,
  octaves = 3,
  active,
  onNoteOn,
  onNoteOff,
}: {
  octave: number; // base midi for C of first key
  octaves?: number;
  active: Set<number>;
  onNoteOn: (m: number) => void;
  onNoteOff: (m: number) => void;
}) {
  const base = octave;
  const whiteCount = octaves * 7 + 1; // + final C

  const noteFromWhite = (i: number) => base + WHITE_STEPS[i % 7] + 12 * Math.floor(i / 7);

  const down = useCallback(
    (m: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      onNoteOn(m);
    },
    [onNoteOn]
  );
  const up = useCallback(
    (m: number) => () => onNoteOff(m),
    [onNoteOff]
  );

  const whites: number[] = [];
  for (let i = 0; i < whiteCount; i++) whites.push(i);

  return (
    <div className="relative flex h-full select-none">
      {whites.map((i) => {
        const m = noteFromWhite(i);
        const isC = i % 7 === 0;
        return (
          <div
            key={i}
            onPointerDown={down(m)}
            onPointerUp={up(m)}
            onPointerLeave={up(m)}
            className={`sc-key-white relative flex-1 cursor-pointer ${
              active.has(m) ? "sc-active" : ""
            }`}
          >
            {isC && (
              <span className="absolute bottom-1 left-1 text-[8px] text-black/50">
                {noteName(m)}
              </span>
            )}
          </div>
        );
      })}
      {/* black keys overlay */}
      <div className="pointer-events-none absolute inset-0">
        {whites.slice(0, -1).map((i) => {
          const step = i % 7;
          if (!(step in BLACK)) return null;
          const m = base + BLACK[step] + 12 * Math.floor(i / 7);
          const left = ((i + 1) / whiteCount) * 100;
          return (
            <div
              key={`b${i}`}
              onPointerDown={down(m)}
              onPointerUp={up(m)}
              onPointerLeave={up(m)}
              className={`sc-key-black pointer-events-auto absolute top-0 h-[58%] cursor-pointer ${
                active.has(m) ? "sc-active" : ""
              }`}
              style={{
                left: `${left}%`,
                width: `${(1 / whiteCount) * 60}%`,
                transform: "translateX(-50%)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
