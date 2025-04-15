
import React, { useEffect, useState } from "react";
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
const goalFormSchema = z.object({
  title: z.string().min(2, { message: 'Título deve ter pelo menos 2 caracteres' }),
  targetAmount: z.number().min(1, { message: 'Valor precisa ser maior que 0' }),
  endDate: z.string().min(1, { message: 'Data final é obrigatória' }),
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState({ total: 0, active: 0, inactive: 0 });
  const [propertiesData, setPropertiesData] = useState({ total: 0, farms: 0, hqs: 0, warehouses: 0 });
  const [financialData, setFinancialData] = useState({ balance: 0, monthlyGrowth: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
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
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    // Ensure user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      
      loadDashboardData();
    };
    
    checkAuth();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Load members data
      const { data: members } = await supabase.from('profiles').select('*');
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
      if (propertiesResult.success) {
        const propertiesList = propertiesResult.data;
        setProperties(propertiesList);
        
        // Calculate property types
        const farms = propertiesList.filter(p => p.type === 'Farm').length;
        const hqs = propertiesList.filter(p => p.type === 'HQ').length;
        const warehouses = propertiesList.filter(p => p.type === 'Depósito').length;
        
        setPropertiesData({
          total: propertiesList.length,
          farms,
          hqs,
          warehouses
        });
      }
      
      // Load financial data
      const { data: finances } = await supabase.from('finances').select('*');
      if (finances) {
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
      const { data: goalsData } = await supabase.from('goals').select('*');
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
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (data: z.infer<typeof goalFormSchema>) => {
    try {
      const { error } = await supabase.from('goals').insert({
        title: data.title,
        target_amount: data.targetAmount,
        current_amount: 0,
        end_date: data.endDate
      });
      
      if (error) throw error;
      
      toast({
        title: "Meta criada",
        description: "A meta foi criada com sucesso"
      });
      
      setShowGoalForm(false);
      goalForm.reset();
      loadDashboardData();
      
    } catch (error: any) {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const currentGoal = goals.length > 0 ? goals[0] : null;
  const goalProgress = currentGoal ? Math.round((currentGoal.current_amount / currentGoal.target_amount) * 100) : 0;

  return (
    <div className="container mx-auto px-4 pt-20 pb-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="guild-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Saldo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-guild-secondary mr-2" />
                  <span className="text-2xl font-bold">${financialData.balance.toLocaleString()}</span>
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
                  <span className="text-2xl font-bold">{propertiesData.total}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {propertiesData.farms} Farms, {propertiesData.hqs} HQs, {propertiesData.warehouses} Depósitos
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
                  <span className="text-2xl font-bold">{memberCount.total}</span>
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
                    onClick={() => setShowGoalForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentGoal ? (
                  <>
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
                      onClick={() => setShowGoalForm(true)}
                    >
                      Criar nova meta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
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
                            contentStyle={{ backgroundColor: '#1e1f2c', borderColor: '#8b5cf6' }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, undefined]}
                          />
                          <Legend />
                          <Bar dataKey="deposits" name="Entradas" fill="#8b5cf6" />
                          <Bar dataKey="withdrawals" name="Saídas" fill="#ff6b35" />
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
                        <div key={index} className="flex items-start space-x-3 p-2 rounded-md hover:bg-guild-dark/50">
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
                <Card className="guild-card">
                  <CardHeader>
                    <CardTitle>Metas</CardTitle>
                    <CardDescription>Objetivos financeiros</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {goals.map(goal => {
                        const progress = Math.round((goal.current_amount / goal.target_amount) * 100);
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
                              <p className="text-xs text-gray-400">Vence: {new Date(goal.end_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        );
                      })}
                      <Button 
                        variant="outline" 
                        className="w-full border-guild-primary/30 text-white"
                        onClick={() => setShowGoalForm(true)}
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
                  <CardDescription>Últimas 24 horas</CardDescription>
                </CardHeader>
                <CardContent>
                  {latestTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {latestTransactions.map((transaction) => (
                        <div 
                          key={transaction.id} 
                          className={`flex justify-between items-center p-2 rounded-md bg-${transaction.type === 'deposit' ? 'green' : 'red'}-500/10`}
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
      <Dialog open={showGoalForm} onOpenChange={setShowGoalForm}>
        <DialogContent className="bg-guild-surface border-guild-primary/30 text-white">
          <DialogHeader>
            <DialogTitle>Criar Nova Meta</DialogTitle>
            <DialogDescription className="text-gray-300">
              Defina uma nova meta financeira para sua guilda
            </DialogDescription>
          </DialogHeader>
          
          <Form {...goalForm}>
            <form onSubmit={goalForm.handleSubmit(createGoal)} className="space-y-4">
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
                  Criar Meta
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
