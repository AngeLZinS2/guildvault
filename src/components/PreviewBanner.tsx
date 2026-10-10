import { FlaskConical, LogOut, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isDemoMode, resetDemo } from '@/demo/demoSession';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function PreviewBanner() {
  const navigate = useNavigate();
  if (!isDemoMode()) return null;
  const restart = () => {
    try {
      resetDemo();
      window.location.assign('/dashboard');
    } catch {
      toast({ title: 'Não foi possível reiniciar', description: 'Permita o armazenamento no navegador e tente novamente.', variant: 'destructive' });
    }
  };
  return <aside className="preview-banner" aria-label="Modo de demonstração">
    <div className="preview-banner-copy"><FlaskConical aria-hidden="true" /><div><strong>Você está na prévia</strong><p>Dados fictícios. Alterações ficam só nesta aba e são descartadas ao sair.</p></div></div>
    <div className="preview-banner-actions">
      <Button type="button" variant="outline" size="sm" onClick={restart}><RotateCcw aria-hidden="true" /> Reiniciar prévia</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => void supabase.auth.signOut().then(() => navigate('/'))}><LogOut aria-hidden="true" /> Sair da prévia</Button>
    </div>
  </aside>;
}
