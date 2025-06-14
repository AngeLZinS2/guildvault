
import * as z from 'zod';

export const editMemberFormSchema = z.object({
  name: z.string().min(2, { message: 'Nome deve ter pelo menos 2 caracteres' }),
  aliasName: z.string().optional().or(z.literal('')),
  role: z.string().min(1, { message: 'Selecione uma função' }),
  stateId: z.string().min(1, { message: 'State ID é obrigatório' }),
});

export type EditMemberFormData = z.infer<typeof editMemberFormSchema>;
