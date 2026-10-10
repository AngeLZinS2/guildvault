import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { rpRequest } from "@/services/rpService";
import { Bell, Building2, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Menu, Radio, ShieldCheck, UsersRound, Vault } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Central", description: "Resumo da operação", path: "/dashboard", icon: LayoutDashboard },
  { name: "Território", description: "Bases e inventário", path: "/properties", icon: Building2 },
  { name: "Caixa", description: "Entradas, saídas e metas", path: "/finances", icon: CircleDollarSign },
  { name: "Crew", description: "Membros e permissões", path: "/members", icon: UsersRound },
  { name: "Organização", description: "Operações e rotinas do RP", path: "/organization", icon: ShieldCheck },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [pendingCount, setPendingCount] = useState(0);
  const [profileName, setProfileName] = useState('Minha conta');
  useEffect(() => {
    let active = true;
    const refresh = () => { void rpRequest<unknown[]>('inbox').then(items => { if (active) setPendingCount(items.length); }).catch(() => { if (active) setPendingCount(0); }); };
    refresh();
    void supabase.auth.getUser().then(({ data }) => { if (active) setProfileName(String(data.user?.name || 'Minha conta')); });
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 60000);
    return () => { active = false; window.removeEventListener('focus', refresh); window.clearInterval(interval); };
  }, [location.pathname, location.search]);
  const current = navItems.find((item) => item.path === location.pathname) ?? navItems[0];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sessão encerrada", description: "O cofre foi bloqueado com segurança." });
    navigate("/");
  };

  return (
    <header className="ops-topbar">
      <div className="ops-topbar-inner">
        <button type="button" className="ops-brand" onClick={() => navigate("/dashboard")} aria-label="Abrir a Central GuildVault">
          <span className="ops-brand-mark"><Vault /></span>
          <span className="ops-brand-copy"><strong>GuildVault</strong><small>Los Santos command</small></span>
        </button>

        <nav className="ops-desktop-nav" aria-label="Navegação principal">
          {navItems.map(({ name, path, icon: Icon }) => {
            const active = path === location.pathname;
            return (
              <motion.button key={path} type="button" onClick={() => navigate(path)} className={cn("ops-nav-link", active && "is-active")} whileTap={reduceMotion ? undefined : { scale: 0.96 }} aria-current={active ? "page" : undefined}>
                <Icon /><span>{name}</span>
                {active && <motion.i layoutId="topbar-active" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
              </motion.button>
            );
          })}
        </nav>

        <div className="ops-topbar-actions">
          <div className="ops-live-status"><Radio /><span>Central da organização</span></div>
          <Button variant="ghost" size="icon" className="ops-icon-button relative" aria-label={`Minhas pendências: ${pendingCount}`} onClick={() => navigate('/organization?module=inbox')}><Bell />{pendingCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-violet-500 px-1 text-[10px] text-white">{pendingCount}</span>}</Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ops-profile-button"><span className="ops-avatar"><ShieldCheck /></span><span className="hidden sm:block">{profileName}</span><ChevronDown /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-dropdown w-64">
              <DropdownMenuLabel><span>{profileName}</span><small>Minha organização</small></DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map(({ name, description, path, icon: Icon }) => (
                <DropdownMenuItem key={path} onSelect={() => navigate(path)} className={cn("ops-dropdown-item", path === location.pathname && "is-current")}><Icon /><span><strong>{name}</strong><small>{description}</small></span></DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleLogout()} className="ops-dropdown-item ops-logout"><LogOut /><span><strong>Sair</strong><small>Bloquear o cofre</small></span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ops-mobile-menu" aria-label="Abrir menu"><Menu /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-dropdown w-72">
              <DropdownMenuLabel><span>{current.name}</span><small>{current.description}</small></DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map(({ name, description, path, icon: Icon }) => (
                <DropdownMenuItem key={path} onSelect={() => navigate(path)} className={cn("ops-dropdown-item", path === location.pathname && "is-current")}><Icon /><span><strong>{name}</strong><small>{description}</small></span></DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleLogout()} className="ops-dropdown-item ops-logout"><LogOut /><span><strong>Sair</strong><small>Bloquear o cofre</small></span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="ops-context-strip"><span>Distrito ativo</span><strong>{current.name}</strong><i /><span>{current.description}</span></div>
    </header>
  );
}
