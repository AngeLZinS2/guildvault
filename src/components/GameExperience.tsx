import { useEffect, useState } from "react";
import { Pause, Play, Crosshair } from "lucide-react";
import { useLocation } from "react-router-dom";

export function GameExperience() {
  const location = useLocation();
  const [paused, setPaused] = useState(() => localStorage.getItem("guildvault-motion") === "paused");
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "active";
    localStorage.setItem("guildvault-motion", paused ? "paused" : "active");
  }, [paused]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return <><div className="route-sweep" key={location.pathname} aria-hidden="true" /><button type="button" className="motion-control" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Ativar animações" : "Pausar animações"}>{paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? "Ativar movimento" : "Pausar movimento"}</span><Crosshair size={14} /></button></>;
}
