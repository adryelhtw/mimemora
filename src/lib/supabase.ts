import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const validUrl = (u?: string) => { try { return !!u && /^https?:$/.test(new URL(u).protocol) } catch { return false } }

// Se o .env.local estiver vazio ou com a URL errada, o site mostra um aviso em vez de quebrar.
export const configured = validUrl(url) && Boolean(key && key.length > 20)
// A chave "anon"/"publishable" é pública por design: quem protege os dados são as políticas RLS do banco.
// NUNCA coloque a chave "service_role"/"secret" aqui.
export const supabase = createClient(configured ? (url as string) : 'http://localhost:54321', configured ? (key as string) : 'sem-chave')
