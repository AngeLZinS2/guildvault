import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserRound, UserCheck, UserX, Copy } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { addMemberWithAuth, fetchMembers, updateMemberStatus } from '@/services/memberService';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from '@/components/members/PaginationControls';
import { PaginationInfo } from '@/types';
import { ColorPersonalization } from '@/components/ColorPersonalization';

type Member = {
  id: string;
  name: string;
  status: string;
  role: string;
  join_date: string;
  last_activity?: string;
  state_id?: string;
  email?: string;
};

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  role: z.string().min(1, { message: 'Selecione uma função' }),
  stateId: z.string().min(2, { message: 'State ID é obrigatório' }),
});

const ITEMS_PER_PAGE = 10;

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1
  });
  
  // Form hook
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'Membro',
      stateId: '',
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Load members
  const loadMembers = async () => {
    setIsLoading(true);
    const result = await fetchMembers();
    if (result.success && result.data) {
      setMembers(result.data);
      // Update pagination
      setPagination(prevState => ({
        ...prevState,
        totalItems: result.data.length,
        totalPages: Math.ceil(result.data.length / ITEMS_PER_PAGE)
      }));
    } else {
      toast({
        title: "Erro ao carregar membros",
        description: "Não foi possível carregar a lista de membros",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      (member.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (member.role?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (member.state_id?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && member.status === statusFilter;
  });
  
  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredMembers.slice(startIndex, startIndex + pagination.pageSize);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination({
      ...pagination,
      currentPage: page
    });
    
    // Scroll to top of the table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  useEffect(() => {
    // Update total pages when filters change
    setPagination(prevState => ({
      ...prevState,
      currentPage: 1, // Reset to first page when filters change
      totalItems: filteredMembers.length,
      totalPages: Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1
    }));
  }, [filteredMembers.length]);

  // Toggle status
  const toggleStatus = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    const result = await updateMemberStatus(id, newStatus);
    
    if (result.success) {
      setMembers(members.map(m => {
        if (m.id === id) {
          return { ...m, status: newStatus };
        }
        return m;
      }));
      
      toast({
        title: "Status Atualizado",
        description: "O status do membro foi atualizado com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do membro.",
        variant: "destructive"
      });
    }
  };
  
  // Copy password to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Senha copiada",
      description: "A senha foi copiada para a área de transferência.",
    });
  };

  // Add member
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const memberData = {
      name: data.name,
      email: data.email,
      role: data.role,
      stateId: data.stateId,
    };
    
    const result = await addMemberWithAuth(memberData);
    
    if (result.success && result.password) {
      setGeneratedPassword(result.password);
      await loadMembers();
    } else {
      setShowNewMemberForm(false);
      form.reset();
    }
    
    setIsLoading(false);
  };

  // Close dialog and reset form
  const handleCloseDialog = () => {
    setShowNewMemberForm(false);
    setGeneratedPassword(null);
    form.reset();
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="bg-guild-surface/80 backdrop-blur-sm border border-guild-primary/30">
        <CardHeader className="border-b border-guild-primary/20 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-white">Membros da Guilda</CardTitle>
              <CardDescription className="text-gray-300">Gerencie os membros da sua guilda</CardDescription>
            </div>
            <div className="flex">
              <Button 
                onClick={() => setShowNewMemberForm(true)}
                className="bg-guild-primary hover:bg-guild-primary/80"
                disabled={isLoading}
              >
                Adicionar Membro
              </Button>
              <ColorPersonalization />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="Buscar por nome, função ou State ID..." 
                className="pl-10 bg-guild-dark/50 border-guild-primary/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-guild-primary' : 'border-guild-primary/30 text-white'}
              >
                <UserRound size={16} className="mr-2" /> Todos
              </Button>
              <Button 
                variant={statusFilter === 'active' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-guild-primary' : 'border-guild-primary/30 text-white'}
              >
                <UserCheck size={16} className="mr-2" /> Ativos
              </Button>
              <Button 
                variant={statusFilter === 'inactive' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-guild-primary' : 'border-guild-primary/30 text-white'}
              >
                <UserX size={16} className="mr-2" /> Inativos
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-guild-primary/20">
                  <TableHead className="text-gray-300">Nome</TableHead>
                  <TableHead className="text-gray-300">State ID</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Função</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Data de entrada</TableHead>
                  <TableHead className="text-gray-300">Última atividade</TableHead>
                  <TableHead className="text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                      Carregando membros...
                    </TableCell>
                  </TableRow>
                ) : getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((member) => (
                    <TableRow key={member.id} className="border-b border-guild-primary/10 hover:bg-guild-primary/5">
                      <TableCell className="text-white">{member.name}</TableCell>
                      <TableCell className="text-white">{member.state_id || '—'}</TableCell>
                      <TableCell className="text-white">{member.email || '—'}</TableCell>
                      <TableCell>
                        <Badge className={
                          member.role === 'Líder' ? 'bg-guild-primary text-white' : 
                          member.role === 'Segurança' ? 'bg-red-500/80 text-white' : 
                          'bg-gray-500/80 text-white'
                        }>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          member.status === 'active' ? 'bg-green-500/80 text-white' : 
                          'bg-red-500/80 text-white'
                        }>
                          {member.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{member.join_date}</TableCell>
                      <TableCell className="text-gray-300">{member.last_activity || '—'}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => toggleStatus(member.id)}
                          className="border-guild-primary/30 text-white hover:bg-guild-primary/20"
                          disabled={isLoading}
                        >
                          {member.status === 'active' ? 'Desativar' : 'Ativar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                      Nenhum membro encontrado. Adicione novos membros usando o botão acima.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination controls */}
          {filteredMembers.length > 0 && (
            <div className="flex justify-center mt-4">
              <PaginationControls 
                pagination={pagination} 
                onPageChange={handlePageChange} 
              />
            </div>
          )}
          
          {/* Pagination summary */}
          {filteredMembers.length > 0 && (
            <div className="text-center text-sm text-gray-400 mt-2">
              Mostrando {Math.min(filteredMembers.length, (pagination.currentPage - 1) * pagination.pageSize + 1)} 
              -{Math.min(filteredMembers.length, pagination.currentPage * pagination.pageSize)} 
              {' '}de {filteredMembers.length} membros
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for adding new member */}
      <Dialog open={showNewMemberForm} onOpenChange={handleCloseDialog}>
        <DialogContent className="bg-guild-surface border-guild-primary/30 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Adicionar Novo Membro</DialogTitle>
            <DialogDescription className="text-gray-300">
              Preencha os dados para criar um novo membro com login no sistema.
            </DialogDescription>
          </DialogHeader>
          
          {generatedPassword ? (
            <div className="space-y-4">
              <div className="border border-green-500/30 bg-green-500/10 rounded-md p-4">
                <h3 className="font-medium text-green-400 mb-2">Membro adicionado com sucesso!</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Anote a senha gerada abaixo. Ela não será exibida novamente.
                </p>
                <div className="bg-guild-dark/70 p-3 rounded-md flex justify-between items-center">
                  <code className="text-yellow-300 font-mono">{generatedPassword}</code>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0" 
                    onClick={() => generatedPassword && copyToClipboard(generatedPassword)}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  className="bg-guild-primary hover:bg-guild-primary/80 w-full"
                  onClick={handleCloseDialog}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Nome</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do membro" 
                          className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">State ID (Login)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="ID do estado para login" 
                          className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="email@exemplo.com" 
                          type="email" 
                          className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Função</FormLabel>
                      <FormControl>
                        <select
                          className="w-full h-10 px-3 py-2 rounded-md bg-guild-dark/70 border border-guild-primary/30 text-white"
                          {...field}
                        >
                          <option value="Membro">Membro</option>
                          <option value="Farmeador">Farmeador</option>
                          <option value="Segurança">Segurança</option>
                          <option value="Líder">Líder</option>
                        </select>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="mt-6 gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseDialog}
                    className="border-guild-primary/30 text-white"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-guild-primary hover:bg-guild-primary/80"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Adicionando...' : 'Adicionar Membro'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
