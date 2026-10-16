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

        <main className="relative flex flex-1 flex-col px-6 py-10 md:px-10 lg:justify-center lg:px-16">
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
            className="font-display text-[8vw] leading-[0.95] tracking-tight text-bone sm:text-[6.5vw] lg:max-w-[70%] lg:text-[4rem]"
          >
            EVERY SOUND IS AN
            <br />
            <span className="text-acid">INSTRUMENT</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="font-sub mt-6 max-w-md text-sm leading-relaxed tracking-wider text-dim"
          >
            Capture it. Break it apart. Play it differently. stemcell shreds
            audio into grains and rebuilds it under your fingers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="my-8 flex justify-center lg:hidden"
          >
            <HeroWaveform className="h-44 w-44 sm:h-56 sm:w-56" />
          </motion.div>

          <div className="pointer-events-none absolute right-[5%] top-1/2 hidden -translate-y-1/2 lg:block">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, -14, 0] }}
              transition={{
                opacity: { delay: 0.5, duration: 0.6 },
                y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
              }}
            >
              <HeroWaveform className="h-48 w-48 xl:h-64 xl:w-64" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-6 lg:mt-14"
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
              href="https://www.enigma-labs.com/tools"
              target="_blank"
              rel="noreferrer"
              className="text-bone transition-colors hover:text-acid"
            >
              ENIGMA LABS
            </a>
          </div>
          <div className="flex items-center gap-4 text-dim">
            <a
              href="https://instagram.com/_influanto"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="transition-colors hover:text-acid"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://tiktok.com/@_influanto"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="transition-colors hover:text-acid"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
            <a
              href="https://influanto.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Website"
              className="transition-colors hover:text-acid"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
            <a
              href="mailto:info@influanto.com"
              aria-label="Email"
              className="transition-colors hover:text-acid"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
