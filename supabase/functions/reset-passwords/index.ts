
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// Configuração do cliente do Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    // Inicializa o cliente do Supabase com a chave de serviço
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Chama a função que reseta as senhas
    const { data, error } = await supabase
      .rpc('reset_temp_passwords');
      
    if (error) {
      throw error;
    }
    
    console.log("Senhas temporárias resetadas com sucesso");
    
    return new Response(
      JSON.stringify({ success: true, message: "Senhas temporárias resetadas com sucesso" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao resetar senhas:", error.message);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
