import { useEffect, useRef, useState } from "react";
import { Expand, MapPin, Minimize } from "lucide-react";
import { GameLoader } from "@/components/ui/game-loader";
import { KakkanadExperience } from "./KakkanadExperience";

type GarageView = "hero" | "front" | "side";

export interface GarageSceneController {
  setView(view: GarageView): void;
  setHeadlights(enabled: boolean): void;
  setExplore(enabled: boolean): void;
  resetCamera(): void;
  dispose(): void;
}

const views: { view: GarageView; label: string }[] = [
  { view: "hero", label: "Perspectiva" },
  { view: "front", label: "Frente" },
  { view: "side", label: "Lateral" },
];

interface CinematicCityProps {
  cinema: boolean;
  onToggleCinema: () => void;
}

export function CinematicCity({ cinema, onToggleCinema }: CinematicCityProps) {
  const [driving, setDriving] = useState(false);
  useEffect(() => { if (!cinema) setDriving(false); }, [cinema]);
  if (driving && cinema) return <KakkanadExperience onGarage={() => setDriving(false)} onExit={onToggleCinema} />;
  return <GarageExperience cinema={cinema} onToggleCinema={onToggleCinema} onDrive={() => { setDriving(true); if (!cinema) onToggleCinema(); }} />;
}

function GarageExperience({ cinema, onToggleCinema, onDrive }: CinematicCityProps & { onDrive: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GarageSceneController | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [view, setView] = useState<GarageView>("hero");
  const [headlights, setHeadlights] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let failed = false;
    let rendered = false;
    let controller: GarageSceneController | null = null;

    const disposeScene = () => {
      const scene = controller;
      controller = null;
      if (controllerRef.current === scene) controllerRef.current = null;
      try {
        scene?.dispose();
      } catch (error) {
        console.warn("Não foi possível liberar a cena 3D.", error);
      }
    };
    const markReady = () => {
      if (cancelled || failed || !controller || !rendered) return;
      setStatus("ready");
    };
    const showFallback = () => {
      if (cancelled || failed) return;
      failed = true;
      setStatus("fallback");
      disposeScene();
    };
    void import("./createGarageScene").then(({ createGarageScene }) => {
      if (cancelled || failed) return;
      controller = createGarageScene(host, () => {
        if (cancelled || failed) return;
        rendered = true;
        markReady();
      }, showFallback);
      if (cancelled || failed) {
        disposeScene();
        return;
      }
      controllerRef.current = controller;
      markReady();
    }).catch(showFallback);

    return () => {
      cancelled = true;
      disposeScene();
    };
  }, []);

  useEffect(() => {
    if (status === "ready") controllerRef.current?.setExplore(cinema);
  }, [cinema, status]);

  useEffect(() => {
    if (status === "ready") controllerRef.current?.setView(view);
  }, [view, status]);

  useEffect(() => {
    if (status === "ready") controllerRef.current?.setHeadlights(headlights);
  }, [headlights, status]);

  return <>
    <div className="cinematic-city" aria-hidden={!cinema} data-status={status}>
      <div className="cinematic-media">
        <img className="cinematic-poster" src="/models/guildvault-garage-audi-poster.jpg" alt="" loading="eager" {...{ fetchpriority: "high" }} />
        <div ref={hostRef} className={`cinematic-canvas ${status === "ready" ? "is-ready" : ""}`} role="img" aria-label="Garagem 3D interativa com Audi R8" />
      </div>
      <div className="cinematic-shade" />
      <div className="cinematic-grain" />
    </div>
    <div className="cinematic-controls" data-status={status}>
      <div className="cinematic-location"><MapPin size={16} /><span>Garagem GuildVault<strong role="status" aria-live="polite">{status === "ready" ? "Cena 3D pronta" : status === "fallback" ? "3D indisponível. Exibindo imagem estática." : "Preparando a garagem"}</strong></span></div>
      {status === "loading" && <GameLoader label="Carregando a cena 3D" inline />}
      <div className="cinematic-switches" role="group" aria-label="Vistas e iluminação da garagem">
        {views.map((entry) => <button key={entry.view} type="button" className="uiverse-button" disabled={status !== "ready"} aria-pressed={view === entry.view} onClick={() => {
          if (view === entry.view) controllerRef.current?.setView(entry.view);
          else setView(entry.view);
        }}>{entry.label}</button>)}
        <button type="button" className="uiverse-button" disabled={status !== "ready"} aria-pressed={headlights} onClick={() => setHeadlights(!headlights)}>Faróis</button>
        {cinema && <button type="button" className="uiverse-button" disabled={status !== "ready"} onClick={() => controllerRef.current?.resetCamera()}>Recentrar câmera</button>}
      </div>
      <button type="button" className="cinema-toggle uiverse-button" disabled={!cinema && status !== "ready"} aria-pressed={cinema} onClick={onToggleCinema}>{cinema ? <Minimize size={15} /> : <Expand size={15} />}{cinema ? "Voltar ao login" : "Explorar em 3D"}</button>
      <button type="button" className="cinema-toggle uiverse-button" disabled={status !== "ready"} onClick={onDrive}>Sair para dirigir</button>
      <span className="camera-hint">{cinema && status === "ready" ? "Mouse: arraste para girar e role para zoom. Toque: arraste para girar e use dois dedos para zoom. Esc para voltar." : "Uma garagem para o seu próximo capítulo."}</span>
      <small className="cinematic-credits"><a href="/licenses/guildvault-3d.txt">Créditos 3D</a></small>
    </div>
  </>;
}
