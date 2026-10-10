import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Fingerprint, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "./PasswordInput";
import { GameLoader } from "@/components/ui/game-loader";

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stateId, setStateId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.startPreview();
      navigate('/dashboard');
    } catch (error: unknown) {
      toast({ title: 'Não foi possível abrir a prévia', description: error instanceof Error ? error.message : 'Permita o armazenamento deste navegador e tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: `${stateId}@guildvault.com`, password });
      if (error) throw error;
      toast({ title: "Missão iniciada", description: "Sua crew está no comando. Bem-vindo ao GuildVault!" });
      navigate("/dashboard");
    } catch (error: unknown) {
      toast({ title: "Acesso negado", description: error instanceof Error ? error.message : "Verifique suas credenciais.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="access-stamp"><Fingerprint size={34} /><span>Seu próximo capítulo<br /><strong>começa aqui.</strong></span></div>
        <h2 className="access-title">Entre no jogo.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Identifique-se para acessar a central da sua guilda.</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="state-id" className="text-sm font-medium text-foreground">State ID</label>
          <Input id="state-id" type="text" inputMode="numeric" autoComplete="username" placeholder="Ex.: 00" value={stateId} onChange={(event) => setStateId(event.target.value)} className="guild-input" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
          <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} className="guild-input" required />
        </div>
        <Button type="submit" className="guild-button-primary mission-button uiverse-button w-full" disabled={isLoading}>{isLoading ? <GameLoader label="Preparando a operação..." inline /> : <>Iniciar sessão <ArrowRight /></>}</Button>
      </form>
      <div className="login-preview">
        <Button type="button" variant="outline" className="login-preview-button w-full" onClick={() => void handlePreview()} disabled={isLoading} aria-describedby="preview-description"><Play aria-hidden="true" /> Explorar prévia</Button>
        <p id="preview-description">Conheça a Crew Eclipse sem login. Dados fictícios, interações reais — nada altera o banco do projeto.</p>
      </div>
      <div className="access-note">Seu State ID é a chave.<br /><span>Precisa de acesso? Fale com a liderança da sua guilda.</span></div>
    </div>
  );
};
