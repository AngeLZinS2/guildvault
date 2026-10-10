import { useEffect, useRef, useState } from "react";

type Props = { onGarage: () => void; onExit: () => void };
type DriveKey = "up" | "down" | "left" | "right" | "jump";

/** Independent Three r128 runtime keeps the original map's animation systems isolated. */
export function KakkanadExperience({ onGarage, onExit }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Construindo ruas, bairros e tráfego…");
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(55);
  const send = (type: string, extra: Record<string, unknown> = {}) => frame.current?.contentWindow?.postMessage({ channel: "guildvault-city", type, ...extra }, window.location.origin);
  const focusGame = () => frame.current?.focus();
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.channel !== "guildvault-city") return;
      if (event.data.type === "ready") { setStatus("ready"); setMessage(String(event.data.detail)); frame.current?.focus(); }
      if (event.data.type === "progress") setMessage(String(event.data.detail));
      if (event.data.type === "error") { setStatus("error"); setMessage("A cidade não conseguiu iniciar neste dispositivo."); }
      if (event.data.type === "exit") onExit();
      if (event.data.type === "audio-state") { setSound(!!event.data.enabled); setVolume(Math.round(Number(event.data.volume)*100)); }
    };
    const release = () => send("release");
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onExit(); };
    window.addEventListener("message", receive);
    window.addEventListener("blur", release);
    window.addEventListener("keydown", escape);
    const timeout = window.setTimeout(() => setStatus(value => value === "loading" ? "error" : value), 90000);
    return () => { window.clearTimeout(timeout); window.removeEventListener("message", receive); window.removeEventListener("blur", release); window.removeEventListener("keydown", escape); };
  }, [attempt, onExit]);
  const pad = (key: DriveKey, label: string, glyph: string) => <button type="button" aria-label={label} disabled={status !== "ready" || paused}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); send("input", { key, pressed: true }); }}
    onPointerUp={() => send("input", { key, pressed: false })} onPointerCancel={() => send("input", { key, pressed: false })} onLostPointerCapture={() => send("input", { key, pressed: false })}
    onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); send("input", { key, pressed: true }); } }}
    onKeyUp={() => send("input", { key, pressed: false })} onBlur={() => send("input", { key, pressed: false })}>{glyph}</button>;
  return <section className="kakkanad-experience" aria-label="GuildVault — cidade jogável Kakkanad">
    <style>{styles}</style>
    <iframe key={attempt} ref={frame} className="kakkanad-frame" src="/drive-city/index.html?quality=auto" title="Cidade 3D Kakkanad: dirija o Audi R8" allow="autoplay; fullscreen" onError={() => setStatus("error")} />
    <header className="kakkanad-header"><div className="kakkanad-brand"><span>GUILDVAULT / DRIVE</span><strong>Kakkanad<span className="kakkanad-live">AO VIVO · 3D</span></strong></div><nav aria-label="Opções da cidade">
      <button type="button" onClick={() => { send("reset"); focusGame(); }} disabled={status !== "ready"}>Reiniciar</button>
      <button type="button" onClick={onGarage}>Garagem</button><button className="kakkanad-login" type="button" onClick={onExit}>Voltar ao login ↗</button>
    </nav></header>
    {status !== "ready" && <div className="kakkanad-loading" role="status" aria-live="polite"><span className="kakkanad-eyebrow">GUILDVAULT · EXPLORAR</span><h2>{status === "error" ? "Não foi possível abrir a cidade" : "Sua próxima volta começa aqui."}</h2><p>{status === "error" ? "Tente novamente ou volte à garagem. O login continua disponível." : message}</p>{status === "loading" ? <div className="kakkanad-loading-line" /> : <button type="button" onClick={() => { setStatus("loading"); setMessage("Preparando a cidade…"); setSound(false); setPaused(false); setAttempt(n => n + 1); }}>Tentar novamente</button>}</div>}
    {status === "ready" && <><aside className="kakkanad-help"><strong>Explore a cidade</strong><p>WASD / setas: dirigir · Espaço: freio<br />F: sair/entrar · C: câmera · T: reiniciar · Esc: login</p><div>
      <button type="button" onClick={() => { send("camera"); focusGame(); }}>Câmera</button>
      <button type="button" onClick={() => { send("action"); focusGame(); }} disabled={paused}>Entrar/sair</button>
      <button type="button" aria-pressed={sound} onClick={() => { send("sound",{enabled:!sound}); focusGame(); }}>Som {sound ? "ligado" : "desligado"}</button>
      <button type="button" onClick={() => { send("radio"); focusGame(); }}>Rádio</button>
      <button type="button" aria-pressed={paused} onClick={() => { send("pause", { paused: !paused }); setPaused(!paused); focusGame(); }}>{paused ? "Continuar" : "Pausar"}</button>
    </div><label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,marginTop:10}}>Volume {volume}%<input aria-label="Volume do jogo" type="range" min="0" max="100" value={volume} onChange={e=>{const value=Number(e.target.value);setVolume(value);send('volume',{value:value/100});}} /></label><p className="kakkanad-model-status">{message}</p></aside>
    <div className="kakkanad-touch" role="group" aria-label="Direção por toque"><div>{pad("left", "Virar à esquerda", "←")}{pad("right", "Virar à direita", "→")}</div><div>{pad("down", "Frear e dar ré", "↓")}{pad("jump", "Freio de mão", "■")}{pad("up", "Acelerar", "↑")}</div></div>
    {paused && <div className="kakkanad-pause" role="status">PAUSADO</div>}</>}
    <footer className="kakkanad-credits"><a href="/licenses/guildvault-3d.txt" target="_blank" rel="noreferrer">Créditos 3D</a><span>·</span><a href="https://github.com/VIVEK1394/vicecity-kakkanad" target="_blank" rel="noreferrer">Mapa: VIVEK1394 · MIT</a></footer>
  </section>;
}
const styles = `
.kakkanad-experience{position:fixed;inset:0;z-index:60;background:#09131a;color:#f1f5f2;font-family:Inter,system-ui,sans-serif}.kakkanad-frame{width:100%;height:100%;border:0;display:block}.kakkanad-header{position:absolute;inset:0 0 auto;padding:18px 24px;background:linear-gradient(#081319ee,#081319b0,transparent);display:flex;justify-content:space-between;align-items:center;gap:15px;pointer-events:none}.kakkanad-header>*{pointer-events:auto}.kakkanad-brand>span{font-size:10px;letter-spacing:.22em;color:#bdd5d1}.kakkanad-brand strong{display:flex;gap:16px;align-items:center;font-size:24px;line-height:1.3;font-weight:650}.kakkanad-live{font-size:9px;letter-spacing:.08em;color:#b5ffde;border:1px solid #8ac0a650;padding:4px 7px;border-radius:4px}.kakkanad-header nav{display:flex;gap:8px}.kakkanad-experience button{border:1px solid #bed6d43b;background:#0c1c24dc;color:#edf8f5;border-radius:8px;min-height:42px;padding:10px 14px;font:inherit;font-size:12px;cursor:pointer;backdrop-filter:blur(12px)}.kakkanad-experience button:hover{background:#234046}.kakkanad-experience button:focus-visible,.kakkanad-experience a:focus-visible{outline:3px solid #c4ffdc;outline-offset:3px}.kakkanad-experience button:disabled{opacity:.4;cursor:default}.kakkanad-header .kakkanad-login{background:#c2dbc8;color:#142820;border-color:#c2dbc8}.kakkanad-help{position:absolute;left:24px;top:165px;max-width:335px;border-left:2px solid #bddec8;background:#0a1825bd;padding:13px 17px;backdrop-filter:blur(8px);border-radius:0 8px 8px 0}.kakkanad-help strong{font-size:14px}.kakkanad-help p{font-size:11px;line-height:1.8;color:#d2ddde;margin:7px 0}.kakkanad-help>div{display:flex;gap:5px;flex-wrap:wrap}.kakkanad-help button{font-size:10px;padding:6px 9px;min-height:36px}.kakkanad-help .kakkanad-model-status{font-size:10px;color:#a9c9b7;margin-bottom:0}.kakkanad-credits{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:8px;white-space:nowrap;background:#071821cf;border-radius:5px;padding:5px 9px;font-size:10px}.kakkanad-credits a{color:#c6d5d7;text-decoration:none}.kakkanad-loading{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%,#29444b,#101c24 65%);display:flex;align-items:flex-start;justify-content:center;flex-direction:column;padding:10vw;z-index:2}.kakkanad-header{z-index:3}.kakkanad-loading h2{font-size:clamp(28px,4vw,54px);font-weight:500;max-width:650px;line-height:1.12;letter-spacing:-.03em;margin:24px 0 18px}.kakkanad-loading p{color:#b5c7cc;font-size:14px;max-width:450px}.kakkanad-eyebrow{font-size:10px;letter-spacing:.25em;color:#c4d9c8}.kakkanad-loading-line{height:2px;width:240px;background:#35484d;margin-top:28px;overflow:hidden}.kakkanad-loading-line:after{content:'';display:block;background:#c2dbc8;width:40%;height:100%;animation:kakkanad-load 1.5s ease-in-out infinite}.kakkanad-touch{position:absolute;bottom:46px;left:20px;right:20px;display:none;justify-content:space-between;pointer-events:none}.kakkanad-touch>div{display:flex;gap:8px}.kakkanad-touch button{width:58px;height:58px;font-size:24px;touch-action:none;user-select:none;pointer-events:auto}.kakkanad-pause{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#0b1a25dd;padding:20px 30px;letter-spacing:.2em;border-radius:10px;pointer-events:none}@keyframes kakkanad-load{from{transform:translateX(-100%)}to{transform:translateX(350%)}}@media(pointer:coarse){.kakkanad-touch{display:flex}}@media(max-width:700px){.kakkanad-header{padding:12px;align-items:flex-start;flex-wrap:wrap;gap:8px}.kakkanad-brand strong{font-size:20px}.kakkanad-header nav{gap:5px}.kakkanad-header button{font-size:10px;padding:8px;min-height:38px}.kakkanad-help{top:110px;left:12px;max-width:255px;padding:8px 10px}.kakkanad-help p{font-size:9px}.kakkanad-help strong{font-size:12px}.kakkanad-touch{left:10px;right:10px}.kakkanad-touch button{width:49px;height:54px}.kakkanad-credits{font-size:8px;bottom:6px}.kakkanad-live{display:none}}@media(prefers-reduced-motion:reduce){.kakkanad-loading-line:after{animation:none;width:100%}}
`;

