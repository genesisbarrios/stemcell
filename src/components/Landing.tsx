"use client";

import { motion } from "motion/react";
import ParticleCanvas from "./ParticleCanvas";
import HeroWaveform from "./HeroWaveform";

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void font-display">
      <ParticleCanvas className="absolute inset-0 h-full w-full opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0b0b0a_85%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo-horizontal_for-dark-bg.svg"
            alt="STEMCELL"
            className="h-7 w-auto"
          />
          <div className="font-sub hidden text-[10px] tracking-[0.2em] text-dim sm:block">
            experimental granular instrument — v0.1
          </div>
        </header>

        <main className="relative flex flex-1 flex-col justify-center px-6 py-10 md:px-10 lg:px-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-sub mb-4 text-[11px] tracking-[0.25em] text-acid"
          >
            turn any sound into a playable instrument
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display text-[13vw] leading-[0.88] tracking-tight text-bone sm:text-[10vw] lg:text-[7.5rem]"
          >
            EVERY SOUND
            <br />
            IS AN <span className="text-acid">INSTRUMENT</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="font-sub mt-6 max-w-md text-sm leading-relaxed tracking-wider text-dim"
          >
            Capture it. Break it apart. Play it differently. STEMCELL shreds
            audio into grains and rebuilds it under your fingers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -14, 0] }}
            transition={{
              opacity: { delay: 0.5, duration: 0.6 },
              y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
            }}
            className="pointer-events-none absolute right-[6%] top-[10%] hidden lg:block"
          >
            <HeroWaveform className="h-56 w-56 xl:h-72 xl:w-72" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-14"
          >
            <button
              onClick={onStart}
              className="group relative border border-acid bg-acid px-10 py-4 font-display text-sm tracking-[0.25em] text-void transition-colors hover:bg-transparent hover:text-acid"
            >
              START CREATING →
            </button>
            <div className="font-sub mt-4 text-[9px] tracking-[0.2em] text-dim">
              no account · no upload · everything stays in your browser
            </div>
          </motion.div>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-3 md:px-10">
          <div className="font-sub text-[9px] tracking-[0.2em] text-dim">
            developed by{" "}
            <a
              href="https://enigmasoftwareconsulting.com"
              target="_blank"
              rel="noreferrer"
              className="text-bone transition-colors hover:text-acid"
            >
              ENIGMA LABS
            </a>
          </div>
          <div className="font-sub flex items-center gap-4 text-[9px] tracking-[0.2em] text-dim">
            <a
              href="https://github.com/genesisbarrios"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-acid"
            >
              GITHUB
            </a>
            <a
              href="https://www.linkedin.com/in/genesis-barrios"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-acid"
            >
              LINKEDIN
            </a>

          </div>
        </footer>
      </div>
    </div>
  );
}
