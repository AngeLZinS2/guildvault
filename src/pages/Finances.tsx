import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { isPositiveAmount, isCalendarDate, matchesVerification, type VerificationFilter } from "@/utils/financeContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameLoader } from "@/components/ui/game-loader";
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
import type { Transaction } from "@/utils/dateFilters";
import type { MonthlyStatsData } from "@/services/financeService";

type ScheduledPayment = { id: string; title: string; amount: number; due_date: string; members: string[] };

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, currentUser } = useAdminCheck();
  const [transactions, setTransactions] = useState<(Transaction & { member_id: string })[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<ScheduledPayment[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStatsData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("status") || searchParams.get("member") ? "transactions" : "overview");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>(searchParams.get("status") === "pending" ? "pending" : "all");
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

  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const uploadVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);

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
  });

  useEffect(() => {
    if (searchParams.get("status") === "pending") {
      setVerificationFilter("pending");
      setActiveTab("transactions");
    }
    if (searchParams.get("member")) setActiveTab("transactions");
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load members
        const { data: membersData, success: membersSuccess } = await fetchMembers();
        if (membersData) {
          setMembers(membersData);
        }

        // Load finances
        const { data: financesData, success: financesSuccess } = await fetchFinances();
        if (financesData) {
          setTransactions(financesData);
        }

        // Load payment schedule
        const { data: paymentScheduleData, success: scheduleSuccess } = await fetchPaymentSchedule();
        if (paymentScheduleData) {
          setPaymentSchedule(paymentScheduleData);
        }

        // Load monthly stats
        const { data: monthlyStatsData, success: statsSuccess } = await fetchMonthlyStats();
        if (monthlyStatsData) {
          setMonthlyData(monthlyStatsData);
        }
        setLoadError(!membersSuccess || !financesSuccess || !scheduleSuccess || !statsSuccess);
      } catch (error) {
        setLoadError(true);
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
    const version = ++uploadVersion.current;
    setUploadedFilePath(null);
    setUploadError(false);
    if (!file) {
      setUploading(false);
      return;
    }
    setUploading(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("O tamanho máximo permitido é 10MB");
      if (!/\.(png|jpe?g|webp|pdf)$/i.test(file.name)) throw new Error("Selecione uma imagem PNG, JPG, WebP ou um PDF");
      const { error, data } = await supabase.storage
        .from('finance_proofs')
        .upload(file.name, file);
      if (error || !data) throw error || new Error("Não foi possível enviar o comprovante");
      if (version !== uploadVersion.current) return;
      setUploadedFilePath(data.path);
      
      toast({
        title: "Comprovante enviado",
        description: "O comprovante foi anexado com sucesso",
      });
    } catch (error) {
      if (version !== uploadVersion.current) return;
      setUploadError(true);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o upload",
        variant: "destructive"
      });
    } finally {
      if (version === uploadVersion.current) setUploading(false);
    }
  };

  const openTransaction = (type: "deposit" | "withdrawal") => {
    uploadVersion.current++;
    setUploadedFilePath(null);
    setUploadError(false);
    setUploading(false);
    if (type === "deposit") setIsAddDepositOpen(true);
    else setIsAddWithdrawalOpen(true);
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

  const refreshSchedule = async () => {
    const result = await fetchPaymentSchedule();
    if (result.success && result.data) setPaymentSchedule(result.data);
    else toast({ title: "Não foi possível atualizar a agenda", variant: "destructive" });
  };

  const runSave = async (operation: () => Promise<void>) => {
    if (saveLock.current || uploading) return;
    saveLock.current = true;
    setSaving(true);
    try {
      await operation();
    } catch (error) {
      toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const handleDepositSubmit = async () => {
    if (!isPositiveAmount(depositForm.amount) || !depositForm.member || uploadError) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe um valor entre $0,01 e $1.000.000.000, escolha um membro e corrija qualquer erro no comprovante.",
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

    await runSave(async () => {
    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      await refreshData();

      setDepositForm({
        amount: "",
        member: "",
        description: ""
      });
      
      setUploadedFilePath(null);
      setIsAddDepositOpen(false);
    }
    });
  };

  const handleWithdrawalSubmit = async () => {
    if (!isAdmin) return;
    if (!isPositiveAmount(withdrawalForm.amount) || !withdrawalForm.member || uploadError) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe um valor entre $0,01 e $1.000.000.000, escolha um membro e corrija qualquer erro no comprovante.",
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

    await runSave(async () => {
    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      await refreshData();

      setWithdrawalForm({
        amount: "",
        reason: "",
        member: "",
        description: ""
      });
      
      setUploadedFilePath(null);
      setIsAddWithdrawalOpen(false);
    }
    });
  };

  const handlePaymentSubmit = async () => {
    if (!isAdmin) return;
    if (!paymentForm.title.trim() || !isPositiveAmount(paymentForm.amount) || !isCalendarDate(paymentForm.dueDate) || !paymentForm.members) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe título, valor maior que zero e até $1.000.000.000, data válida e responsáveis.",
        variant: "destructive"
      });
      return;
    }

    const newPayment = {
      title: paymentForm.title.trim(),
      amount: Number(paymentForm.amount),
      due_date: paymentForm.dueDate,
      members: [paymentForm.members]
    };

    await runSave(async () => {
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
      });
      
      setIsAddPaymentOpen(false);
    }
    });
  };

  const handleVerifyTransaction = async (id: string, data: VerificationData) => {
    if (!isAdmin || !currentUser?.id) return false;
    const { success } = await updateFinanceVerification(id, data);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = !searchTerm.trim() ||
      (transaction.member_name && transaction.member_name.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
      (transaction.description && transaction.description.toLowerCase().includes(searchTerm.trim().toLowerCase()));
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesMember = !searchParams.get("member") || transaction.member_id === searchParams.get("member");
    return matchesSearch && matchesType && matchesMember && matchesVerification(transaction.verified, verificationFilter);
  });

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setDateFilter("all");
    setCustomDateRange({ from: undefined, to: undefined });
    setVerificationFilter("all");
    setSearchParams({}, { replace: true });
  };

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
        <GameLoader label="Carregando dados financeiros..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] pb-10 motion-enter">
      <FinanceHeader 
        onOpenDepositModal={() => openTransaction("deposit")}
        onOpenWithdrawalModal={() => openTransaction("withdrawal")}
      />

      {loadError && <p role="alert" className="mb-4 rounded-md border border-destructive/40 p-3 text-sm">Parte dos dados não foi carregada. Os números podem estar incompletos. <Button variant="link" onClick={() => window.location.reload()}>Tentar novamente</Button></p>}

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
              onOpenDepositModal={() => openTransaction("deposit")}
            />
            
            <PaymentScheduleCard 
              paymentSchedule={paymentSchedule} 
              canManage={isAdmin}
              members={members}
              onOpenPaymentModal={() => isAdmin ? setIsAddPaymentOpen(true) : setActiveTab("schedule")}
            />
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {searchParams.get("member") && <p className="text-sm text-muted-foreground">Contribuições de {members.find(member => member.id === searchParams.get("member"))?.name ?? "membro selecionado"}. <Button variant="link" onClick={resetFilters}>Ver todos os membros</Button></p>}
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
            currentUserId={currentUser?.id}
            canVerify={isAdmin}
            verificationFilter={verificationFilter}
            onVerificationFilterChange={setVerificationFilter}
            onResetFilters={resetFilters}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <PaymentSchedulePage 
            paymentSchedule={paymentSchedule} 
            setIsAddPaymentOpen={setIsAddPaymentOpen}
            onChanged={refreshSchedule}
            canManage={isAdmin}
            members={members}
          />
        </TabsContent>
      </Tabs>
      
      {/* Modals */}
      <DepositFormModal 
        isOpen={isAddDepositOpen}
        setIsOpen={setIsAddDepositOpen}
        depositForm={depositForm}
        members={isAdmin ? members : members.filter(member => member.id === currentUser?.id)}
        handleFormChange={handleDepositFormChange}
        handleSelectChange={handleSelectChange}
        handleFileUpload={handleFileUpload}
        handleSubmit={handleDepositSubmit}
        busy={saving || uploading}
        uploadError={uploadError}
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
        busy={saving || uploading}
        uploadError={uploadError}
      />
      
      <PaymentFormModal 
        isOpen={isAddPaymentOpen}
        setIsOpen={setIsAddPaymentOpen}
        paymentForm={paymentForm}
        members={members}
        handleFormChange={handlePaymentFormChange}
        handleSelectChange={handleSelectChange}
        handleSubmit={handlePaymentSubmit}
        busy={saving}
      />
    </div>
  );
}
