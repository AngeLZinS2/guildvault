
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { calendarDate, isPositiveAmount, MONEY_LIMIT_MESSAGE } from "@/utils/financeContent";

export type FinanceData = {
  type: 'deposit' | 'withdrawal';
  amount: number;
  member_id: string;
  description?: string;
  proof_url?: string | null;
};

export type PaymentScheduleData = {
  title: string;
  amount: number;
  due_date: string;
  members: string[];
};

export type MonthlyStatsData = {
  month: string;
  income: number;
  expenses: number;
}

export type VerificationData = {
  verified: boolean;
  verified_by?: string | null;
  verification_notes?: string | null;
}

// Função para verificar se o usuário é admin (incluindo super admin)
const checkIsAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('state_id, role')
      .eq('id', user.id)
      .single();

    if (error || !profile) return false;
    
    // Admin se for super admin (state_id "00") ou tiver role "admin"
    return profile.role === 'superadmin' || profile.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar status de admin:', error);
    return false;
  }
};

export const addFinanceRecord = async (data: FinanceData) => {
  try {
    if (!isPositiveAmount(data.amount)) throw new Error(MONEY_LIMIT_MESSAGE);
    // Para retiradas, verificar se o usuário é admin
    if (data.type === 'withdrawal') {
      const isAdmin = await checkIsAdmin();
      
      if (!isAdmin) {
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem registrar retiradas.",
          variant: "destructive"
        });
        return { success: false, error: "Acesso negado" };
      }
    }

    const { error } = await supabase
      .from('finances')
      .insert({
        type: data.type,
        amount: data.amount,
        member_id: data.member_id,
        description: data.description,
        proof_url: data.proof_url,
        date: new Date().toISOString(),
        verified: false,
        status: 'pending' // Set default status as pending
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

    // Get verified by names
    const financesWithNames = finances.map(finance => {
      const member = profiles?.find(p => p.id === finance.member_id);
      
      // Handle the verified_by property safely
      const verifier = finance.verified_by ? 
        profiles?.find(p => p.id === finance.verified_by) : null;
      
      return {
        ...finance,
        member_name: member?.name || 'Unknown',
        verifier_name: verifier?.name
      };
    });

    return { success: true, data: financesWithNames };
  } catch (error: any) {
    console.error("Erro ao buscar transações:", error.message);
    return { success: false, error };
  }
};

export const updateFinanceVerification = async (id: string, data: VerificationData) => {
  try {
    // Update the status based on verification status
    const status = data.verified ? 'verified' : 'pending';
    
    const { error } = await supabase
      .from('finances')
      .update({
        verified: data.verified,
        verified_by: data.verified_by,
        verification_notes: data.verification_notes,
        status: status // Update the status based on verification
      })
      .eq('id', id);

    if (error) throw error;

    toast({
      title: "Status atualizado",
      description: data.verified ? "Transação verificada com sucesso." : "Verificação removida com sucesso.",
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

export const addPaymentSchedule = async (data: PaymentScheduleData) => {
  try {
    if (!isPositiveAmount(data.amount)) throw new Error(MONEY_LIMIT_MESSAGE);
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

export const deletePaymentSchedule = async (id: string) => {
  try {
    const { error } = await supabase
      .from('payment_schedule')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast({
      title: "Pagamento removido",
      description: "O pagamento foi removido com sucesso.",
    });

    return { success: true };
  } catch (error: any) {
    toast({
      title: "Erro ao remover pagamento",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

export const updatePaymentSchedule = async (id: string, data: PaymentScheduleData) => {
  try {
    if (!isPositiveAmount(data.amount)) throw new Error(MONEY_LIMIT_MESSAGE);
    const { error } = await supabase
      .from('payment_schedule')
      .update(data)
      .eq('id', id);

    if (error) throw error;

    toast({
      title: "Pagamento atualizado",
      description: "O pagamento foi atualizado com sucesso.",
    });

    return { success: true };
  } catch (error: any) {
    toast({
      title: "Erro ao atualizar pagamento",
      description: error.message,
      variant: "destructive"
    });
    return { success: false, error };
  }
};

export const fetchMonthlyStats = async () => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get all transactions for the current year
    const { data: finances, error } = await supabase
      .from('finances')
      .select('*')
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`);

    if (error) throw error;

    // Create monthly stats data
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Initialize the monthly data
    const monthlyStats: MonthlyStatsData[] = monthNames.map((month, index) => ({
      month,
      income: 0,
      expenses: 0
    }));

    // Aggregate the finance data by month
    if (finances) {
      finances.forEach(finance => {
        const date = calendarDate(finance.date as string);
        const monthIndex = date.getMonth();
        
        if (finance.type === 'deposit') {
          monthlyStats[monthIndex].income += finance.amount;
        } else if (finance.type === 'withdrawal') {
          monthlyStats[monthIndex].expenses += finance.amount;
        }
      });
    }

    return { success: true, data: monthlyStats };
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas mensais:", error.message);
    return { success: false, error };
  }
};
