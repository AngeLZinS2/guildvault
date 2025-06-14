
import React from 'react';
import { Control } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EditMemberFormData } from './EditMemberFormSchema';

interface EditMemberFormFieldsProps {
  control: Control<EditMemberFormData>;
}

export const EditMemberFormFields: React.FC<EditMemberFormFieldsProps> = ({ control }) => {
  return (
    <>
      <FormField
        control={control}
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
        control={control}
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
        control={control}
        name="aliasName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Alias Name (opcional)</FormLabel>
            <FormControl>
              <Input 
                placeholder="Nome alternativo ou apelido" 
                className="bg-guild-dark/70 border-guild-primary/30 text-white" 
                {...field} 
              />
            </FormControl>
            <FormMessage className="text-red-400" />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
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
    </>
  );
};
