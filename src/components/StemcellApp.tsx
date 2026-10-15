"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { engine } from "@/audio/engine";
import {
  DEFAULT_FX,
  DEFAULT_GRANULAR,
  FxParams,
  GranularParams,
  OscParams,
  SourceInfo,
} from "@/audio/types";
import Landing, { SourceChoice } from "./Landing";
import SourceModal, { ModalTab } from "./SourceModal";
import Workspace from "./Workspace";

export default function StemcellApp() {
  const [view, setView] = useState<"landing" | "workspace">("landing");
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [granular, setGranular] = useState<GranularParams>({
    ...DEFAULT_GRANULAR,
  });
  const [fx, setFx] = useState<FxParams>({ ...DEFAULT_FX });
  const [osc, setOsc] = useState<OscParams | null>(null);
  const [modal, setModal] = useState<ModalTab | null>(null);

  const choose = useCallback(async (c: SourceChoice) => {
    await engine.init();
    setModal(c);
  }, []);

  const onGranular = useCallback(
    <K extends keyof GranularParams>(k: K, v: number) => {
      setGranular((s) => ({ ...s, [k]: v }));
      engine.setParam(k, v);
    },
    []
  );

  const onFx = useCallback(<K extends keyof FxParams>(k: K, v: number) => {
    setFx((s) => ({ ...s, [k]: v }));
    engine.setFx(k, v);
  }, []);

  const ready = useCallback(
    (info: SourceInfo) => {
      engine.resume();
      engine.pushParams();
      if (info.kind !== "osc") engine.osc = null;
      setSource(info);
      setBuffer(engine.source);
      setOsc(engine.osc ? { ...engine.osc } : null);
      setModal(null);
      setView("workspace");
    },
    []
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
          >
            <Landing onChoose={choose} />
          </motion.div>
        ) : (
          source && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Workspace
                source={source}
                buffer={buffer}
                granular={granular}
                fx={fx}
                osc={osc}
                onGranular={onGranular}
                onFx={onFx}
                onReplace={() => setModal("file")}
                onSourceLoaded={ready}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>
      {modal && (
        <SourceModal
          initialTab={modal}
          onReady={ready}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
