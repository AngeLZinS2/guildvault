import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Home, User, DollarSign, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { fetchProperties, Property } from "@/services/propertyService";
import { MAX_MONEY_AMOUNT } from "@/utils/financeContent";
import { LosSantosScene } from "@/components/LosSantosScene";

// Types for data
type Member = {
  id: string;
  name: string;
  status: string;
  role: string;
  state_id?: string;
  email?: string;
}

type Finance = {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  member_id: string;
  description?: string;
  member_name?: string;
  proof_url?: string;
  verified?: boolean;
}

type Goal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  end_date: string;
  start_date?: string;
}

type Activity = {
  user: string;
  action: string;
  time: string;
}

// Form schema for goal creation
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const goalStatus = (goal: Goal) => goal.current_amount >= goal.target_amount
  ? 'Concluída'
  : validDate(goal.end_date.slice(0, 10)) && goal.end_date.slice(0, 10) < new Date().toLocaleDateString('sv-SE')
    ? 'Vencida' : 'Em andamento';
const goalFormSchema = z.object({
  title: z.string().trim().min(2, { message: 'Título deve ter pelo menos 2 caracteres' }),
  targetAmount: z.number().finite().positive({ message: 'Valor precisa ser maior que 0' }).max(MAX_MONEY_AMOUNT, 'Limite: $1.000.000.000'),
  currentAmount: z.number().finite().min(0, { message: 'Progresso não pode ser negativo' }).max(MAX_MONEY_AMOUNT, 'Limite: $1.000.000.000'),
  endDate: z.string().refine(validDate, { message: 'Informe uma data real no formato AAAA-MM-DD' }),
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const canMutate = isAdmin && !adminLoading;
  const mutationLock = useRef(false);
  const loadLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState({ total: 0, active: 0, inactive: 0 });
  const [propertiesData, setPropertiesData] = useState({ total: 0, farms: 0, hqs: 0, warehouses: 0 });
  const [financialData, setFinancialData] = useState({ balance: 0, monthlyGrowth: 0 });
  const [chartData, setChartData] = useState<{ name: string; deposits: number; withdrawals: number }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [latestTransactions, setLatestTransactions] = useState<Finance[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  // Goal form
  const goalForm = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: '',
      targetAmount: 100000,
      currentAmount: 0,
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  const loadDashboardData = useCallback(async () => {
    if (loadLock.current) return;
    loadLock.current = true;
    setLoadError(null);
    setLoading(true);
    
    try {
      // Load members data
      const { data: members, error: membersError } = await supabase.from('profiles').select('*');
      if (membersError) throw membersError;
      if (members) {
        const active = members.filter(m => m.status === 'active').length;
        setMemberCount({
          total: members.length,
          active,
          inactive: members.length - active
        });
      }
      
      // Load properties data
      const propertiesResult = await fetchProperties();
      if (!propertiesResult.success) throw propertiesResult.error;
      if (propertiesResult.success) {
        const propertiesList = propertiesResult.data;
        setProperties(propertiesList);
        
        // Calculate property types - Updated to match the actual type names in the database
        const pequena = propertiesList.filter(p => p.type === 'Pequena').length;
        const media = propertiesList.filter(p => p.type === 'Media').length;
        const grande = propertiesList.filter(p => p.type === 'Grande').length;
        
        setPropertiesData({
          total: propertiesList.length,
          farms: pequena, // Map farms to pequena
          hqs: media,    // Map hqs to media
          warehouses: grande // Map warehouses to grande
        });
      }
      
      // Load financial data
      const { data: finances, error: financesError } = await supabase.from('finances').select('*');
      if (financesError) throw financesError;
      if (finances) {
        setPendingTransactions(finances.filter((finance: Finance) => finance.verified === false).length);
        setLatestTransactions([]);
        // Calculate total balance
        const balance = finances.reduce((total, finance) => {
          if (finance.type === 'deposit') return total + finance.amount;
          return total - finance.amount;
        }, 0);
        
        // Calculate monthly growth
        const currentMonth = new Date().getMonth();
        const currentYearMonth = `${new Date().getFullYear()}-${String(currentMonth + 1).padStart(2, '0')}`;
        const monthlyFinances = finances.filter(f => f.date.startsWith(currentYearMonth));
        
        const monthlyBalance = monthlyFinances.reduce((total, finance) => {
          if (finance.type === 'deposit') return total + finance.amount;
          return total - finance.amount;
        }, 0);
        
        setFinancialData({
          balance,
          monthlyGrowth: monthlyBalance
        });
        
        // Create chart data
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setDate(1);
          date.setMonth(date.getMonth() - i);
          return {
            month: date.toLocaleString('default', { month: 'short' }),
            year: date.getFullYear(),
            yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          };
        }).reverse();
        
        const chartData = last6Months.map(({ month, year, yearMonth }) => {
          const monthlyData = finances.filter(f => f.date.startsWith(yearMonth));
          const deposits = monthlyData.filter(f => f.type === 'deposit').reduce((sum, f) => sum + f.amount, 0);
          const withdrawals = monthlyData.filter(f => f.type === 'withdrawal').reduce((sum, f) => sum + f.amount, 0);
          
          return {
            name: month,
            deposits,
            withdrawals
          };
        });
        
        setChartData(chartData);
        
        // Get latest transactions
        const sorted = [...finances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = sorted.slice(0, 3);
        
        // Add member names to transactions
        if (members && latest.length > 0) {
          const transactionsWithNames = await Promise.all(latest.map(async (transaction) => {
            const member = members.find(m => m.id === transaction.member_id);
            return {
              ...transaction,
              member_name: member?.name || 'Desconhecido'
            };
          }));
          
          setLatestTransactions(transactionsWithNames as Finance[]);
        }
      }
      
      // Load goals
      const { data: goalsData, error: goalsError } = await supabase.from('goals').select('*');
      if (goalsError) throw goalsError;
      if (goalsData) {
        setGoals(goalsData as Goal[]);
      }
      
      // Generate recent activities from finances
      if (finances && members) {
        const recentFinances = [...finances]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);
          
        const activities = await Promise.all(recentFinances.map(async (finance) => {
          const member = members.find(m => m.id === finance.member_id);
          const date = new Date(finance.date);
          const now = new Date();
          
          // Calculate relative time
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.round(diffMs / 60000);
          const diffHours = Math.round(diffMs / 3600000);
          const diffDays = Math.round(diffMs / 86400000);
          
          let timeText;
          if (diffMins < 60) timeText = `há ${diffMins} minutos`;
          else if (diffHours < 24) timeText = `há ${diffHours} horas`;
          else timeText = `há ${diffDays} dias`;
          
          const action = finance.type === 'deposit' 
            ? `depositou $${finance.amount.toLocaleString()}` 
            : `retirou $${finance.amount.toLocaleString()}${finance.description ? ' para ' + finance.description : ''}`;
          
          return {
            user: member?.name || 'Usuário',
            action,
            time: timeText
          };
        }));
        
        setActivities(activities);
      }
      
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os dados');
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      });
    } finally {
      loadLock.current = false;
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      await loadDashboardData();
    };
    void checkAuth();
  }, [navigate, loadDashboardData]);

  const createGoal = async (data: z.infer<typeof goalFormSchema>) => {
    if (!canMutate || mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      const payload = {
        title: data.title,
        target_amount: data.targetAmount,
        current_amount: data.currentAmount,
        end_date: data.endDate
      };
      const { error } = editingGoal
        ? await supabase.from('goals').update(payload).eq('id', editingGoal.id)
        : await supabase.from('goals').insert(payload);
      
      if (error) throw error;
      
      toast({
        title: editingGoal ? "Meta atualizada" : "Meta criada",
        description: "A meta foi salva com sucesso"
      });
      
      setShowGoalForm(false);
      goalForm.reset();
      loadDashboardData();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a meta';
      setMutationError(message);
      toast({
        title: "Erro ao salvar meta",
        description: message,
        variant: "destructive"
      });
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const openGoalForm = (goal: Goal | null = null) => {
    if (!canMutate || mutationLock.current) return;
    setEditingGoal(goal);
    setMutationError(null);
    goalForm.reset(goal ? {
      title: goal.title, targetAmount: goal.target_amount, currentAmount: goal.current_amount,
      endDate: goal.end_date.slice(0, 10)
    } : { title: '', targetAmount: 100000, currentAmount: 0, endDate: new Date().toLocaleDateString('sv-SE') });
    setShowGoalForm(true);
  };
  const confirmDelete = async () => {
    if (!canMutate || !deleteGoal || mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      const { error } = await supabase.from('goals').delete().eq('id', deleteGoal.id);
      if (error) throw error;
      setGoals(previous => previous.filter(goal => goal.id !== deleteGoal.id));
      setDeleteGoal(null);
      toast({ title: 'Meta excluída' });
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Não foi possível excluir a meta');
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };
  const currentGoal = goals.find(goal => goal.id === selectedGoalId) ?? goals[0] ?? null;
  const goalProgress = currentGoal && currentGoal.target_amount > 0 ? Math.min(100, Math.max(0, Math.round((currentGoal.current_amount / currentGoal.target_amount) * 100))) : 0;
  const overdueGoals = goals.filter(goal => goalStatus(goal) === 'Vencida');
  const emptyStock = properties.filter(property => (property.items ?? []).some(item => item.quantity === 0));

  return (
    <div className="mx-auto max-w-[1400px] motion-enter">
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-3xl text-white sm:text-4xl">Central da crew</h1><p className="mt-1 text-sm text-muted-foreground">Los Santos está lá fora. O controle está aqui.</p></div>
        <Button variant="outline" disabled={loading || saving} onClick={() => void loadDashboardData()}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Atualizar dados</Button>
      </header>
      <section className="operation-banner" aria-label="Explore sua operação">
        <div className="operation-copy"><h2>Sua próxima<br />grande jogada.</h2><p>Confira o caixa, reúna a equipe e escolha seu próximo objetivo. Uma cidade inteira de possibilidades.</p><div className="operation-shortcuts"><button type="button" onClick={() => navigate('/finances')}><DollarSign size={17} /> Abrir o caixa</button>{canMutate && <button type="button" disabled={saving} onClick={() => openGoalForm()}><Plus size={17} /> Nova meta</button>}<button type="button" onClick={() => navigate('/members')}><User size={17} /> Minha crew</button></div></div>
        <LosSantosScene compact onNavigate={navigate} />
      </section>
      
      {loadError && <p role="alert" className="mb-4 text-red-400">Falha ao atualizar: {loadError}. Os dados abaixo podem estar incompletos ou desatualizados. Tente atualizar novamente.</p>}
      {loading ? (
        <div className="grid gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="guild-card animate-pulse">
              <CardContent className="h-20"></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="guild-card md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Saldo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-guild-secondary mr-2" />
                  <span className="metric-value">${financialData.balance.toLocaleString()}</span>
                </div>
                <p className={`text-xs ${financialData.monthlyGrowth >= 0 ? 'text-green-400' : 'text-red-400'} mt-1`}>
                  {financialData.monthlyGrowth >= 0 ? '+' : ''}{financialData.monthlyGrowth.toLocaleString()} neste mês
                </p>
              </CardContent>
            </Card>
            
            <Card className="guild-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Propriedades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Home className="h-6 w-6 text-guild-primary mr-2" />
                  <span className="metric-value">{propertiesData.total}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {propertiesData.farms} Pequena, {propertiesData.hqs} Media, {propertiesData.warehouses} Grande
                </p>
              </CardContent>
            </Card>
            
            <Card className="guild-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Membros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <User className="h-6 w-6 text-blue-400 mr-2" />
                  <span className="metric-value">{memberCount.total}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {memberCount.active} Ativos, {memberCount.inactive} Inativos
                </p>
              </CardContent>
            </Card>
            
            <Card className="guild-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-400">Meta Atual</span>
                  <Button 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    disabled={!canMutate || saving}
                    aria-label="Criar meta"
                    onClick={() => openGoalForm()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentGoal ? (
                  <>
                    <p className="text-xs text-gray-400 mb-2">{goalStatus(currentGoal)}</p>
                    <div className="flex items-center mb-2">
                      <span className="text-lg font-bold">${currentGoal.current_amount.toLocaleString()} / ${currentGoal.target_amount.toLocaleString()}</span>
                    </div>
                    <Progress value={goalProgress} className="h-2 bg-gray-700">
                      <div className="h-full bg-guild-secondary rounded-full" style={{ width: `${goalProgress}%` }} />
                    </Progress>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-400">
                        {goalProgress}% completo
                      </p>
                      <p className="text-xs text-gray-400">
                        {currentGoal.title}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-16">
                    <p className="text-sm text-gray-400">Nenhuma meta definida</p>
                    <Button
                      variant="link"
                      className="text-guild-primary p-0 h-auto text-xs"
                      disabled={!canMutate || saving}
                      onClick={() => openGoalForm()}
                    >
                      Criar nova meta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {!loadError && <Card className="guild-card mb-6">
            <CardHeader><CardTitle>Pendências acionáveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pendingTransactions > 0 && <Button variant="link" onClick={() => navigate('/finances?status=pending')}>{pendingTransactions} transações não verificadas — revisar</Button>}
              {emptyStock.length > 0 && <Button variant="link" onClick={() => navigate('/properties?stock=empty')}>{emptyStock.length} propriedades com itens de estoque zerado — conferir</Button>}
              {overdueGoals.map(goal => <div key={goal.id}><Button variant="link" onClick={() => { setSelectedGoalId(goal.id); document.getElementById('dashboard-goals')?.scrollIntoView({ behavior: 'smooth' }); }}>Meta vencida: {goal.title} — conferir meta</Button></div>)}
              {pendingTransactions === 0 && emptyStock.length === 0 && overdueGoals.length === 0 && <p className="text-sm text-gray-400">Nenhuma pendência encontrada nos dados carregados.</p>}
            </CardContent>
          </Card>}
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="guild-card">
                <CardHeader>
                  <CardTitle>Fluxo Financeiro</CardTitle>
                  <CardDescription>Histórico de 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                          <XAxis dataKey="name" stroke="#8b9cb1" />
                          <YAxis stroke="#8b9cb1" />
                          <Tooltip 
                          contentStyle={{ backgroundColor: '#1e1c35', borderColor: '#7c3aed', borderRadius: '8px' }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]}
                          />
                          <Legend />
                          <Bar dataKey="deposits" name="Entradas" fill="#9ce7cd" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="withdrawals" name="Saídas" fill="#ff9970" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400">Nenhum dado financeiro disponível</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="guild-card mt-6">
                <CardHeader>
                  <CardTitle>Atividades Recentes</CardTitle>
                  <CardDescription>Ações dos membros da guilda</CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity, index) => (
                        <div key={index} className="data-row flex items-start space-x-3 p-3">
                          <div className="bg-guild-primary/20 rounded-full p-2">
                            <User className="h-5 w-5 text-guild-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              <span className="text-white">{activity.user}</span>
                              <span className="text-gray-400"> {activity.action}</span>
                            </p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-400">Nenhuma atividade recente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              {goals.length > 0 && (
                <Card className="guild-card" id="dashboard-goals">
                  <CardHeader>
                    <CardTitle>Metas</CardTitle>
                    <CardDescription>Objetivos financeiros</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {goals.map(goal => {
                        const progress = goal.target_amount > 0 ? Math.min(100, Math.max(0, Math.round((goal.current_amount / goal.target_amount) * 100))) : 0;
                        const isUrgent = new Date(goal.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <div 
                            key={goal.id} 
                            className={`p-3 rounded-md border ${isUrgent 
                              ? 'border-guild-secondary bg-guild-secondary/10' 
                              : 'border-guild-primary/20 bg-guild-dark/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {isUrgent ? (
                                  <AlertTriangle className="h-5 w-5 text-guild-secondary" />
                                ) : (
                                  <ArrowUpCircle className="h-5 w-5 text-guild-primary" />
                                )}
                                <h4 className="font-medium">{goal.title}</h4>
                              </div>
                              <span className="text-sm">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 my-2" />
                            <div className="flex justify-between mt-1">
                              <p className="text-sm">${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">Vence: {new Date(`${goal.end_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{goalStatus(goal)}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Button variant="outline" size="sm" aria-pressed={currentGoal?.id === goal.id} onClick={() => setSelectedGoalId(goal.id)}>{currentGoal?.id === goal.id ? 'Meta atual' : 'Selecionar'}</Button>
                              {canMutate && <>
                                <Button variant="outline" size="sm" disabled={saving} onClick={() => openGoalForm(goal)}>Editar / progresso</Button>
                                <Button variant="outline" size="sm" disabled={saving} onClick={() => { setMutationError(null); setDeleteGoal(goal); }}>Excluir</Button>
                              </>}
                            </div>
                          </div>
                        );
                      })}
                      <Button 
                        variant="outline" 
                        className="w-full border-guild-primary/30 text-white"
                        disabled={!canMutate || saving}
                        onClick={() => openGoalForm()}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Nova Meta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="guild-card mt-6">
                <CardHeader>
                  <CardTitle>Transações Recentes</CardTitle>
                  <CardDescription>Últimas transações registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  {latestTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {latestTransactions.map((transaction) => (
                        <div 
                          key={transaction.id} 
                            className={`data-row flex items-center justify-between p-3 ${transaction.type === 'deposit' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}
                        >
                          <div className="flex items-center">
                            {transaction.type === 'deposit' ? (
                              <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{transaction.member_name}</p>
                              <p className="text-xs text-gray-400">{transaction.description || transaction.type}</p>
                            </div>
                          </div>
                          <span className={`${transaction.type === 'deposit' ? 'text-green-500' : 'text-red-500'} font-medium`}>
                            {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Nenhuma transação recente</p>
                    </div>
                  )}
                  
                  <Button
                    variant="link"
                    className="text-guild-primary w-full mt-4"
                    onClick={() => navigate('/finances')}
                  >
                    Ver todas as transações
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
      
      {/* Goal Creation Dialog */}
      <Dialog open={showGoalForm} onOpenChange={open => { if (!mutationLock.current) setShowGoalForm(open); }}>
        <DialogContent className="bg-guild-surface border-guild-primary/30 text-white">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Criar Nova Meta'}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Defina uma nova meta financeira para sua guilda
            </DialogDescription>
          </DialogHeader>
          
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(createGoal)} className="space-y-4">
              {mutationError && <p role="alert" className="text-red-400">{mutationError}</p>}
              <fieldset disabled={saving || !canMutate} className="space-y-4">
              <FormField
                control={goalForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Título da Meta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Comprar Nova HQ" 
                        className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={goalForm.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Valor Alvo ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="any"
                        className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={goalForm.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Progresso atual ($)</FormLabel>
                    <FormControl><Input type="number" step="any" min="0" {...field} onChange={event => field.onChange(parseFloat(event.target.value))} /></FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={goalForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Data Final</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-guild-primary/30 text-white"
                  onClick={() => setShowGoalForm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-guild-primary hover:bg-guild-primary/80"
                >
                  {saving ? 'Salvando...' : editingGoal ? 'Salvar alterações' : 'Criar Meta'}
                </Button>
              </DialogFooter>
              </fieldset>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteGoal} onOpenChange={open => { if (!open && !mutationLock.current) setDeleteGoal(null); }}>
        <DialogContent className="bg-guild-surface border-guild-primary/30 text-white">
          <DialogHeader><DialogTitle>Excluir meta?</DialogTitle><DialogDescription>A meta “{deleteGoal?.title}” será excluída permanentemente. Confirme para continuar.</DialogDescription></DialogHeader>
          {mutationError && <p role="alert" className="text-red-400">{mutationError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDeleteGoal(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={saving || !canMutate} onClick={() => void confirmDelete()}>{saving ? 'Excluindo...' : 'Confirmar exclusão'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
