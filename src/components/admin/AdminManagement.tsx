
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Shield, User } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  name: string;
  state_id: string;
  role: string;
}

export const AdminManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, state_id, role')
        .neq('state_id', '00') // Excluir o super admin da lista
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
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
    try {
      const newRole = currentRole === 'admin' ? 'Membro' : 'admin';
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Permissão atualizada",
        description: `Usuário ${newRole === 'admin' ? 'promovido a' : 'removido de'} administrador.`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive"
      });
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
              {users.length > 0 ? (
                users.map((user) => (
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
                        onClick={() => toggleAdminRole(user.id, user.role)}
                        className={`border-guild-primary/30 text-white ${
                          user.role === 'admin' 
                            ? 'hover:bg-red-500/20' 
                            : 'hover:bg-green-500/20'
                        }`}
                      >
                        {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
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
        )}
      </CardContent>
    </Card>
  );
};
