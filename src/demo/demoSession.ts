import { createDemoData, DEMO_USER_ID, type DemoRow } from './demoData';

const MODE_KEY = 'guildvault-preview-mode';
const DATA_KEY = 'guildvault-preview-data-v1';
const modules = ['organization', 'roles', 'operations', 'charges', 'vehicles', 'recruitment', 'training', 'recipes', 'orders', 'notices', 'stock', 'audit'];
const initialStatus: Record<string, string> = { operations: 'planned', charges: 'pending', vehicles: 'available', recruitment: 'applied', training: 'scheduled', orders: 'pending', notices: 'published' };
const transitions: Record<string, Record<string, [string[], string]>> = {
  operations: { start: [['planned'], 'active'], complete: [['active'], 'completed'], cancel: [['planned', 'active'], 'cancelled'] },
  charges: { settle: [['pending'], 'paid'], waive: [['pending'], 'waived'] },
  vehicles: { checkout: [['available'], 'borrowed'], return: [['borrowed'], 'available'], maintenance: [['available'], 'maintenance'], release: [['maintenance'], 'available'] },
  recruitment: { interview: [['applied'], 'interview'], trial: [['interview'], 'trial'], approve: [['trial'], 'approved'], reject: [['applied', 'interview', 'trial'], 'rejected'] },
  training: { complete: [['scheduled'], 'completed'], cancel: [['scheduled'], 'cancelled'] },
  orders: { produce: [['pending'], 'produced'], deliver: [['produced'], 'delivered'], cancel: [['pending'], 'cancelled'] },
  notices: { archive: [['published'], 'archived'] },
};
type DemoState = ReturnType<typeof createDemoData>;
const clone = <Value,>(value: Value): Value => JSON.parse(JSON.stringify(value));
const localId = () => `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const today = () => new Date().toLocaleDateString('sv-SE');

export function isDemoMode() { return sessionStorage.getItem(MODE_KEY) === '1'; }

function readState(): DemoState {
  if (!isDemoMode()) throw new Error('Prévia encerrada. Abra uma nova demonstração no login.');
  const raw = sessionStorage.getItem(DATA_KEY);
  if (!raw) throw new Error('Dados da prévia indisponíveis. Reinicie a demonstração.');
  return JSON.parse(raw);
}

function saveState(state: DemoState) {
  sessionStorage.setItem(DATA_KEY, JSON.stringify(state));
}

export function startDemo() {
  saveState(createDemoData());
  sessionStorage.setItem(MODE_KEY, '1');
}

export function resetDemo() {
  if (!isDemoMode()) throw new Error('A prévia não está ativa.');
  saveState(createDemoData());
}

export function endDemo() {
  sessionStorage.removeItem(MODE_KEY);
  sessionStorage.removeItem(DATA_KEY);
}

export function demoSession() {
  if (!isDemoMode()) return null;
  let user: DemoRow | undefined;
  try { user = readState().tables.profiles.find(row => row.id === DEMO_USER_ID); } catch { user = undefined; }
  user ??= createDemoData().tables.profiles.find(row => row.id === DEMO_USER_ID);
  return { access_token: 'guildvault-preview-local-only', user: clone(user) };
}

function logChange(state: DemoState, module: string, action: string, title: unknown) {
  state.audit.unshift({ id: localId(), actor: 'Visitante da prévia', module, action, created_at: new Date().toISOString(), detail: { title } });
}

function moveStock(state: DemoState, id: unknown, delta: number, reason: unknown) {
  const item = state.tables.items.find(row => row.id === id);
  if (!item) throw new Error('Item não encontrado na prévia.');
  const quantity = Number(item.quantity) + delta;
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new Error('Quantidade inválida ou estoque insuficiente.');
  item.quantity = quantity;
  logChange(state, 'stock', 'movement', `${item.name}: ${delta > 0 ? '+' : ''}${delta}. ${reason || ''}`);
}

function addFinance(state: DemoState, payload: Record<string, unknown>): DemoRow {
  if (!Number.isFinite(payload.amount) || Number(payload.amount) <= 0 || Number(payload.amount) > 1_000_000_000 || !['deposit', 'withdrawal'].includes(String(payload.type))) throw new Error('Informe um valor positivo até $1.000.000.000 e um tipo válido.');
  const row = { ...payload, id: localId(), date: payload.date || today(), created_at: new Date().toISOString(), verified: false, status: 'pending', verified_by: null };
  state.tables.finances.unshift(row);
  return row;
}

function rpAction(state: DemoState, row: DemoRow, body: Record<string, unknown>) {
  const action = String(body.action);
  const data = row.data as Record<string, unknown>;
  if (action === 'attend' || action === 'read') {
    if ((action === 'attend' && (row.module !== 'operations' || !['planned', 'active'].includes(String(row.status)))) || (action === 'read' && (row.module !== 'notices' || row.status !== 'published'))) throw new Error('Ação indisponível neste estado.');
    const field = action === 'read' ? '_readers' : '_attendance';
    data[field] = [...new Set([...(Array.isArray(data[field]) ? data[field] as string[] : []), DEMO_USER_ID])];
  } else {
    const transition = transitions[String(row.module)]?.[action];
    if (!transition || !transition[0].includes(String(row.status))) throw new Error('Ação já realizada ou indisponível neste estado.');
    if (['complete', 'waive', 'reject', 'cancel', 'maintenance'].includes(action) && String(body.note || '').trim().length < 3) throw new Error('Informe o resultado ou motivo da ação.');
    if (row.module === 'charges' && action === 'settle') {
      if (data.kind === 'item') moveStock(state, data.item, Number(data.quantity), row.title);
      else data._finance_id = addFinance(state, { member_id: data.member, type: 'deposit', amount: data.amount, description: `Quitação: ${row.title}` }).id;
    }
    if (row.module === 'orders' && action === 'produce') {
      const recipe = state.records.find(record => record.id === data.recipe);
      if (!recipe) throw new Error('Receita não encontrada.');
      const spec = recipe.data as Record<string, unknown>;
      for (const ingredient of spec.ingredients as { item: string; quantity: number }[]) moveStock(state, ingredient.item, -ingredient.quantity * Number(data.quantity), row.title);
      moveStock(state, spec.output_item, Number(spec.output_quantity) * Number(data.quantity), row.title);
      data._recipe_snapshot = clone(spec);
    }
    if (row.module === 'operations') {
      if (action === 'start' || (action === 'cancel' && row.status === 'active')) {
        for (const allocation of (data.materials || []) as { item: string; quantity: number }[]) moveStock(state, allocation.item, allocation.quantity * (action === 'start' ? -1 : 1), row.title);
      }
      const vehicle = state.records.find(record => record.id === data.vehicle);
      if (vehicle && action === 'start') {
        if (vehicle.status !== 'available') throw new Error('Veículo indisponível.');
        vehicle.status = 'borrowed';
        vehicle.data = { ...vehicle.data as object, _operation: row.id, _borrower: data.leader };
      } else if (vehicle && ['complete', 'cancel'].includes(action) && (vehicle.data as Record<string, unknown>)._operation === row.id) {
        vehicle.status = 'available';
        vehicle.data = { ...vehicle.data as object, _operation: null, _borrower: null };
      }
      if (action === 'complete') {
        for (const [field, type] of [['income', 'deposit'], ['expense', 'withdrawal']]) {
          if (Number(data[field]) > 0) addFinance(state, { member_id: data.leader, type, amount: data[field], description: `Operação: ${row.title}` });
        }
      }
    }
    if (row.module === 'vehicles') {
      if (data._operation) throw new Error('Conclua ou cancele a operação vinculada primeiro.');
      data._borrower = action === 'checkout' ? DEMO_USER_ID : null;
    }
    row.status = transition[1];
  }
  if (body.note) data._last_note = body.note;
  logChange(state, String(row.module), action, row.title);
  return row;
}

function rpRequest(state: DemoState, path: string[], method: string, body: Record<string, unknown>, params: URLSearchParams): unknown {
  const [resource, id] = path;
  if (method === 'GET') {
    if (resource === 'context') return { permissions: modules, user_id: DEMO_USER_ID };
    if (resource === 'records' && modules.includes(id)) return state.records.filter(row => row.module === id);
    if (resource === 'audit') return state.audit.slice(0, 500);
    if (resource === 'inbox') return state.records.filter(row => {
      const data = row.data as Record<string, unknown>;
      return (row.module === 'notices' && row.status === 'published' && !(data._readers as string[] || []).includes(DEMO_USER_ID))
        || (data.member === DEMO_USER_ID && ['pending', 'scheduled'].includes(String(row.status)))
        || (row.module === 'operations' && row.status === 'planned' && (data.members as string[] || []).includes(DEMO_USER_ID) && !(data._attendance as string[] || []).includes(DEMO_USER_ID));
    }).map(row => ({ id: row.id, module: row.module, title: row.title, date: (row.data as Record<string, unknown>).date || null }));
    if (resource === 'report') {
      const start = params.get('start') || '';
      const end = params.get('end') || '9999';
      if (end < start) throw new Error('A data final deve ser posterior à inicial.');
      const totals = { income: 0, expense: 0, pending: 0 };
      const members = new Map<string, { member: unknown; income: number; expense: number; pending: number }>();
      for (const finance of state.tables.finances.filter(row => String(row.date).slice(0, 10) >= start && String(row.date).slice(0, 10) <= end)) {
        const memberId = String(finance.member_id);
        const member = members.get(memberId) || { member: state.tables.profiles.find(profile => profile.id === memberId)?.name || 'Membro removido', income: 0, expense: 0, pending: 0 };
        const field = !finance.verified ? 'pending' : finance.type === 'deposit' ? 'income' : 'expense';
        member[field] += Number(finance.amount); totals[field] += Number(finance.amount); members.set(memberId, member);
      }
      return { totals, members: [...members.values()] };
    }
  }
  if (method === 'POST' && resource === 'stock') {
    const quantity = Number(body.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || !['entry', 'exit', 'transfer'].includes(String(body.kind))) throw new Error('Movimentação inválida.');
    if (body.kind === 'transfer') {
      const source = state.tables.items.find(item => item.id === body.item_id);
      const target = state.tables.items.find(item => item.id === body.destination_id);
      if (!source || !target || source.id === target.id || source.property_id === target.property_id || String(source.name).toLowerCase() !== String(target.name).toLowerCase()) throw new Error('Escolha o mesmo item em outra base.');
      moveStock(state, target.id, quantity, body.reason);
    }
    moveStock(state, body.item_id, quantity * (body.kind === 'entry' ? 1 : -1), body.reason);
    return { success: true };
  }
  if (method === 'POST' && resource === 'records' && modules.includes(id)) {
    const row = { id: localId(), module: id, title: body.title, status: initialStatus[id] || 'active', data: body.data || {}, created_at: new Date().toISOString() };
    state.records.unshift(row); logChange(state, id, 'create', row.title); return row;
  }
  const row = state.records.find(record => record.id === id);
  if (row && method === 'PUT' && resource === 'records') {
    row.title = body.title; row.data = { ...row.data as object, ...body.data as object }; logChange(state, String(row.module), 'edit', row.title); return row;
  }
  if (row && method === 'POST' && resource === 'actions') return rpAction(state, row, body);
  throw new Error('Esta ação não está disponível na prévia. Nenhum dado real foi acessado.');
}

function tableRequest(state: DemoState, table: string, id: string | undefined, method: string, body: Record<string, unknown>, params: URLSearchParams): unknown {
  const rows = state.tables[table];
  if (!rows) throw new Error('Dados indisponíveis nesta prévia.');
  if (method === 'GET') {
    let result = rows.filter(row => [...params].every(([key, value]) => {
      const [operator, ...parts] = key.split('_');
      const field = parts.join('_');
      if (operator === 'eq') return String(row[field]) === value;
      if (operator === 'neq') return String(row[field]) !== value;
      if (operator === 'gte') return String(row[field]) >= value;
      if (operator === 'lte') return String(row[field]) <= value;
      return true;
    }));
    const order = params.get('order');
    if (order) result = [...result].sort((first, second) => String(first[order] ?? '').localeCompare(String(second[order] ?? '')) * (params.get('ascending') === 'false' ? -1 : 1));
    return table === 'properties' ? result.map(row => ({ ...row, items: state.tables.items.filter(item => item.property_id === row.id) })) : result;
  }
  const clean = { ...body };
  for (const key of ['password', 'password_hash', 'temporary_password', 'id', 'created_at']) delete clean[key];
  if (table === 'items' && clean.quantity !== undefined && (!Number.isSafeInteger(clean.quantity) || Number(clean.quantity) < 0 || Number(clean.quantity) > 2147483647)) throw new Error('Quantidade inválida.');
  if (method === 'POST') {
    const row: DemoRow = table === 'finances' ? addFinance(state, clean) : { ...clean, id: localId(), created_at: new Date().toISOString(), ...(table === 'profiles' ? { status: 'active', join_date: today(), last_activity: today() } : {}) };
    if (table !== 'finances') rows.unshift(row);
    logChange(state, table, 'create', row.title || row.name || row.id); return row;
  }
  const row = rows.find(record => record.id === id);
  if (!row) throw new Error('Registro não encontrado na prévia.');
  if (table === 'profiles' && id === DEMO_USER_ID && (method === 'DELETE' || (clean.status !== undefined && clean.status !== 'active') || (clean.role !== undefined && clean.role !== 'superadmin'))) throw new Error('Sua própria conta não pode ser desativada ou perder acesso.');
  if (method === 'PATCH') {
    if (table === 'finances' && clean.verified !== undefined) { clean.verified_by = clean.verified ? DEMO_USER_ID : null; clean.status = clean.verified ? 'verified' : 'pending'; }
    Object.assign(row, clean); logChange(state, table, 'edit', row.title || row.name || row.id); return row;
  }
  if (method === 'DELETE') {
    state.tables[table] = rows.filter(record => record.id !== id);
    if (table === 'properties') state.tables.items = state.tables.items.filter(item => item.property_id !== id);
    logChange(state, table, 'delete', row.title || row.name || row.id); return null;
  }
  throw new Error('Ação indisponível na prévia.');
}

export async function demoRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const state = readState();
  const url = new URL(path, 'http://preview.local');
  const [, prefix, resource, ...parts] = url.pathname.split('/');
  const method = (options.method || 'GET').toUpperCase();
  if (prefix !== 'api') throw new Error('Requisição externa bloqueada na prévia.');
  if (resource === 'uploads' && method === 'POST' && options.body instanceof FormData) {
    const file = options.body.get('file');
    if (!(file instanceof File) || file.size > 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('Na prévia, use uma imagem ou PDF de até 1 MB. O arquivo fica apenas neste navegador.');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo local.'));
      reader.readAsDataURL(file);
    });
    return { url: dataUrl };
  }
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
  const result = resource === 'data' ? tableRequest(state, parts[0], parts[1], method, body, url.searchParams)
    : resource === 'rp' ? rpRequest(state, parts, method, body, url.searchParams)
      : (() => { throw new Error('Esta ação não está disponível na prévia. Nenhum dado real foi acessado.'); })();
  if (method !== 'GET') saveState(state);
  return clone(result);
}
