import { supabase } from './supabase'

// Relógio do servidor: datas de abertura nunca dependem só da hora do aparelho.
let offset = 0

// SIMULAÇÃO DE DATA (só em desenvolvimento, `npm run dev`; no site publicado é ignorada):
//   abra  http://localhost:5173/?agora=2027-01-01T00:00:00-03:00   para "viajar" até essa data (a hora continua correndo)
//   abra  http://localhost:5173/?agora=off                          para voltar ao normal
// Isso só muda o que a tela mostra. O banco continua usando a data real, então gravações e permissões não mudam.
const simShift = (() => {
  if (!import.meta.env.DEV) return 0
  try {
    const q = new URLSearchParams(location.search).get('agora')
    if (q === 'off') sessionStorage.removeItem('agora')
    else if (q) sessionStorage.setItem('agora', q)
    const v = sessionStorage.getItem('agora')
    const t = v ? Date.parse(v) : NaN
    return Number.isNaN(t) ? 0 : t - Date.now()
  } catch { return 0 }
})()

export const nowMs = () => Date.now() + offset + simShift
export async function syncClock() {
  try {
    const t0 = Date.now()
    const { data } = await supabase.rpc('server_now')
    if (data) offset = new Date(data as string).getTime() - (t0 + Date.now()) / 2
  } catch { /* sem rede: usa a hora do aparelho */ }
}
