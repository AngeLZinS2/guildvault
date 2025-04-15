
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "./PasswordInput";

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stateId, setStateId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign in directly with email pattern and password
      const email = `${stateId}@guildvault.com`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle "Email not confirmed" error specifically
      if (error && error.message.includes("Email not confirmed")) {
        // Try to automatically confirm email and login
        try {
          // We can't directly confirm emails on the client side, so let's try to sign in with OTP
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
          });

          if (otpError) {
            throw otpError;
          }

          toast({
            title: "Email enviado para confirmação",
            description: "Por favor verifique seu email para confirmar sua conta e fazer login."
          });
        } catch (confirmError: any) {
          toast({
            title: "Erro ao confirmar email",
            description: confirmError.message || "Não foi possível confirmar o email automaticamente.",
            variant: "destructive"
          });
        }
      } else if (error) {
        throw error;
      } else {
        toast({
          title: "Login efetuado com sucesso",
          description: "Bem-vindo de volta ao GuildVault",
        });
        
        navigate("/dashboard");
      }
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
    <Card className="guild-card">
      <CardHeader>
        <CardTitle className="text-xl text-center">Login</CardTitle>
        <CardDescription className="text-center">
          Entre com seu State ID e senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="state-id" className="text-sm font-medium text-gray-300">
              State ID
            </label>
            <Input
              id="state-id"
              type="text"
              placeholder="Seu State ID"
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              className="guild-input"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Senha
            </label>
            <PasswordInput 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="guild-input"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="guild-button-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-400">
          Credenciais fornecidas pelo administrador da guilda
        </p>
      </CardFooter>
    </Card>
  );
};
