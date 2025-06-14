
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Buscar o perfil do usuário para verificar o state_id
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('state_id, name, role')
            .eq('id', user.id)
            .single();

          if (!error && profile) {
            setCurrentUser(profile);
            // Usuário é admin se state_id for "00"
            setIsAdmin(profile.state_id === '00');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, loading, currentUser };
};
