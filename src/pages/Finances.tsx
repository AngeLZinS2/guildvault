import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { 
  addFinanceRecord, 
  fetchFinances, 
  updateFinanceVerification, 
  fetchPaymentSchedule, 
  addPaymentSchedule, 
  fetchMonthlyStats,
  VerificationData
} from "@/services/financeService";
import { fetchMembers } from "@/services/memberService";
import { MemberData } from "@/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { filterTransactionsByDate } from "@/utils/dateFilters";

// Import new componentized parts
import { FinanceHeader } from "@/components/finance/FinanceHeader";
import { FinanceStats } from "@/components/finance/FinanceStats";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { RecentTransactions } from "@/components/finance/RecentTransactions";
import { PaymentScheduleCard } from "@/components/finance/PaymentScheduleCard";
import { TransactionTable } from "@/components/finance/transaction-table/TransactionTable";
import { PaymentSchedulePage } from "@/components/finance/PaymentSchedulePage";
import { DepositFormModal } from "@/components/finance/DepositFormModal";
import { WithdrawalFormModal } from "@/components/finance/WithdrawalFormModal";
import { PaymentFormModal } from "@/components/finance/PaymentFormModal";

export default function Finances() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [isAddWithdrawalOpen, setIsAddWithdrawalOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

  const [depositForm, setDepositForm] = useState({
    amount: "",
    member: "",
    description: ""
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    reason: "",
    member: "",
    description: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    title: "",
    amount: "",
    dueDate: "",
    members: "",
    description: "",
    sendNotifications: false
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load members
        const { data: membersData } = await fetchMembers();
        if (membersData) {
          setMembers(membersData);
        }

        // Load finances
        const { data: financesData } = await fetchFinances();
        if (financesData) {
          setTransactions(financesData);
        }

        // Load payment schedule
        const { data: paymentScheduleData } = await fetchPaymentSchedule();
        if (paymentScheduleData) {
          setPaymentSchedule(paymentScheduleData);
        }

        // Load monthly stats
        const { data: monthlyStatsData } = await fetchMonthlyStats();
        if (monthlyStatsData) {
          setMonthlyData(monthlyStatsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados financeiros",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleFileUpload = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setUploadedFilePath(null);
      return;
    }

    setSelectedFile(file);

    try {
      // Check if file is within size limit (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 10MB",
          variant: "destructive"
        });
        return;
      }

      // Create a storage bucket for finance proofs if it doesn't exist
      // Note: This would normally be done through SQL migrations
      // For this example, we'll handle it in the frontend
      
      // Generate a unique filename to prevent collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `finance_proofs/${fileName}`;
      
      // Upload the file to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('finance_proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        
        // Handle specific error for bucket not found
        if (uploadError.message?.includes('bucket not found')) {
          toast({
            title: "Erro no upload",
            description: "Bucket de armazenamento não encontrado. Por favor, configure o armazenamento no Supabase.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no upload",
            description: uploadError.message,
            variant: "destructive"
          });
        }
        
        return;
      }
      
      // Get public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('finance_proofs')
        .getPublicUrl(filePath);
        
      setUploadedFilePath(publicUrl);
      
      toast({
        title: "Comprovante enviado",
        description: "O comprovante foi anexado com sucesso",
      });
    } catch (error) {
      console.error("Error handling file upload:", error);
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao processar o upload",
        variant: "destructive"
      });
    }
  };

  const handleDepositFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDepositForm({
      ...depositForm,
      [e.target.id]: e.target.value
    });
  };

  const handleWithdrawalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setWithdrawalForm({
      ...withdrawalForm,
      [e.target.id]: e.target.value
    });
  };

  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setPaymentForm({
      ...paymentForm,
      [e.target.id]: value
    });
  };

  const handleSelectChange = (formName: string, field: string, value: string) => {
    if (formName === 'deposit') {
      setDepositForm({ ...depositForm, [field]: value });
    } else if (formName === 'withdrawal') {
      setWithdrawalForm({ ...withdrawalForm, [field]: value });
    } else if (formName === 'payment') {
      setPaymentForm({ ...paymentForm, [field]: value });
    }
  };

  const refreshData = async () => {
    const { data: financesData } = await fetchFinances();
    if (financesData) {
      setTransactions(financesData);
    }
    
    const { data: monthlyStatsData } = await fetchMonthlyStats();
    if (monthlyStatsData) {
      setMonthlyData(monthlyStatsData);
    }
  };

  const handleDepositSubmit = async () => {
    if (!depositForm.amount || !depositForm.member) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newTransaction = {
      type: "deposit" as 'deposit' | 'withdrawal',
      amount: Number(depositForm.amount),
      member_id: depositForm.member,
      description: depositForm.description,
      proof_url: uploadedFilePath
    };

    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      await refreshData();

      setDepositForm({
        amount: "",
        member: "",
        description: ""
      });
      
      setSelectedFile(null);
      setUploadedFilePath(null);
      setIsAddDepositOpen(false);
    }
  };

  const handleWithdrawalSubmit = async () => {
    if (!withdrawalForm.amount || !withdrawalForm.member) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newTransaction = {
      type: "withdrawal" as 'deposit' | 'withdrawal',
      amount: Number(withdrawalForm.amount),
      member_id: withdrawalForm.member,
      description: withdrawalForm.description || withdrawalForm.reason,
      proof_url: uploadedFilePath
    };

    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      await refreshData();

      setWithdrawalForm({
        amount: "",
        reason: "",
        member: "",
        description: ""
      });
      
      setSelectedFile(null);
      setUploadedFilePath(null);
      setIsAddWithdrawalOpen(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentForm.title || !paymentForm.amount || !paymentForm.dueDate || !paymentForm.members) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newPayment = {
      title: paymentForm.title,
      amount: Number(paymentForm.amount),
      due_date: paymentForm.dueDate,
      members: [paymentForm.members]
    };

    const { success } = await addPaymentSchedule(newPayment);
    if (success) {
      const { data: paymentScheduleData } = await fetchPaymentSchedule();
      if (paymentScheduleData) {
        setPaymentSchedule(paymentScheduleData);
      }

      setPaymentForm({
        title: "",
        amount: "",
        dueDate: "",
        members: "",
        description: "",
        sendNotifications: false
      });
      
      setIsAddPaymentOpen(false);
    }
  };

  const handleVerifyTransaction = async (id: string, data: VerificationData) => {
    const { success } = await updateFinanceVerification(id, data);
    if (success) {
      await refreshData();
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = 
      (transaction.member_name && transaction.member_name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || transaction.type === filterType;
    return matchesSearch && matchesType;
  });

  const dateFilteredTransactions = filterTransactionsByDate(filteredTransactions, dateFilter, customDateRange);

  const totalBalance = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'deposit') {
      return acc + transaction.amount;
    } else {
      return acc - transaction.amount;
    }
  }, 0);

  const totalIncome = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'deposit') {
      return acc + transaction.amount;
    }
    return acc;
  }, 0);

  const totalExpenses = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'withdrawal') {
      return acc + transaction.amount;
    }
    return acc;
  }, 0);

  const currentMonth = new Date().getMonth();
  const currentMonthData = monthlyData[currentMonth] || { income: 0, expenses: 0 };
  const currentMonthIncome = currentMonthData.income;
  const currentMonthExpenses = currentMonthData.expenses;

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-20 pb-10 flex flex-col items-center justify-center h-[80vh]">
        <Loader2 className="h-12 w-12 animate-spin text-guild-primary mb-4" />
        <h2 className="text-xl font-medium">Carregando dados financeiros...</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-10">
      <FinanceHeader 
        onOpenDepositModal={() => setIsAddDepositOpen(true)} 
        onOpenWithdrawalModal={() => setIsAddWithdrawalOpen(true)} 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="schedule">Agendamento</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <FinanceStats 
            totalBalance={totalBalance} 
            totalIncome={totalIncome} 
            totalExpenses={totalExpenses} 
            currentMonthIncome={currentMonthIncome} 
            currentMonthExpenses={currentMonthExpenses} 
          />

          <MonthlyChart monthlyData={monthlyData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentTransactions 
              transactions={transactions} 
              onSeeAllTransactions={() => setActiveTab("transactions")} 
              onOpenDepositModal={() => setIsAddDepositOpen(true)}
            />
            
            <PaymentScheduleCard 
              paymentSchedule={paymentSchedule} 
              onOpenPaymentModal={() => setIsAddPaymentOpen(true)} 
            />
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <TransactionTable
            transactions={transactions}
            filteredTransactions={dateFilteredTransactions}
            searchTerm={searchTerm}
            filterType={filterType}
            dateFilter={dateFilter}
            customDateRange={customDateRange}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            onFilterChange={setFilterType}
            onDateFilterChange={setDateFilter}
            onCustomDateRangeChange={setCustomDateRange}
            onVerifyTransaction={handleVerifyTransaction}
            currentUserId="test-user-id" // In a real app, this would be the current user's ID
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <PaymentSchedulePage 
            paymentSchedule={paymentSchedule} 
            isAddPaymentOpen={isAddPaymentOpen}
            setIsAddPaymentOpen={setIsAddPaymentOpen}
          />
        </TabsContent>
      </Tabs>
      
      {/* Modals */}
      <DepositFormModal 
        isOpen={isAddDepositOpen}
        setIsOpen={setIsAddDepositOpen}
        depositForm={depositForm}
        members={members}
        handleFormChange={handleDepositFormChange}
        handleSelectChange={handleSelectChange}
        handleFileUpload={handleFileUpload}
        handleSubmit={handleDepositSubmit}
      />
      
      <WithdrawalFormModal 
        isOpen={isAddWithdrawalOpen}
        setIsOpen={setIsAddWithdrawalOpen}
        withdrawalForm={withdrawalForm}
        members={members}
        handleFormChange={handleWithdrawalFormChange}
        handleSelectChange={handleSelectChange}
        handleFileUpload={handleFileUpload}
        handleSubmit={handleWithdrawalSubmit}
      />
      
      <PaymentFormModal 
        isOpen={isAddPaymentOpen}
        setIsOpen={setIsAddPaymentOpen}
        paymentForm={paymentForm}
        members={members}
        handleFormChange={handlePaymentFormChange}
        handleSelectChange={handleSelectChange}
        handleSubmit={handlePaymentSubmit}
      />
    </div>
  );
}
