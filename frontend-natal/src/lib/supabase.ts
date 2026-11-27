import { createClient } from '@supabase/supabase-js'

// Limpa espaços e aspas coladas por engano, e remove "/rest/v1" ou barra final da URL.
const clean = (v?: string) => (v ?? '').trim().replace(/^["']+|["']+$/g, '')
const url = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined).replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1.*$/, '')
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

const validUrl = (u: string) => { try { return /^https?:$/.test(new URL(u).protocol) } catch { return false } }

// Resumo seguro (sem expor a chave) para a tela de aviso mostrar o que o site realmente recebeu.
export const configStatus = { url: !url ? 'ausente' : validUrl(url) ? 'ok' : 'inválida', urlStart: url.slice(0, 30), keyLength: key.length }
export const configured = validUrl(url) && key.length > 20
// A chave "anon"/"publishable" é pública por design: quem protege os dados são as políticas RLS do banco.
// NUNCA coloque a chave "service_role"/"secret" aqui.
export const supabase = createClient(configured ? url : 'http://localhost:54321', configured ? key : 'sem-chave')
