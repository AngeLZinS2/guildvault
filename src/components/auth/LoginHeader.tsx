import { Crosshair } from "lucide-react";

export function LoginHeader() {
  return <section className="login-world">
    <div className="game-brand"><Crosshair size={25} /><span>guild<span>vault</span></span><span className="edition-tag">GTA V Roleplay</span></div>
    <div className="world-headline"><h1>Sua crew.<br />Seu próximo destino.</h1><p>A central da sua guilda, antes da próxima volta.</p></div>
  </section>;
}
