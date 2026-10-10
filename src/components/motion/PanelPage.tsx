import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

const PANEL_EASE = [0.2, 0, 0, 1] as const;

export function PanelPage({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      key={location.pathname}
      className="app-content panel-stage"
      initial={{ opacity: 0, x: reduceMotion ? 0 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.42, ease: PANEL_EASE }}
    >
      <motion.div
        aria-hidden="true"
        className="panel-route-trace"
        initial={{ scaleX: reduceMotion ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: PANEL_EASE }}
      />
      {children}
    </motion.main>
  );
}
