
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type FinanceData = {
  type: 'deposit' | 'withdrawal';
  amount: number;
  member_id: string;
  description?: string;
  proof_url?: string | null;
};

export const addFinanceRecord = async (data: FinanceData) => {
  try {
    const { error } = await supabase
      .from('finances')
      .insert({
        type: data.type,
        amount: data.amount,
        member_id: data.member_id,
        description: data.description,
        proof_url: data.proof_url,
        date: new Date().toISOString(),
        verified: false
      });

    if (error) throw error;

    toast({
      title: data.type === 'deposit' ? "Depósito registrado" : "Retirada registrada",
      description: "Transação financeira registrada com sucesso.",
    });

    return { success: true };
  } catch (error: any) {
    toast({
      title: "Erro ao registrar transação",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

export const fetchFinances = async () => {
  try {
    const { data: finances, error } = await supabase
      .from('finances')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // Get profiles to match member_id to names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name');

    const financesWithNames = finances.map(finance => {
      const member = profiles?.find(p => p.id === finance.member_id);
      return {
        ...finance,
        member_name: member?.name || 'Unknown'
      };
    });

    return { success: true, data: financesWithNames };
  } catch (error: any) {
    console.error("Erro ao buscar transações:", error.message);
    return { success: false, error };
  }
};

export const updateFinanceVerification = async (id: string, verified: boolean) => {
  try {
    const { error } = await supabase
      .from('finances')
      .update({ verified })
      .eq('id', id);

    if (error) throw error;

    toast({
      title: "Status atualizado",
      description: `Transação marcada como ${verified ? 'verificada' : 'não verificada'}.`,
    });

    return { success: true };
  } catch (error: any) {
    toast({
      title: "Erro ao atualizar status",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

// Payment Schedule functions
export const fetchPaymentSchedule = async () => {
  try {
    const { data, error } = await supabase
      .from('payment_schedule')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error("Erro ao buscar agenda de pagamentos:", error.message);
    return { success: false, error };
  }
};

export type PaymentScheduleData = {
  title: string;
  amount: number;
  due_date: string;
  members: string[];
};

export const addPaymentSchedule = async (data: PaymentScheduleData) => {
  try {
    const { error } = await supabase
      .from('payment_schedule')
      .insert({
        title: data.title,
        amount: data.amount,
        due_date: data.due_date,
        members: data.members
      });

    if (error) throw error;

    toast({
      title: "Pagamento agendado",
      description: "O pagamento foi agendado com sucesso.",
    });

    return { success: true };
  } catch (error: any) {
    toast({
      title: "Erro ao agendar pagamento",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};
