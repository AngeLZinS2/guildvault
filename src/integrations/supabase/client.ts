import type { Database } from './types';
import { demoRequest, demoSession, endDemo, isDemoMode, startDemo } from '../../demo/demoSession';

const TOKEN_KEY = 'guildvault-token';
const USER_KEY = 'guildvault-user';
type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT';
type Listener = (event: AuthEvent, session: Session | null) => void;
type Session = { access_token: string; user: Record<string, unknown> };
type QueryResult = { data: any; error: Error | null };
const listeners = new Set<Listener>();

function session(): Session | null {
  if (isDemoMode()) return demoSession();
  const access_token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  return access_token && rawUser ? { access_token, user: JSON.parse(rawUser) } : null;
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  if (isDemoMode()) return demoRequest(path, options);
  const current = session();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (current) headers.set('Authorization', `Bearer ${current.access_token}`);
  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'Confira os campos e tente novamente.');
  }
  return response.status === 204 ? null : response.json();
}

const request = apiRequest;

class QueryBuilder {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any;
  private filters = new URLSearchParams();
  private returnSingle = false;

  constructor(private table: string) {}
  select(_columns = '*') { if (this.operation === 'select') this.operation = 'select'; return this; }
  insert(payload: any) { this.operation = 'insert'; this.payload = Array.isArray(payload) ? payload[0] : payload; return this; }
  update(payload: any) { this.operation = 'update'; this.payload = payload; return this; }
  delete() { this.operation = 'delete'; return this; }
  eq(field: string, value: unknown) { this.filters.set(`eq_${field}`, String(value)); return this; }
  neq(field: string, value: unknown) { this.filters.set(`neq_${field}`, String(value)); return this; }
  gte(field: string, value: unknown) { this.filters.set(`gte_${field}`, String(value)); return this; }
  lte(field: string, value: unknown) { this.filters.set(`lte_${field}`, String(value)); return this; }
  order(field: string, options: { ascending?: boolean } = {}) { this.filters.set('order', field); this.filters.set('ascending', String(options.ascending ?? true)); return this; }
  single() { this.returnSingle = true; return this; }

  private async execute(): Promise<QueryResult> {
    try {
      const id = this.filters.get('eq_id');
      let data: any;
      if (this.operation === 'select') {
        const rows = await request(`/api/data/${this.table}?${this.filters}`);
        data = this.returnSingle ? rows[0] ?? null : rows;
      } else if (this.operation === 'insert') {
        data = await request(`/api/data/${this.table}`, { method: 'POST', body: JSON.stringify(this.payload) });
      } else if (this.operation === 'update') {
        if (!id) throw new Error('Identificador obrigatório');
        data = await request(`/api/data/${this.table}/${id}`, { method: 'PATCH', body: JSON.stringify(this.payload) });
      } else {
        if (!id) throw new Error('Identificador obrigatório');
        data = await request(`/api/data/${this.table}/${id}`, { method: 'DELETE' });
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Erro desconhecido') };
    }
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  auth: {
    async startPreview() {
      startDemo();
      const active = session();
      listeners.forEach(listener => listener('SIGNED_IN', active));
      return active;
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        if (isDemoMode()) throw new Error('Saia da prévia antes de iniciar uma sessão real.');
        const state_id = email.split('@')[0];
        const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ state_id, password }) });
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        const active = session();
        listeners.forEach(listener => listener('SIGNED_IN', active));
        return { data: { session: active, user: data.user }, error: null };
      } catch (error) {
        return { data: { session: null, user: null }, error: error instanceof Error ? error : new Error('Falha no login') };
      }
    },
    async signUp({ email, password, options }: any) {
      const payload = { state_id: email.split('@')[0], password, ...options?.data };
      try {
        const user = await request('/api/data/profiles', { method: 'POST', body: JSON.stringify(payload) });
        return { data: { user }, error: null };
      } catch (error) { return { data: { user: null }, error: error as Error }; }
    },
    async signInWithOtp() { return { error: new Error('Confirmação por e-mail não é utilizada') }; },
    async signOut() {
      endDemo();
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
      listeners.forEach(listener => listener('SIGNED_OUT', null));
      return { error: null };
    },
    async getSession() { return { data: { session: session() } }; },
    async getUser(): Promise<{ data: { user: any } }> { return { data: { user: session()?.user ?? null } }; },
    onAuthStateChange(listener: Listener) {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    },
  },
  from(table: string) { return new QueryBuilder(table); },
  storage: {
    from(bucket: string) {
      return {
        async upload(_path: string, file: File) {
          try {
            const body = new FormData(); body.append('file', file);
            const data = await request(`/api/uploads/${bucket.replace('_', '-')}`, { method: 'POST', body });
            return { data: { path: data.url }, error: null };
          } catch (error) { return { data: null, error: error as Error }; }
        },
        getPublicUrl(path: string) { return { data: { publicUrl: path.startsWith('data:') || path.startsWith('/api/') ? path : `/api/uploads/${path.split('/').pop()}` } }; },
      };
    },
  },
};

export type Tables = Database['public']['Tables'];
export type ProfileRow = Tables['profiles']['Row'];
export type FinanceRow = Tables['finances']['Row'] & { verified_by?: string | null; verification_notes?: string | null; status?: FinanceStatus };
export type GoalRow = Tables['goals']['Row'];
export type PaymentScheduleRow = Tables['payment_schedule']['Row'];
export enum FinanceStatus { PENDING = 'pending', VERIFIED = 'verified', REJECTED = 'rejected' }
