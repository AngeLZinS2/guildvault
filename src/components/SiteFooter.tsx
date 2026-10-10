import { Github, Linkedin } from 'lucide-react';

export function SiteFooter() {
  return <footer className="site-footer">
    <p>GuildVault <span aria-hidden="true">·</span> Portfólio de Angelo Neri</p>
    <nav aria-label="Redes e código do autor">
      <a href="https://github.com/AngeLZinS2" target="_blank" rel="noopener noreferrer"><Github aria-hidden="true" /> GitHub</a>
      <a href="https://www.linkedin.com/in/angelo-neri-3921a72b9/" target="_blank" rel="noopener noreferrer"><Linkedin aria-hidden="true" /> LinkedIn</a>
      <a href="https://github.com/AngeLZinS2/guildvault" target="_blank" rel="noopener noreferrer">Código do projeto</a>
    </nav>
  </footer>;
}
