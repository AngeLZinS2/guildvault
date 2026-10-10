import { useEffect, useRef, useState } from "react";
import type { DriveInput, DriveSceneController } from "./createDriveScene";

export function DriveExperience({ onGarage, onExit }: { onGarage: () => void; onExit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<DriveSceneController | null>(null);
  const [status, setStatus] = useState("loading");
  const [telemetry, setTelemetry] = useState({ speed: 0, distance: 0, x: 0, z: 0 });
  const places = [
    { x: 0, z: 80, name: "Central da crew", text: "Membros, cargos e permissões reunidos para organizar sua guilda." },
    { x: 60, z: 140, name: "Distrito de negócios", text: "Acompanhe o caixa, os depósitos e as retiradas da sua crew no painel financeiro." },
    { x: -60, z: 80, name: "Seu território", text: "Organize propriedades e mantenha o patrimônio da guilda em um só lugar." },
  ];
  const place = places.find(point => Math.hypot(point.x - telemetry.x, point.z - telemetry.z) < 17);
  useEffect(() => {
    let disposed = false;
    let scene: DriveSceneController | undefined;
    void import("./createDriveScene").then(({ createDriveScene }) => {
      if (disposed || !host.current) return;
      scene = createDriveScene(host.current, () => { if (!disposed) { setStatus("ready"); host.current?.focus(); } }, () => { if (!disposed) setStatus("error"); }, (value) => { if (!disposed) setTelemetry(value); });
      controller.current = scene;
    }).catch(() => { if (!disposed) setStatus("error"); });
    return () => { disposed = true; scene?.dispose(); controller.current = null; };
  }, []);
  const pad = (input: DriveInput, label: string, symbol: string) => <button type="button" aria-label={label} disabled={status !== "ready"}
    onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); controller.current?.setInput(input, true); }}
    onPointerUp={() => controller.current?.setInput(input, false)} onPointerCancel={() => controller.current?.setInput(input, false)} onLostPointerCapture={() => controller.current?.setInput(input, false)}
    onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); controller.current?.setInput(input, true); } }}
    onKeyUp={() => controller.current?.setInput(input, false)} onBlur={() => controller.current?.setInput(input, false)}>{symbol}</button>;
  return <section className="drive-experience" aria-label="Circuito urbano GuildVault">
    <div className="drive-canvas" ref={host} tabIndex={0} aria-label="Direção: W ou seta acima acelera; S ou seta abaixo dá ré; A e D viram; espaço freia; R reinicia; Escape volta ao login" />
    <header className="drive-top"><div><strong>Orla Vault</strong><span>Um bairro original para explorar</span></div><nav aria-label="Opções do circuito"><button onClick={() => { controller.current?.reset(); host.current?.focus(); }} disabled={status !== "ready"}>Reiniciar</button><button onClick={onGarage}>Garagem</button><button onClick={onExit}>Voltar ao login</button></nav></header>
    {status !== "ready" && <div className="drive-loading" role="status">{status === "error" ? "Não foi possível abrir o circuito 3D. Volte à garagem ou ao login." : "Preparando o carro e a orla…"}</div>}
    <aside className="drive-instructions"><strong>{place?.name ?? "Conheça a GuildVault pelo caminho."}</strong><p>{place?.text ?? "Siga os pontos no mapa para descobrir a central da crew, o caixa e seu território."}</p><p>WASD / setas · Espaço freia · R reinicia · Esc sai</p></aside>
    <svg className="drive-map" viewBox="-100 -30 200 230" role="img" aria-label="Mapa: avenida central, duas avenidas laterais e três pontos de interesse">
      <rect x="-100" y="-30" width="200" height="230" rx="12" fill="#122536e6" />
      <g transform="translate(0 160) scale(1 -1)" stroke="#6d8795" strokeWidth="5"><path d="M-60 0V170 M0 0V170 M60 0V170 M-80 20H80 M-80 80H80 M-80 140H80 M-80 170H80" fill="none" />{places.map(point => <circle key={point.name} cx={point.x} cy={point.z} r="6" fill="#edbb85" stroke="none" />)}<circle cx={telemetry.x} cy={telemetry.z} r="5" fill="#b0fff0" stroke="#fff" strokeWidth="2" /></g>
    </svg>
    <div className="drive-dashboard"><output aria-label="Velocidade"><b>{Math.round(Math.abs(telemetry.speed))}</b> km/h</output><span>{Math.round(telemetry.distance)} m percorridos</span></div>
    <div className="drive-touch" role="group" aria-label="Controles de direção por toque"><div>{pad("left", "Virar à esquerda", "←")}{pad("right", "Virar à direita", "→")}</div><div>{pad("backward", "Frear e dar ré", "↓")}{pad("brake", "Freio", "■")}{pad("forward", "Acelerar", "↑")}</div></div>
    <a className="drive-credits" href="/licenses/guildvault-3d.txt">Créditos 3D</a>
  </section>;
}
