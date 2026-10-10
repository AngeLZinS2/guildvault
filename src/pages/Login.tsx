
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginHeader } from "@/components/auth/LoginHeader";
import { GtaCinematicBackground } from "@/components/GtaCinematicBackground";
import { Switch } from "@/components/ui/switch";

const CinematicCity = lazy(() => import("@/components/effects/CinematicCity").then(module => ({ default: module.CinematicCity })));

export default function Login() {
  const navigate = useNavigate();
  const [cinema, setCinema] = useState(false);
  const [garage, setGarage] = useState(() => localStorage.getItem("guildvault-login-background") === "garage");

  const changeBackground = (useGarage: boolean) => {
    setCinema(false);
    setGarage(useGarage);
    localStorage.setItem("guildvault-login-background", useGarage ? "garage" : "gta");
  };

  useEffect(() => {
    if (!cinema) return;
    const exitCinema = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCinema(false);
    };
    window.addEventListener("keydown", exitCinema);
    return () => window.removeEventListener("keydown", exitCinema);
  }, [cinema]);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    
    checkSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <>
      <main className={`game-login cinematic-login ${cinema ? "is-cinema" : ""} ${garage ? "has-garage-background" : "has-gta-background"}`}>
        {garage ? (
          <Suspense fallback={<div className="cinematic-city" aria-hidden="true"><img className="cinematic-poster" src="/models/guildvault-garage-audi-poster.jpg" alt="" /></div>}>
            <CinematicCity cinema={cinema} onToggleCinema={() => setCinema(!cinema)} />
          </Suspense>
        ) : <GtaCinematicBackground />}
        <div className="login-background-switch">
          <span className={!garage ? "is-selected" : ""}>GTA VI</span>
          <Switch id="login-background" checked={garage} onCheckedChange={changeBackground} aria-label="Usar garagem 3D como fundo" />
          <label htmlFor="login-background" className={garage ? "is-selected" : ""}>Garagem 3D</label>
        </div>
        <div className="login-layout" hidden={cinema}>
          <LoginHeader />
          <section className="login-access">
            <div className="mx-auto w-full max-w-md">
              <LoginForm />
              <p className="mt-8 text-center text-xs text-muted-foreground">GuildVault · Feito para sua crew.<br />Projeto independente para GTA V RP.</p>
            </div>
          </section>
        </div>
        {!garage && <div className="login-scene-credit"><span>Vice City · GTA VI</span><a href="/licenses/gta-background.txt">Créditos das imagens</a></div>}
      </main>
    </>
  );
}
