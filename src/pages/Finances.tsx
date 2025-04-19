import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Upload, 
  Download, 
  AlertCircle, 
  DollarSign,
  BarChart4,
  ChevronsUpDown,
  Filter,
  Search,
  FileText,
  Plus
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addFinanceRecord, fetchFinances, updateFinanceVerification, fetchPaymentSchedule, addPaymentSchedule, deletePaymentSchedule, updatePaymentSchedule } from "@/services/financeService";
import { fetchMembers } from "@/services/memberService";
import { MemberData } from "@/types";

export default function Finances() {
  const [transactions, setTransactions] = useState([]);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [monthlyData, setMonthlyData] = useState([
    { month: "Jan", income: 0, expenses: 0 },
    { month: "Fev", income: 0, expenses: 0 },
    { month: "Mar", income: 0, expenses: 0 },
    { month: "Abr", income: 0, expenses: 0 },
    { month: "Mai", income: 0, expenses: 0 },
    { month: "Jun", income: 0, expenses: 0 },
  ]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [isAddWithdrawalOpen, setIsAddWithdrawalOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

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
      const { data: membersData } = await fetchMembers();
      if (membersData) {
        setMembers(membersData);
      }

      const { data: financesData } = await fetchFinances();
      if (financesData) {
        setTransactions(financesData);
      }

      const { data: paymentScheduleData } = await fetchPaymentSchedule();
      if (paymentScheduleData) {
        setPaymentSchedule(paymentScheduleData);
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

  const handleDepositSubmit = async () => {
    const newTransaction = {
      type: "deposit",
      amount: Number(depositForm.amount),
      member_id: depositForm.member,
      description: depositForm.description,
      proof_url: null
    };

    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      const { data: financesData } = await fetchFinances();
      if (financesData) {
        setTransactions(financesData);
      }

      const currentMonth = new Date().getMonth();
      const updatedMonthlyData = [...monthlyData];
      updatedMonthlyData[currentMonth].income += Number(depositForm.amount);
      setMonthlyData(updatedMonthlyData);

      setDepositForm({
        amount: "",
        member: "",
        description: ""
      });
      
      setIsAddDepositOpen(false);
    }
  };

  const handleWithdrawalSubmit = async () => {
    const newTransaction = {
      type: "withdrawal",
      amount: Number(withdrawalForm.amount),
      member_id: withdrawalForm.member,
      description: withdrawalForm.description,
      proof_url: null
    };

    const { success } = await addFinanceRecord(newTransaction);
    if (success) {
      const { data: financesData } = await fetchFinances();
      if (financesData) {
        setTransactions(financesData);
      }

      const currentMonth = new Date().getMonth();
      const updatedMonthlyData = [...monthlyData];
      updatedMonthlyData[currentMonth].expenses += Number(withdrawalForm.amount);
      setMonthlyData(updatedMonthlyData);

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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.member_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
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
  const currentMonthIncome = monthlyData[currentMonth]?.income || 0;
  const currentMonthExpenses = monthlyData[currentMonth]?.expenses || 0;

  return (
    <div className="container mx-auto px-4 pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Finanças</h1>
        
        <div className="flex space-x-2">
          <Dialog open={isAddDepositOpen} onOpenChange={setIsAddDepositOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <ArrowUpCircle className="h-5 w-5 mr-2" /> Registrar Depósito
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Novo Depósito</DialogTitle>
              </DialogHeader>
              <form className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Valor
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="50000"
                      className="pl-8"
                      min="1"
                      value={depositForm.amount}
                      onChange={handleDepositFormChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="member" className="text-sm font-medium">
                    Membro
                  </label>
                  <Select onValueChange={(value) => handleSelectChange('deposit', 'member', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Descrição
                  </label>
                  <Textarea 
                    id="description" 
                    placeholder="Ex: Depósito semanal" 
                    className="min-h-24"
                    value={depositForm.description}
                    onChange={handleDepositFormChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Comprovante
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/60 cursor-pointer transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400 mb-1">
                      Arraste um arquivo ou clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-500">
                      Formatos suportados: PNG, JPG, PDF (Máx: 10MB)
                    </p>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDepositOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleDepositSubmit}
                  disabled={!depositForm.amount || !depositForm.member}
                >
                  Registrar Depósito
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddWithdrawalOpen} onOpenChange={setIsAddWithdrawalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <ArrowDownCircle className="h-5 w-5 mr-2" /> Registrar Retirada
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Retirada</DialogTitle>
              </DialogHeader>
              <form className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="withdraw-amount" className="text-sm font-medium">
                    Valor
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="20000"
                      className="pl-8"
                      min="1"
                      value={withdrawalForm.amount}
                      onChange={handleWithdrawalFormChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reason" className="text-sm font-medium">
                    Motivo
                  </label>
                  <Select onValueChange={(value) => handleSelectChange('withdrawal', 'reason', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pagamento de Impostos">Pagamento de Impostos</SelectItem>
                      <SelectItem value="Compra de Materiais">Compra de Materiais</SelectItem>
                      <SelectItem value="Manutenção de Propriedade">Manutenção de Propriedade</SelectItem>
                      <SelectItem value="Pagamento de Salário">Pagamento de Salário</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="member" className="text-sm font-medium">
                    Membro Responsável
                  </label>
                  <Select onValueChange={(value) => handleSelectChange('withdrawal', 'member', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar membro" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Detalhes Adicionais
                  </label>
                  <Textarea 
                    id="description" 
                    placeholder="Ex: Pagamento de imposto da casa #32" 
                    className="min-h-24"
                    value={withdrawalForm.description}
                    onChange={handleWithdrawalFormChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Comprovante
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/60 cursor-pointer transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-400 mb-1">
                      Arraste um arquivo ou clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-500">
                      Formatos suportados: PNG, JPG, PDF (Máx: 10MB)
                    </p>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddWithdrawalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={handleWithdrawalSubmit}
                  disabled={!withdrawalForm.amount || !withdrawalForm.member}
                >
                  Registrar Retirada
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="schedule">Agendamento</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Saldo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-primary mr-2" />
                  <span className="text-2xl font-bold">${totalBalance.toLocaleString()}</span>
                </div>
                <p className={`text-xs ${currentMonthIncome > currentMonthExpenses ? 'text-green-400' : 'text-red-400'} mt-1`}>

                  {currentMonthIncome > currentMonthExpenses ? '+' : '-'}${Math.abs(currentMonthIncome - currentMonthExpenses).toLocaleString()} neste mês
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total de Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ArrowUpCircle className="h-6 w-6 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">${totalIncome.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ${currentMonthIncome.toLocaleString()} neste mês
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total de Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ArrowDownCircle className="h-6 w-6 text-red-500 mr-2" />
                  <span className="text-2xl font-bold">${totalExpenses.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ${currentMonthExpenses.toLocaleString()} neste mês
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fluxo Financeiro</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis dataKey="month" stroke="#8b9cb1" />
                    <YAxis stroke="#8b9cb1" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1f2c', borderColor: '#8b5cf6' }}
                      formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Entradas" fill="#8b5cf6" />
                    <Bar dataKey="expenses" name="Saídas" fill="#ff6b35" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 4).map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`flex justify-between items-center p-3 rounded-md ${transaction.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                    >
                      <div className="flex items-center">
                        {transaction.type === 'deposit' ? (
                          <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{transaction.member_name}</p>
                          <p className="text-xs text-gray-400">{transaction.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>
                          {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {transactions.length > 0 ? (
                  <Button variant="link" className="text-primary w-full mt-4" onClick={() => setActiveTab("transactions")}>
                    Ver todas as transações
                  </Button>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400">Nenhuma transação registrada</p>
                    <Button variant="link" className="text-primary mt-2" onClick={() => setIsAddDepositOpen(true)}>
                      Registrar primeira transação
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Próximos Pagamentos</CardTitle>
                <CardDescription>Cronograma</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentSchedule.length > 0 ? (
                  <div className="space-y-3">
                    {paymentSchedule.map((payment) => (
                      <div key={payment.id} className="bg-secondary/50 border border-primary/10 rounded-md p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{payment.title}</h4>
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <Calendar className="h-3 w-3 mr-1" /> Vencimento: {new Date(payment.due_date).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-medium text-primary">${payment.amount.toLocaleString()}</span>
                        </div>
                        <div className="mt-2 text-xs">
                          <span className="text-gray-400">Membros: </span>
                          <span>{payment.members.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400">Nenhum pagamento agendado</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setIsAddPaymentOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Pagamento
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="relative w-full md:w-auto md:flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Pesquisar por membro ou descrição..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="deposit">Depósitos</SelectItem>
                  <SelectItem value="withdrawal">Retiradas</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Membro</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Descrição</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Valor</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Data</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-primary/5">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={transaction.type === 'deposit' ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}>
                              <span className="flex items-center text-xs">
                                {transaction.type === 'deposit' ? (
                                  <>
                                    <ArrowUpCircle className="h-3 w-3 text-green-500 mr-1" /> Depósito
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownCircle className="h-3 w-3 text-red-500 mr-1" /> Retirada
                                  </>
                                )}
                              </span>
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{transaction.member_name}</td>
                          <td className="px-4 py-3 text-sm max-w-[200px] truncate">{transaction.description}</td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${
                            transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            {transaction.verified ? (
                              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                                Verificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                                Pendente
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {transaction.proof_url ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary">
                                  Ver Comprovante
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-yellow-500">
                                  Adicionar Comprovante
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Detalhes
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <AlertCircle className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-300 mb-1">Nenhuma transação encontrada</h3>
                          <p className="text-gray-400">
                            {transactions.length === 0 
                              ? "Registre sua primeira transação para começar" 
                              : "Tente ajustar seus filtros de pesquisa"
                            }
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            {filteredTransactions.length > 0 && (
              <CardFooter className="flex justify-between border-t px-4 py-2">
                <p className="text-sm text-gray-400">
                  Mostrando {filteredTransactions.length} de {transactions.length} transações
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-8 px-2" disabled={true}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-3 bg-primary/10 border-primary">
                    1
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" disabled={true}>
                    Próximo
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Cronograma de Pagamentos</CardTitle>
                  <CardDescription>Agenda de contribuições obrigatórias</CardDescription>
                </div>
                <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Calendar className="h-4 w-4 mr-2" /> Agendar Pagamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agendar Novo Pagamento</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium">
                          Título
                        </label>
                        <Input
                          id="title"
                          placeholder="Ex: Pagamento Semanal"
                          value={paymentForm.title}
                          onChange={handlePaymentFormChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium">
                          Valor
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <Input
                            id="amount"
                            type="number"
                            placeholder="50000"
                            className="pl-8"
                            min="1"
                            value={paymentForm.amount}
                            onChange={handlePaymentFormChange}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="dueDate" className="text-sm font-medium">
                          Data de Vencimento
                        </label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={paymentForm.dueDate}
                          onChange={handlePaymentFormChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="members" className="text-sm font-medium">
                          Membros Responsáveis
                        </label>
                        <Select onValueChange={(value) => handleSelectChange('payment', 'members', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar membros" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Todos os membros">Todos os membros</SelectItem>
                            <SelectItem value="Apenas líderes">Apenas líderes</SelectItem>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                          Descrição
                        </label>
                        <Textarea 
                          id="description" 
                          placeholder="Detalhes sobre este pagamento" 
                          className="min-h-24"
                          value={paymentForm.description}
                          onChange={handlePaymentFormChange}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="sendNotifications" 
                          className="rounded text-primary focus:ring-primary"
                          checked={paymentForm.sendNotifications}
                          onChange={handlePaymentFormChange}
                        />
                        <label htmlFor="sendNotifications" className="text-sm">
                          Enviar notificações aos membros
                        </label>
                      </div>
                    </form>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddPaymentOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        className="bg-primary hover:bg-primary/90" 
                        onClick={handlePaymentSubmit}
                        disabled={!paymentForm.title || !paymentForm.amount || !paymentForm.dueDate || !paymentForm.members}
                      >
                        Agendar Pagamento
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {paymentSchedule.length > 0 ? (
                <div className="space-y-4">
                  {paymentSchedule.map((payment) => (
                    <Card key={payment.id} className="bg-secondary border-primary/10">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                        <div>
  <CardTitle className="text-lg">{payment.title}</CardTitle>
  <CardDescription>
    Vencimento: {new Date(payment.due_date).toLocaleDateString()}
  </CardDescription>
</div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">
                              ${payment.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              por membro
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-400">
                            <span className="font-medium text-foreground">Membros:</span> {payment.members.join(", ")}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-yellow-500">
                              <AlertCircle className="h-4 w-4 mr-1" /> Lembrar
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              Editar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-1">Nenhum pagamento agendado</h3>
                  <p className="text-gray-400 mb-4">
                    Crie seu primeiro agendamento para organizar suas finanças
                  </p>
                  <Button 
                    className="bg-primary hover:bg-primary/90" 
                    onClick={() => setIsAddPaymentOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Agendar Pagamento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
