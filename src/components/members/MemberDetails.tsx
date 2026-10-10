import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type MemberProfile = {
  id: string;
  name: string;
  state_id?: string;
  alias_name?: string;
  role: string;
  status: string;
  join_date: string;
};

type Contribution = {
  type: string;
  amount: number;
  verified: boolean;
};

export function MemberDetails({ member, onClose }: { member: MemberProfile; onClose: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ deposits: number; pending: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadContributions = async () => {
      setLoading(true);
      setError(null);
      setSummary(null);
      try {
        const { data, error: queryError } = await supabase.from('finances').select('type, amount, verified').eq('member_id', member.id);
        if (queryError) throw queryError;
        const contributions = (data ?? []) as Contribution[];
        const deposits = contributions.filter(contribution => contribution.type === 'deposit')
          .reduce((total, contribution) => total + Number(contribution.amount), 0);
        if (!Number.isFinite(deposits)) throw new Error('Valores de depósitos inválidos recebidos do servidor.');
        if (!cancelled) setSummary({ deposits, pending: contributions.filter(contribution => contribution.verified === false).length });
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as contribuições.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadContributions();
    return () => { cancelled = true; };
  }, [member.id, attempt]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="bg-guild-surface border-guild-primary/30 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil de {member.name}</DialogTitle>
          <DialogDescription className="text-gray-300">Dados do membro e contribuições registradas.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          <div><dt className="text-gray-400">Nome</dt><dd>{member.name}</dd></div>
          <div><dt className="text-gray-400">State ID</dt><dd>{member.state_id || '—'}</dd></div>
          <div><dt className="text-gray-400">Alias Name</dt><dd>{member.alias_name || '—'}</dd></div>
          <div><dt className="text-gray-400">Função</dt><dd>{member.role || '—'}</dd></div>
          <div><dt className="text-gray-400">Data de entrada</dt><dd>{member.join_date || 'Não informada'}</dd></div>
          <div><dt className="text-gray-400">Status</dt><dd>{member.status === 'active' ? 'Ativo' : member.status === 'inactive' ? 'Inativo' : member.status || 'Não informado'}</dd></div>
        </dl>
        {loading && <p role="status" className="text-gray-300">Carregando contribuições...</p>}
        {error && <div><p role="alert" className="text-red-400">{error}</p><Button variant="outline" onClick={() => setAttempt(previous => previous + 1)}>Tentar novamente</Button></div>}
        {!loading && summary && <dl className="space-y-2 text-sm">
          <div><dt className="text-gray-400">Total de depósitos registrados</dt><dd>${summary.deposits.toLocaleString('pt-BR')}</dd></div>
          <div><dt className="text-gray-400">Transações pendentes de verificação</dt><dd>{summary.pending}</dd></div>
        </dl>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button className="bg-guild-primary hover:bg-guild-primary/80" onClick={() => navigate(`/finances?member=${encodeURIComponent(member.id)}`)}>Ver contribuições</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
