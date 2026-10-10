import { useCallback, useEffect, useRef, useState } from "react";

type SceneTimeline = {
  repeat: (count: number) => SceneTimeline;
  play: () => void;
  pause: () => void;
};
type SceneWindow = Window & { __timelines?: Record<string, SceneTimeline> };

export function GtaCinematicBackground({ animated = true }: { animated?: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const frame = useRef<HTMLIFrameElement>(null);
  const [loadScene, setLoadScene] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(preference.matches);
    preference.addEventListener("change", update);
    update();
    return () => preference.removeEventListener("change", update);
  }, [animated]);

  const syncPlayback = useCallback(() => {
    const active = animated && !reduceMotion && !document.hidden
      && document.documentElement.dataset.motion !== "paused";
    const timeline = (frame.current?.contentWindow as SceneWindow | null)
      ?.__timelines?.["vice-city"];
    if (active) {
      setLoadScene(true);
      timeline?.repeat(-1).play();
    } else {
      timeline?.pause();
    }
  }, [animated, reduceMotion]);

  useEffect(() => {
    if (!animated) return;
    // The existing movement button controls the live Hyperframes timeline too.
    const observer = new MutationObserver(syncPlayback);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [animated, syncPlayback]);

  return (
    <div className="gta-cinematic-background" aria-hidden="true">
      {animated && loadScene && !reduceMotion && (
        <iframe
          ref={frame}
          className="gta-cinematic-scene"
          src="/hyperframes/gta-vice-city/index.html"
          title="Cenário de Vice City"
          tabIndex={-1}
          onLoad={syncPlayback}
        />
      )}
      <div className="gta-cinematic-shade" />
    </div>
  );
}
