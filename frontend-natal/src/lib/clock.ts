import { supabase } from './supabase'

// Relógio do servidor: datas de abertura nunca dependem só da hora do aparelho.
let offset = 0
export const nowMs = () => Date.now() + offset
export async function syncClock() {
  try {
    const t0 = Date.now()
    const { data } = await supabase.rpc('server_now')
    if (data) offset = new Date(data as string).getTime() - (t0 + Date.now()) / 2
  } catch { /* sem rede: usa a hora do aparelho */ }
}
