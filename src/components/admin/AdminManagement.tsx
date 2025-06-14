
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Shield, User } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { PaginationControls } from '@/components/members/PaginationControls';
import { PaginationInfo } from '@/types';

interface User {
  id: string;
  name: string;
  state_id: string;
  role: string;
}

const ITEMS_PER_PAGE = 10;

export const AdminManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1
  });

  const loadUsers = async () => {
    try {
      console.log('Carregando usuários...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, state_id, role')
        .neq('state_id', '00') // Excluir o super admin da lista
        .order('name');

      if (error) {
        console.error('Erro na query:', error);
        throw error;
      }
      
      console.log('Usuários carregados:', data);
      const userData = data || [];
      setUsers(userData);
      
      // Update pagination
      setPagination(prevState => ({
        ...prevState,
        totalItems: userData.length,
        totalPages: Math.ceil(userData.length / ITEMS_PER_PAGE)
      }));
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    console.log('=== INICIANDO TOGGLE ADMIN ===');
    console.log('UserID:', userId);
    console.log('Role atual:', currentRole);
    
    setUpdating(userId);
    try {
      const newRole = currentRole === 'admin' ? 'Membro' : 'admin';
      console.log('Nova role:', newRole);
      
      // Tentar atualização sem usar .single() para evitar erro PGRST116
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      console.log('Erro de atualização:', updateError);

      if (updateError) {
        console.error('Erro na atualização:', updateError);
        throw updateError;
      }

      // Verificar se a atualização foi bem-sucedida
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', userId)
        .single();
        
      console.log('Dados de verificação:', verifyData);
      
      if (verifyError) {
        console.error('Erro na verificação:', verifyError);
        throw new Error('Não foi possível verificar a atualização');
      }

      if (verifyData && verifyData.role === newRole) {
        // Atualizar o estado local
        setUsers(prevUsers => {
          const updatedUsers = prevUsers.map(user => 
            user.id === userId ? { ...user, role: newRole } : user
          );
          console.log('Estado local atualizado');
          return updatedUsers;
        });

        toast({
          title: "Permissão atualizada com sucesso!",
          description: `${verifyData.name} ${newRole === 'admin' ? 'promovido a' : 'removido de'} administrador.`,
        });
      } else {
        throw new Error('A atualização não foi aplicada corretamente');
      }
      
    } catch (error: any) {
      console.error('=== ERRO NO TOGGLE ADMIN ===');
      console.error('Erro completo:', error);
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge className="bg-red-500/80 text-white">Administrador</Badge>;
    }
    return <Badge variant="secondary">Membro</Badge>;
  };

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    return users.slice(startIndex, startIndex + pagination.pageSize);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination({
      ...pagination,
      currentPage: page
    });
  };

  return (
    <Card className="bg-guild-surface/80 backdrop-blur-sm border border-guild-primary/30">
      <CardHeader className="border-b border-guild-primary/20 pb-4">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Gerenciar Administradores
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            Carregando usuários...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-guild-primary/20">
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300">State ID</TableHead>
                    <TableHead className="text-gray-300">Função Atual</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageItems().length > 0 ? (
                    getCurrentPageItems().map((user) => (
                      <TableRow key={user.id} className="border-b border-guild-primary/10 hover:bg-guild-primary/5">
                        <TableCell className="text-white">{user.name}</TableCell>
                        <TableCell className="text-white">{user.state_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            {getRoleBadge(user.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Botão clicado para usuário:', user.name, 'ID:', user.id, 'Role:', user.role);
                              toggleAdminRole(user.id, user.role);
                            }}
                            disabled={updating === user.id}
                            className={`border-guild-primary/30 text-white ${
                              user.role === 'admin' 
                                ? 'hover:bg-red-500/20' 
                                : 'hover:bg-green-500/20'
                            }`}
                          >
                            {updating === user.id 
                              ? 'Atualizando...' 
                              : user.role === 'admin' 
                                ? 'Remover Admin' 
                                : 'Tornar Admin'
                            }
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {users.length > 0 && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <PaginationControls 
                  pagination={pagination} 
                  onPageChange={handlePageChange} 
                />
              </div>
            )}

            {/* Pagination summary */}
            {users.length > 0 && (
              <div className="text-center text-sm text-gray-400 mt-2">
                Mostrando {Math.min(users.length, (pagination.currentPage - 1) * pagination.pageSize + 1)} 
                -{Math.min(users.length, pagination.currentPage * pagination.pageSize)} 
                {' '}de {users.length} usuários
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
