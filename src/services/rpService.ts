import { apiRequest } from '@/integrations/supabase/client';

export type RPRecord = { id: string; module: string; title: string; status: string; data: Record<string, unknown>; created_at: string };
export type RPContext = { permissions: string[]; user_id: string };
export async function rpRequest<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  return apiRequest(`/api/rp/${path}`, {
    method,
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  }) as Promise<T>;
}
