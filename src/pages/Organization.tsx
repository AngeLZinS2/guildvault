import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRightLeft, Bell, CalendarDays, ClipboardList, Factory, History, Plus, Search, Settings, Shield, Truck, UserPlus, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { rpRequest, type RPRecord, type RPContext } from '@/services/rpService';
import './organization.css';

type Field = { key: string; label: string; kind?: string; required?: boolean; options?: Record<string, string> };
type Module = { title: string; description: string; icon: typeof Users; fields: Field[] };
const member = (key: string, label: string): Field => ({ key, label, kind: 'member', required: true });
const day: Field = { key: 'date', label: 'Data', kind: 'date', required: true };
const notes: Field = { key: 'notes', label: 'Observações', kind: 'textarea' };
const TYPES = { faction: 'Facção / gangue', company: 'Empresa', corporation: 'Corporação', mixed: 'Grupo misto' };
const MODULES: Record<string, Module> = {
  inbox: { title: 'Minhas pendências', description: 'Avisos não lidos, convites e obrigações atribuídas a você.', icon: Bell, fields: [] },
  reports: { title: 'Prestação de contas', description: 'Entradas e saídas aprovadas por período. Valores pendentes ficam separados.', icon: Wallet, fields: [] },
  operations: { title: 'Operações e eventos', description: 'Planeje a atividade, reúna os participantes e registre o resultado.', icon: CalendarDays, fields: [{ key: 'category', label: 'Tipo de atividade', required: true }, day, member('leader', 'Responsável'), { key: 'members', label: 'Participantes convidados', kind: 'members' }, { key: 'location', label: 'Local', required: true }, { key: 'vehicle', label: 'Veículo previsto', kind: 'vehicles' }, { key: 'materials', label: 'Recursos retirados ao iniciar (devolvidos ao cancelar)', kind: 'ingredients' }, { key: 'instructions', label: 'Instruções, funções e recursos necessários', kind: 'textarea' }, { key: 'income', label: 'Receita da operação (opcional)', kind: 'money' }, { key: 'expense', label: 'Despesa da operação (opcional)', kind: 'money' }] },
  roles: { title: 'Cargos e departamentos', description: 'Defina funções no RP e delegue a gestão de cada módulo.', icon: Shield, fields: [{ key: 'department', label: 'Departamento', required: true }, { key: 'members', label: 'Membros do cargo', kind: 'members' }, { key: 'permissions', label: 'Módulos que este cargo pode gerenciar', kind: 'permissions' }] },
  stock: { title: 'Movimentações de estoque', description: 'Registre entradas, saídas e transferências com motivo e autoria.', icon: ArrowRightLeft, fields: [] },
  charges: { title: 'Contribuições e cobranças', description: 'Acompanhe dinheiro ou itens por período. Quitar registra um depósito pendente no Caixa ou uma entrada no estoque.', icon: Wallet, fields: [member('member', 'Responsável pelo pagamento'), { key: 'kind', label: 'Tipo de contribuição', kind: 'select', options: { money: 'Dinheiro', item: 'Itens' }, required: true }, { key: 'amount', label: 'Valor em dinheiro', kind: 'money' }, { key: 'item', label: 'Item e base de destino', kind: 'item' }, { key: 'quantity', label: 'Quantidade de itens', kind: 'quantity' }, day, { key: 'period', label: 'Período / referência (ex.: semana 42)' }] },
  vehicles: { title: 'Garagem', description: 'Mantenha a frota, os empréstimos e as manutenções organizados.', icon: Truck, fields: [{ key: 'plate', label: 'Placa', required: true }, member('owner', 'Proprietário / responsável'), { key: 'location', label: 'Localização informada', required: true }, notes] },
  recruitment: { title: 'Recrutamento', description: 'Da candidatura à aprovação, com entrevista e período de experiência.', icon: UserPlus, fields: [{ key: 'state_id', label: 'State ID do candidato', required: true }, { key: 'contact', label: 'Contato no RP / Discord' }, member('mentor', 'Recrutador / tutor'), notes] },
  training: { title: 'Formação', description: 'Agende treinamentos e registre a conclusão de cada participante.', icon: Users, fields: [member('member', 'Participante'), member('mentor', 'Instrutor'), day, notes] },
  recipes: { title: 'Receitas de produção', description: 'Defina quanto material é consumido e quanto produto é gerado por lote.', icon: Factory, fields: [{ key: 'ingredients', label: 'Materiais por lote', kind: 'ingredients', required: true }, { key: 'output_item', label: 'Produto no estoque', kind: 'item', required: true }, { key: 'output_quantity', label: 'Produto por lote', kind: 'quantity', required: true }] },
  orders: { title: 'Encomendas', description: 'Produzir consome material e adiciona o produto ao estoque em uma única operação.', icon: ClipboardList, fields: [{ key: 'recipe', label: 'Receita', kind: 'recipes', required: true }, { key: 'quantity', label: 'Quantidade de lotes', kind: 'quantity', required: true }, member('member', 'Responsável'), day] },
  notices: { title: 'Avisos e regulamento', description: 'Publique orientações e acompanhe a confirmação de leitura.', icon: Bell, fields: [{ key: 'category', label: 'Categoria (aviso, regulamento, reunião...)', required: true }, { key: 'content', label: 'Mensagem', kind: 'textarea', required: true }, { ...day, label: 'Prazo de leitura', required: false }] },
  audit: { title: 'Histórico', description: 'Autoria e alterações registradas pelo servidor. Últimos 500 eventos.', icon: History, fields: [] },
  organization: { title: 'Organização', description: 'Todos os módulos estão disponíveis para qualquer tipo de organização.', icon: Settings, fields: [{ key: 'type', label: 'Tipo de organização', kind: 'select', options: TYPES, required: true }, { key: 'description', label: 'Identidade e objetivos', kind: 'textarea' }] },
};
const STATUSES: Record<string, string> = { active: 'Em atividade', planned: 'Planejada', completed: 'Concluído', cancelled: 'Cancelado', pending: 'Pendente', paid: 'Quitado', waived: 'Isento', available: 'Disponível', borrowed: 'Emprestado', maintenance: 'Em manutenção', applied: 'Candidatura', interview: 'Entrevista', trial: 'Em experiência', approved: 'Aprovado', rejected: 'Não aprovado', scheduled: 'Agendado', produced: 'Produzido', delivered: 'Entregue', published: 'Publicado', archived: 'Arquivado' };
const ACTIONS: Record<string, Record<string, [string, string][]>> = {
  operations: { planned: [['start', 'Iniciar'], ['cancel', 'Cancelar']], active: [['complete', 'Concluir'], ['cancel', 'Cancelar']] },
  charges: { pending: [['settle', 'Registrar quitação'], ['waive', 'Isentar']] },
  vehicles: { available: [['checkout', 'Retirar veículo'], ['maintenance', 'Enviar à manutenção']], borrowed: [['return', 'Devolver']], maintenance: [['release', 'Liberar']] },
  recruitment: { applied: [['interview', 'Agendar entrevista'], ['reject', 'Não aprovar']], interview: [['trial', 'Iniciar experiência'], ['reject', 'Não aprovar']], trial: [['approve', 'Aprovar'], ['reject', 'Não aprovar']] },
  training: { scheduled: [['complete', 'Concluir'], ['cancel', 'Cancelar']] },
  orders: { pending: [['produce', 'Produzir lotes'], ['cancel', 'Cancelar']], produced: [['deliver', 'Registrar entrega']] },
  notices: { published: [['archive', 'Arquivar']] },
};
const INITIAL: Record<string, string> = { organization: 'active', roles: 'active', operations: 'planned', charges: 'pending', vehicles: 'available', recruitment: 'applied', training: 'scheduled', recipes: 'active', orders: 'pending', notices: 'published' };
type Lookup = { id: string; name?: string; title?: string; number?: string; items?: Lookup[]; property_id?: string };
type Inbox = { id: string; title: string; module: string; date: string | null };
type ReportRow = { member?: string; income: number; expense: number; pending: number };
type Report = { totals: ReportRow; members: ReportRow[] };
type Audit = { id: string; actor: string; module: string; action: string; created_at: string; detail: Record<string, unknown> };
const ACTION_LABELS: Record<string, string> = { create: 'Criou', edit: 'Editou', delete: 'Excluiu', movement: 'Movimentou estoque', attend: 'Confirmou presença', read: 'Confirmou leitura', start: 'Iniciou', complete: 'Concluiu', cancel: 'Cancelou', settle: 'Registrou quitação', waive: 'Isentou', checkout: 'Retirou veículo', return: 'Devolveu veículo', maintenance: 'Enviou à manutenção', release: 'Liberou', interview: 'Encaminhou à entrevista', trial: 'Iniciou experiência', approve: 'Aprovou', reject: 'Não aprovou', produce: 'Produziu', deliver: 'Entregou', archive: 'Arquivou' };

export default function Organization() {
  const [params, setParams] = useSearchParams();
  const module = params.get('module') || 'operations';
  const selected = MODULES[module] || MODULES.operations;
  const [context, setContext] = useState<RPContext>({ permissions: [], user_id: '' });
  const [records, setRecords] = useState<RPRecord[]>([]);
  const [inbox, setInbox] = useState<Inbox[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [period, setPeriod] = useState({ start: new Date().toLocaleDateString('sv-SE').slice(0, 7) + '-01', end: new Date().toLocaleDateString('sv-SE') });
  const [audit, setAudit] = useState<Audit[]>([]);
  const [lookups, setLookups] = useState<Record<string, Lookup[]>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<RPRecord | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [action, setAction] = useState<{ row: RPRecord; name: string; label: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const loadId = useRef(0);
  const canManage = context.permissions.includes(module);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true); setError('');
    try {
      const ctx = await rpRequest<RPContext>('context');
      const [profiles, properties, vehicles, recipes, rows] = await Promise.all([
        supabase.from('profiles').select('*'), supabase.from('properties').select('*'),
        rpRequest<RPRecord[]>('records/vehicles'), rpRequest<RPRecord[]>('records/recipes'),
        module === 'inbox' ? rpRequest<Inbox[]>('inbox') : module === 'reports' ? Promise.resolve([]) : module === 'audit' ? rpRequest<Audit[]>('audit?limit=500') : module === 'stock' ? Promise.resolve([]) : rpRequest<RPRecord[]>(`records/${module}`),
      ]);
      if (profiles.error || properties.error) throw profiles.error || properties.error;
      if (id !== loadId.current) return;
      setContext(ctx);
      setLookups({ member: profiles.data, members: profiles.data, item: properties.data.flatMap((p: Lookup) => (p.items || []).map(i => ({ ...i, name: `${i.name} — Base ${p.number}` }))), vehicles, recipes });
      if (module === 'inbox') { setInbox(rows as Inbox[]); setRecords([]); }
      else if (module === 'audit') { setAudit(rows as Audit[]); setRecords([]); }
      else { setRecords(rows as RPRecord[]); setAudit([]); }
    } catch (e) { if (id === loadId.current) setError(e instanceof Error ? e.message : 'Não foi possível carregar os dados.'); }
    finally { if (id === loadId.current) setLoading(false); }
  }, [module]);
  const invalidateLoad = useCallback(() => { loadId.current++; }, []);
  useEffect(() => { setSearch(''); setStatus('all'); setForm({}); setEditing(null); setAction(null); void load(); return invalidateLoad; }, [load, invalidateLoad]);

  const loadReport = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { setReport(await rpRequest<Report>(`report?start=${period.start}&end=${period.end}`)); }
    catch (e) { setReport(null); toast({ title: 'Não foi possível consultar', description: e instanceof Error ? e.message : 'Tente novamente.', variant: 'destructive' }); }
    finally { lock.current = false; setBusy(false); }
  };

  const run = async (task: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await task(); setEditing(null); setAction(null); setForm({}); toast({ title: 'Registro salvo', description: 'A alteração foi registrada no histórico.' }); await load(); }
    catch (e) { toast({ title: 'Não foi possível salvar', description: e instanceof Error ? e.message : 'Tente novamente.', variant: 'destructive' }); }
    finally { lock.current = false; setBusy(false); }
  };
  const openEdit = (row: RPRecord | 'new') => {
    setEditing(row); setTitle(row === 'new' ? '' : row.title);
    setForm(row === 'new' ? {} : Object.fromEntries(Object.entries(row.data).filter(([key]) => !key.startsWith('_'))));
  };
  const fieldValue = (field: Field, value: unknown): string => {
    if (value === undefined || value === null || value === '') return '—';
    if (field.kind === 'ingredients' && Array.isArray(value)) return value.map(i => `${i.quantity} × ${fieldValue({ key: 'item', label: '', kind: 'item' }, i.item)}`).join('; ');
    if (Array.isArray(value)) return value.map(v => fieldValue({ ...field, kind: field.kind === 'members' ? 'member' : field.kind }, v)).join(', ') || '—';
    if (field.kind === 'permissions') return MODULES[String(value)]?.title || String(value);
    if (field.options) return field.options[String(value)] || String(value);
    if (lookups[field.kind || '']) return lookups[field.kind || ''].find(l => l.id === value)?.name || lookups[field.kind || ''].find(l => l.id === value)?.title || 'Registro indisponível';
    if (field.kind === 'money') return '$' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (field.kind === 'date') return String(value).split('-').reverse().join('/');
    return String(value);
  };
  const renderField = (field: Field) => {
    if (module === 'charges' && ((form.kind === 'item' && field.key === 'amount') || (form.kind !== 'item' && ['item', 'quantity'].includes(field.key)))) return null;
    const value = form[field.key];
    const update = (next: unknown) => setForm(prev => ({ ...prev, [field.key]: next }));
    const choices = field.kind === 'permissions' ? Object.entries(MODULES).filter(([key]) => !['roles', 'organization', 'inbox', 'reports'].includes(key)).map(([id, m]) => ({ id, name: m.title })) : lookups[field.kind || ''];
    return <div className="rp-field" key={field.key}><Label htmlFor={`rp-${field.key}`}>{field.label}{field.required ? ' *' : ''}</Label>
      {field.kind === 'ingredients' ? <div className="rp-ingredients">{(Array.isArray(value) ? value as { item: string; quantity: number }[] : []).map((ingredient, index) => <div className="flex gap-2 mb-2 flex-wrap" key={index}><select aria-label={`Material ${index + 1}`} required value={ingredient.item} onChange={e => update((value as unknown[]).map((v, n) => n === index ? { ...ingredient, item: e.target.value } : v))}><option value="">Selecione o material</option>{lookups.item?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input className="w-28" aria-label={`Quantidade do material ${index + 1}`} required type="number" min={1} max={2147483647} step={1} value={ingredient.quantity} onChange={e => update((value as unknown[]).map((v, n) => n === index ? { ...ingredient, quantity: Number(e.target.value) } : v))} /><Button type="button" variant="outline" onClick={() => update((value as unknown[]).filter((_, n) => n !== index))}>Remover</Button></div>)}<Button type="button" variant="outline" onClick={() => update([...(Array.isArray(value) ? value : []), { item: '', quantity: 1 }])}>Adicionar material</Button></div> : field.kind === 'members' || field.kind === 'permissions' ? <div className="rp-checks">{choices?.map(choice => <label key={choice.id}><input type="checkbox" checked={Array.isArray(value) && value.includes(choice.id)} onChange={e => update(e.target.checked ? [...(Array.isArray(value) ? value : []), choice.id] : (Array.isArray(value) ? value : []).filter(v => v !== choice.id))} />{choice.name || choice.title}</label>)}{!choices?.length && <span>Nenhum membro cadastrado.</span>}</div>
        : choices || field.options ? <select id={`rp-${field.key}`} required={field.required} value={String(value ?? '')} onChange={e => update(e.target.value)}><option value="">Selecione</option>{choices ? choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name || choice.title}</option>) : Object.entries(field.options || {}).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          : field.kind === 'textarea' ? <textarea id={`rp-${field.key}`} required={field.required} maxLength={4000} rows={4} value={String(value ?? '')} onChange={e => update(e.target.value)} />
            : <Input id={`rp-${field.key}`} required={field.required} type={['money', 'quantity'].includes(field.kind || '') ? 'number' : field.kind === 'date' ? 'date' : 'text'} min={field.kind === 'money' ? 0.01 : 1} max={field.kind === 'money' ? 1_000_000_000 : 2147483647} step={field.kind === 'money' ? '0.01' : '1'} maxLength={4000} value={String(value ?? '')} onChange={e => update(['money', 'quantity'].includes(field.kind || '') && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />}
    </div>;
  };
  const filtered = records.filter(row => (status === 'all' || row.status === status) && `${row.title} ${selected.fields.map(f => fieldValue(f, row.data[f.key])).join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  return <main className="rp-shell"><header className="rp-heading"><div><span>GuildVault / Organização</span><h1>Uma central para a sua rotina.</h1><p>Facções, empresas, corporações e grupos mistos.</p></div></header>
    <div className="rp-layout"><aside className="rp-menu" aria-label="Módulos da organização">{Object.entries(MODULES).map(([key, item]) => <button key={key} className={module === key ? 'selected' : ''} onClick={() => setParams({ module: key })}><item.icon size={18} /><span>{item.title}</span></button>)}</aside>
      <section className="rp-workspace"><div className="rp-section-heading"><div><h2>{selected.title}</h2><p>{selected.description}</p></div>{canManage && !['audit', 'stock'].includes(module) && !(module === 'organization' && records.length > 0) && <Button onClick={() => openEdit('new')} disabled={loading}><Plus size={16} /> Novo registro</Button>}</div>
        {error ? <div role="alert" className="rp-empty"><p>{error}</p><Button onClick={() => void load()}>Tentar novamente</Button></div> : loading ? <p role="status" className="rp-empty">Carregando registros…</p> : <>
          {module === 'inbox' ? <div className="rp-records">{inbox.length ? inbox.map(item => <button className="rp-record text-left" key={item.id} onClick={() => setParams({ module: item.module })}><h3>{item.title}</h3><p>{MODULES[item.module]?.title}{item.date ? ' · ' + item.date.split('-').reverse().join('/') : ''}</p></button>) : <p className="rp-empty">Nenhuma pendência atribuída a você.</p>}</div> : module === 'reports' ? <><form className="rp-filters" onSubmit={e => { e.preventDefault(); void loadReport(); }}><Label>De <Input type="date" required value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} /></Label><Label>Até <Input type="date" required min={period.start} value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} /></Label><Button disabled={busy || !context.permissions.includes('audit')}>Consultar período</Button></form>{!context.permissions.includes('audit') && <p>Peça à liderança a permissão de histórico para consultar relatórios.</p>}{report && <div className="rp-record"><h3>Saldo aprovado: ${(report.totals.income - report.totals.expense).toLocaleString('pt-BR')}</h3><p>Entradas: ${report.totals.income.toLocaleString('pt-BR')} · Saídas: ${report.totals.expense.toLocaleString('pt-BR')} · Pendentes: ${report.totals.pending.toLocaleString('pt-BR')}</p><div className="overflow-x-auto"><table className="w-full mt-6 text-left"><thead><tr><th>Membro</th><th>Entradas</th><th>Saídas</th><th>Pendentes</th></tr></thead><tbody>{report.members.map((r, i) => <tr key={i}><td className="py-3">{r.member}</td><td>${r.income.toLocaleString('pt-BR')}</td><td>${r.expense.toLocaleString('pt-BR')}</td><td>${r.pending.toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></div>}</> : module === 'stock' ? canManage ? <form className="rp-stock-form" onSubmit={e => { e.preventDefault(); void run(() => rpRequest('stock', 'POST', form)); }}>
            {[{ key: 'kind', label: 'Movimento', kind: 'select', required: true, options: { entry: 'Entrada', exit: 'Saída', transfer: 'Transferência entre bases' } }, { key: 'item_id', label: 'Item de origem', kind: 'item', required: true }, ...(form.kind === 'transfer' ? [{ key: 'destination_id', label: 'Mesmo item na base de destino', kind: 'item', required: true }] : []), { key: 'quantity', label: 'Quantidade', kind: 'quantity', required: true }, { key: 'reason', label: 'Motivo / operação', required: true }].map(renderField)}
            <Button disabled={busy}>Registrar movimentação</Button><p>Para transferir, cadastre o mesmo item na base de destino. O histórico preserva os saldos antes e depois.</p>
          </form> : <p className="rp-empty">Peça à liderança a permissão de estoque para registrar movimentos.</p>
            : module === 'audit' ? <div className="rp-journal">{audit.length ? audit.map(event => <article key={event.id}><time>{new Date(event.created_at).toLocaleString('pt-BR')}</time><strong>{event.actor} · {ACTION_LABELS[event.action] || event.action}</strong><span>{MODULES[event.module]?.title || event.module}</span><details><summary>Ver detalhes</summary><pre>{JSON.stringify(event.detail, null, 2)}</pre></details></article>) : <p className="rp-empty">O histórico aparecerá após as primeiras ações.</p>}</div>
              : <><div className="rp-filters"><div><Search size={17} /><Input aria-label="Pesquisar registros" placeholder="Pesquisar registros…" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filtrar por situação" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todas as situações</option>{[...new Set(records.map(r => r.status))].map(s => <option key={s} value={s}>{STATUSES[s] || s}</option>)}</select><span>{filtered.length} registro(s)</span></div>
                {!filtered.length && <div className="rp-empty"><selected.icon size={32} /><h3>{records.length ? 'Nenhum resultado para este filtro' : 'Comece por um registro'}</h3><p>{canManage ? 'Use “Novo registro” para organizar esta rotina.' : 'Os registros publicados pela liderança aparecerão aqui.'}</p></div>}
                <div className="rp-records">{filtered.map(row => <article className="rp-record" key={row.id}><div className="rp-record-heading"><h3>{row.title}</h3><span className={`rp-status state-${row.status}`}>{STATUSES[row.status] || row.status}</span></div><dl>{selected.fields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{fieldValue(f, row.data[f.key])}</dd></div>)}</dl>
                  {row.data._last_note && <p className="rp-note">Último registro: {String(row.data._last_note)}</p>}
                  {row.data._finance_id && <a href="/finances">Consultar lançamento no Caixa →</a>}
                  {row.data._borrower && <p>Retirado por: {fieldValue(member('borrower', ''), row.data._borrower)}</p>}
                  {module === 'recruitment' && row.status === 'approved' && <a href="/members">Cadastrar acesso do membro →</a>}
                  {module === 'operations' && <p>{Array.isArray(row.data._attendance) ? row.data._attendance.length : 0} presença(s) confirmada(s)</p>}
                  {module === 'notices' && <p>{Array.isArray(row.data._readers) ? row.data._readers.length : 0} leitura(s) confirmada(s)</p>}
                  <footer>{canManage && row.status === INITIAL[module] && <Button variant="outline" onClick={() => openEdit(row)}>Editar</Button>}
                    {canManage && (ACTIONS[module]?.[row.status] || []).map(([name, label]) => <Button key={name} variant="outline" onClick={() => { setAction({ row, name, label }); setNote(''); }}>{label}</Button>)}
                    {((module === 'operations' && ['planned', 'active'].includes(row.status)) || (module === 'notices' && row.status === 'published')) && <Button variant="outline" disabled={busy || (Array.isArray(row.data[module === 'notices' ? '_readers' : '_attendance']) && (row.data[module === 'notices' ? '_readers' : '_attendance'] as string[]).includes(context.user_id))} onClick={() => void run(() => rpRequest(`actions/${row.id}`, 'POST', { action: module === 'notices' ? 'read' : 'attend' }))}>{module === 'notices' ? 'Confirmar leitura' : 'Confirmar presença'}</Button>}
                  </footer></article>)}</div></>}
        </>}
      </section></div>
      <Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="rp-dialog"><DialogHeader><DialogTitle>{editing === 'new' ? 'Novo registro' : 'Editar registro'} · {selected.title}</DialogTitle><DialogDescription>{selected.description}</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); void run(() => rpRequest(editing === 'new' ? `records/${module}` : `records/${editing?.id}`, editing === 'new' ? 'POST' : 'PUT', { title, data: form })); }}><div className="rp-field"><Label htmlFor="rp-title">{module === 'organization' ? 'Nome da organização' : module === 'vehicles' ? 'Modelo / nome do veículo' : module === 'recruitment' ? 'Nome do candidato' : 'Título / nome'} *</Label><Input id="rp-title" required minLength={2} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></div>{selected.fields.map(renderField)}<Button disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar registro'}</Button></form></DialogContent></Dialog>
      <Dialog open={action !== null} onOpenChange={open => { if (!open && !busy) setAction(null); }}><DialogContent className="rp-dialog"><DialogHeader><DialogTitle>{action?.label}</DialogTitle><DialogDescription>{action?.row.title}{action?.name === 'settle' ? ' — a contribuição será registrada uma única vez no caixa ou estoque.' : action?.name === 'produce' ? ' — o estoque será atualizado conforme a receita.' : ''}</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); if (action) void run(() => rpRequest(`actions/${action.row.id}`, 'POST', { action: action.name, note })); }}><div className="rp-field"><Label htmlFor="rp-action-note">Resultado / observações</Label><textarea id="rp-action-note" maxLength={1000} required={['complete', 'waive', 'reject', 'cancel', 'maintenance'].includes(action?.name || '')} minLength={3} rows={4} value={note} onChange={e => setNote(e.target.value)} /></div><Button disabled={busy}>{busy ? 'Registrando…' : 'Confirmar'}</Button></form></DialogContent></Dialog>
  </main>;
}
