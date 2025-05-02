
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { 
  addFinanceRecord, 
  fetchFinances, 
  updateFinanceVerification, 
  fetchPaymentSchedule, 
  addPaymentSchedule, 
  fetchMonthlyStats
} from "@/services/financeService";
import { fetchMembers } from "@/services/memberService";
import { MemberData } from "@/types";
import { toast } from "@/hooks/use-toast";

// Import new componentized parts
import { FinanceHeader } from "@/components/finance/FinanceHeader";
import { FinanceStats } from "@/components/finance/FinanceStats";
import { MonthlyChart } from "@/components/finance/MonthlyChart";
import { RecentTransactions } from "@/components/finance/RecentTransactions";
import { PaymentScheduleCard } from "@/components/finance/PaymentScheduleCard";
import { TransactionTable } from "@/components/finance/TransactionTable";
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
  const [loading, setLoading] = useState(true);

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

  const handleFileUpload = () => {
    toast({
      title: "Comprovante enviado",
      description: "O comprovante foi anexado com sucesso",
    });
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
      proof_url: null
    };

    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      await refreshData();

      setDepositForm({
        amount: "",
        member: "",
        description: ""
      });
      
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
      proof_url: null
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

  const handleVerifyTransaction = async (id: string, currentVerifiedStatus: boolean) => {
    const { success } = await updateFinanceVerification(id, !currentVerifiedStatus);
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
            filteredTransactions={filteredTransactions}
            searchTerm={searchTerm}
            filterType={filterType}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            onFilterChange={setFilterType}
            onVerifyTransaction={handleVerifyTransaction}
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
