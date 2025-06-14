
-- Verificar se RLS está habilitado na tabela profiles
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Verificar políticas existentes na tabela profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Criar política RLS para permitir que admins e super admins atualizem roles
CREATE POLICY "Super admin and admins can update roles" ON public.profiles
FOR UPDATE 
USING (
  -- Permitir se o usuário logado é super admin (state_id = '00')
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND state_id = '00'
  )
  OR
  -- Permitir se o usuário logado é admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Habilitar RLS na tabela profiles se ainda não estiver habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar uma política de SELECT para permitir que todos vejam os perfis (necessário para o componente AdminManagement)
CREATE POLICY "Everyone can view profiles" ON public.profiles
FOR SELECT 
USING (true);
