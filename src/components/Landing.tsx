"use client";

import { motion } from "motion/react";
import ParticleCanvas from "./ParticleCanvas";

export type SourceChoice = "file" | "mic" | "osc" | "library";

const OPTIONS: {
  id: SourceChoice;
  num: string;
  title: string;
  desc: string;
  icon: string;
}[] = [
  {
    id: "file",
    num: "01",
    title: "IMPORT AUDIO",
    desc: "WAV / MP3 / OGG — drop a file in",
    icon: "/icons/file.png",
  },
  {
    id: "mic",
    num: "02",
    title: "RECORD A SOUND",
    desc: "Capture something strange",
    icon: "/icons/mic.png",
  },
  {
    id: "osc",
    num: "03",
    title: "GENERATE A TONE",
    desc: "Oscillator — pure signal",
    icon: "/icons/flash.png",
  },
  {
    id: "library",
    num: "04",
    title: "DISCOVER A SOUND",
    desc: "Built-in field library",
    icon: "/icons/music.png",
  },
];

export default function Landing({
  onChoose,
}: {
  onChoose: (c: SourceChoice) => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <ParticleCanvas className="absolute inset-0 h-full w-full opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0b0b0a_85%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
          <div className="font-display text-lg font-black tracking-[0.3em] text-bone">
            STEM<span className="text-acid">CELL</span>
          </div>
          <div className="sc-label hidden sm:block">
            experimental granular instrument — v0.1
          </div>
        </header>

        <main className="relative flex flex-1 flex-col justify-center px-6 py-10 md:px-10 lg:px-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="sc-label mb-4 text-acid"
          >
            turn any sound into a playable instrument
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display text-[13vw] font-black leading-[0.88] tracking-tight text-bone sm:text-[10vw] lg:text-[7.5rem]"
          >
            EVERY SOUND
            <br />
            IS AN <span className="text-acid">INSTRUMENT</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-6 max-w-md text-sm leading-relaxed text-dim"
          >
            Capture it. Break it apart. Play it differently. STEMCELL shreds
            audio into grains and rebuilds it under your fingers.
          </motion.p>

          {/* 3D icon: 3dicons.co (CC0) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src="/icons/headphone.png"
            alt=""
            initial={{ opacity: 0, rotate: -12 }}
            animate={{ opacity: 1, rotate: 8, y: [0, -14, 0] }}
            transition={{
              opacity: { delay: 0.5, duration: 0.6 },
              rotate: { delay: 0.5, duration: 0.6 },
              y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
            }}
            className="pointer-events-none absolute right-[6%] top-[12%] hidden w-40 lg:block xl:w-52"
          />

          <div className="mt-12 grid max-w-4xl grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {OPTIONS.map((o, i) => (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                onClick={() => onChoose(o.id)}
                className="group relative bg-panel p-5 text-left transition-colors hover:bg-panel2"
              >
                <div className="sc-label mb-6 text-dim group-hover:text-acid">
                  {o.num}
                </div>
                {/* 3D icons: 3dicons.co (CC0) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.icon}
                  alt=""
                  className="mb-4 h-14 w-14 object-contain opacity-70 saturate-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100 group-hover:saturate-100"
                />
                <div className="font-display text-sm font-bold tracking-wide text-bone group-hover:text-acid">
                  {o.title}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-dim">
                  {o.desc}
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-acid transition-all duration-300 group-hover:w-full" />
              </motion.button>
            ))}
          </div>
        </main>

        <footer className="border-t border-line px-6 py-3 md:px-10">
          <div className="sc-label">
            no account · no upload · everything stays in your browser · 3d
            icons by 3dicons.co (cc0)
          </div>
        </footer>
      </div>
    </div>
  );
}
