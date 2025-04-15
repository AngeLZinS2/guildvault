import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginHeader } from "@/components/auth/LoginHeader";

export default function Login() {
  const navigate = useNavigate();

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
      {/* Static Background Image */}
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url('public/Fotos/Los-City.jpg')`,
          // Add a dark overlay to ensure text remains readable
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}
      />
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginHeader />
          <LoginForm />

          <p className="text-center mt-8 text-sm text-gray-500">
            © {new Date().getFullYear()} GuildVault. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </>
  );
}