
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";

interface Member {
  id: string;
  name: string;
  state_id?: string;
  email?: string;
  role: string;
}

interface EditMemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  role: z.string().min(1, { message: 'Selecione uma função' }),
  stateId: z.string().min(1, { message: 'State ID é obrigatório' }),
});

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onUpdate
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member?.name || '',
      email: member?.email || '',
      role: member?.role || 'Membro',
      stateId: member?.state_id || '',
    },
  });

  React.useEffect(() => {
    if (member) {
      form.reset({
        name: member.name,
        email: member.email || '',
        role: member.role,
        stateId: member.state_id || '',
      });
    }
  }, [member, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!member) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          role: data.role,
          state_id: data.stateId,
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: "Membro atualizado",
        description: "As informações do membro foram atualizadas com sucesso.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar membro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-guild-surface border-guild-primary/30 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Membro</DialogTitle>
          <DialogDescription className="text-gray-300">
            Atualize as informações do membro.
          </DialogDescription>
        </DialogHeader>
        
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
                  <FormLabel className="text-gray-300">State ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ID do estado" 
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
                  <FormLabel className="text-gray-300">Email (opcional)</FormLabel>
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
                onClick={handleClose}
                className="border-guild-primary/30 text-white"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-guild-primary hover:bg-guild-primary/80"
              >
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
