import { useState } from "react";
import { Building2, Users, Wallet, MapPin, ArrowUpRight, Camera } from "lucide-react";

const destinations = [
  { name: "O território", icon: Building2, title: "Cada endereço é uma conquista.", description: "Organize propriedades e inventários. Sua próxima base começa aqui.", image: "night.jpg", alt: "Vista noturna de Vice City no GTA VI", path: "/properties" },
  { name: "O caixa", icon: Wallet, title: "Faça o dinheiro trabalhar.", description: "Acompanhe depósitos, retiradas e metas. Cada movimento deixa um registro.", image: "skyline.jpg", alt: "Edifícios e ruas de Vice City no GTA VI", path: "/finances" },
  { name: "A crew", icon: Users, title: "Ninguém conquista a cidade sozinho.", description: "Reúna os membros, organize as funções e mantenha sua equipe no jogo.", image: "crew.jpg", alt: "Jason e Lucia em captura oficial de GTA VI", path: "/members" },
];

export function LosSantosScene({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: (path: string) => void }) {
  const [selected, setSelected] = useState(0);
  const current = destinations[selected];

  return (
    <div className={`santos-scene ${compact ? "santos-scene-compact" : ""}`}>
      <img className="scene-photo" src={`/hyperframes/gta-vice-city/assets/${current.image}`} alt={current.alt} width={1920} height={1080} />
      <div className="scene-photo-shade" aria-hidden="true" />
      <div className="scene-hud"><span><MapPin size={14} /> Vice City</span><span><Camera size={14} /> GTA VI</span></div>
      <div className="scene-areas" role="group" aria-label="Explore as áreas da guilda">
        {destinations.map(({ name, icon: Icon }, index) => (
          <button key={name} type="button" onClick={() => setSelected(index)} aria-pressed={selected === index}><Icon size={14} />{name}</button>
        ))}
      </div>
      <div className="scene-caption" key={selected} aria-live="polite">
        <span className="scene-marker">{current.name}</span><h3>{current.title}</h3><p>{current.description}</p>
        {onNavigate && <button type="button" className="scene-link" onClick={() => onNavigate(current.path)}>Abrir {current.name.toLowerCase()} <ArrowUpRight size={17} /></button>}
      </div>
    </div>
  );
}
