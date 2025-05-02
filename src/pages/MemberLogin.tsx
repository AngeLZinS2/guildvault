
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function MemberLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Login efetuado com sucesso",
        description: "Bem-vindo de volta ao GuildVault",
      });
      
      navigate("/members");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-guild-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white">Portal do Membro</h1>
            <p className="text-gray-400 mt-2">Acesse o sistema da sua guilda</p>
          </div>

          <Card className="guild-card bg-guild-surface border-guild-primary/30">
            <CardHeader>
              <CardTitle className="text-xl text-center text-white">
                Login de Membro
              </CardTitle>
              <CardDescription className="text-center text-gray-300">
                Entre com seu email e senha temporária
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu-email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-guild-dark/70 border-guild-primary/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Senha Temporária
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="123456"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-guild-dark/70 border-guild-primary/30 text-white pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="bg-guild-primary hover:bg-guild-primary/80 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-center text-gray-400 text-sm">
              Use o código de 6 dígitos fornecido pelo administrador
            </CardFooter>
          </Card>

          <p className="text-center mt-8 text-sm text-gray-500">
            © {new Date().getFullYear()} GuildVault. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </>
  );
}
