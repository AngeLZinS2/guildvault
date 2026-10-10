
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export type MemberData = {
  name: string;
  role: string;
  email?: string; // Made optional as we'll generate it from stateId
  stateId: string;
};

function generatePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const addMemberWithAuth = async (data: MemberData, password?: string) => {
  try {
    // Use provided password or generate a permanent password
    const finalPassword = password || generatePassword();
    
    // Generate email from state ID
    const email = `${data.stateId}@guildvault.com`;
    
    // Create the member through the authenticated API.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: finalPassword,
      options: {
        data: {
          name: data.name,
          role: data.role,
          state_id: data.stateId
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (authError) {
      toast({
        title: "Erro ao adicionar membro",
        description: authError.message,
        variant: "destructive"
      });
      return { success: false, error: authError };
    }

    toast({
      title: "Membro adicionado com sucesso",
      description: `Senha: ${finalPassword}. Anote esta senha, pois ela não será exibida novamente.`,
    });

    return { success: true, data: authData.user, password: finalPassword };
  } catch (error: any) {
    toast({
      title: "Erro ao adicionar membro",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

export const fetchMembers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Erro ao buscar membros:", error.message);
    return { success: false, error };
  }
};

export const updateMemberStatus = async (id: string, status: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        status, 
        last_activity: new Date().toISOString().split('T')[0] 
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao atualizar status:", error.message);
    return { success: false, error };
  }
};
