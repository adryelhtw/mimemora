import { supabase } from './supabase'
import type { Look, Memory, Ornament, OrnamentType, Profile, Side, TreeData } from '../types'

export const EVENT_SLUG = 'natal-2026'

export type DbProfile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
export type EventRow = { id: string; slug: string; name: string; starts_at: string; opens_at: string; ends_at: string }
export type TreeCard = { id: string; owner: Profile; look: Look; count: number }
export type PlaceFn = (participationId: string, type: OrnamentType, message: string, side: Side, slot: number) => Promise<string | null>

const MESSAGES: Record<string, string> = {
  slot_taken: 'Alguém acabou de ocupar esse lugar. Escolha outro.',
  already_placed: 'Você já deixou um enfeite nesta árvore.',
  own_tree: 'Você não pode enfeitar a própria árvore.',
  event_closed: 'O período para enfeitar esta árvore terminou.',
  not_authenticated: 'Entre na sua conta para enfeitar.',
  username_required: 'Escolha seu username antes de enfeitar.',
  invalid_message: 'Escreva uma mensagem de 1 a 500 caracteres.',
  tree_not_found: 'Essa árvore não existe mais.',
}
export const errText = (e: unknown): string => {
  const x = e as { message?: string; code?: string } | null
  return MESSAGES[x?.message ?? ''] ?? 'Algo deu errado. Tente de novo em instantes.'
}
export const isUnique = (e: unknown) => (e as { code?: string } | null)?.code === '23505'

const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
export const toProfile = (r: DbProfile): Profile => ({ id: r.id, username: r.username ?? '', name: r.display_name || r.username || 'Amigo', hue: hueOf(r.username ?? ''), photo: r.avatar_url ?? undefined })

export async function fetchEvent(): Promise<EventRow | null> {
  const { data, error } = await supabase.from('events').select('id,slug,name,starts_at,opens_at,ends_at').eq('slug', EVENT_SLUG).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchDbProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// Se a linha do perfil não existir (ex.: apagada), o banco recria a partir da conta.
export async function ensureProfile() {
  const { error } = await supabase.rpc('ensure_profile')
  if (error) throw error
}
export async function fetchProfileEnsured(userId: string): Promise<DbProfile | null> {
  const p = await fetchDbProfile(userId)
  if (p) return p
  await ensureProfile()
  return fetchDbProfile(userId)
}

export async function usernameTaken(username: string): Promise<boolean> {
  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('username', username)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function saveProfile(userId: string, patch: { username?: string; display_name?: string; avatar_url?: string }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

// A foto vira um JPG quadrado de 512 px antes de subir: resolve fotos grandes e formatos diferentes.
async function squareJpeg(file: File, size = 512): Promise<Blob> {
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) } catch { throw new Error('Não consegui ler essa imagem. Tente uma foto em JPG ou PNG.') }
  const side = Math.min(bmp.width, bmp.height)
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size)
  bmp.close()
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Não consegui preparar a imagem.'))), 'image/jpeg', 0.86))
}
const storageText = (m: string) =>
  /bucket not found/i.test(m) ? 'O armazenamento de fotos não existe no Supabase (rode o SQL do projeto).'
  : /row-level security|policy|unauthorized|not allowed/i.test(m) ? 'Sem permissão para enviar fotos (rode o SQL do projeto).'
  : `Falha no envio da foto: ${m}`

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 15_000_000) throw new Error('Escolha uma imagem de até 15 MB.')
  const blob = await squareJpeg(file)
  const path = `${userId}/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error(storageText(error.message))
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export async function createTree(userId: string, eventId: string, look: Look) {
  const { error } = await supabase.from('participations').insert({ user_id: userId, event_id: eventId, config: look })
  if (error) throw error
}

type CRow = { id: string; item_type: string; side: string; slot: number; sender: { username: string } | null }

// Perfil público + árvore + enfeites (com o username de quem enfeitou). Nunca traz mensagens.
export async function fetchPublic(username: string, eventId: string): Promise<{ owner: Profile; tree: TreeData | null } | null> {
  const { data: p, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('username', username).maybeSingle()
  if (error) throw error
  if (!p) return null
  const owner = toProfile(p as DbProfile)
  const { data: part, error: e2 } = await supabase.from('participations').select('id,config').eq('user_id', p.id).eq('event_id', eventId).maybeSingle()
  if (e2) throw e2
  if (!part) return { owner, tree: null }
  const { data: cs, error: e3 } = await supabase.from('contributions').select('id,item_type,side,slot,sender:profiles!contributions_sender_id_fkey(username)').eq('participation_id', part.id)
  if (e3) throw e3
  const cfg = part.config as Look
  const ornaments: Ornament[] = ((cs ?? []) as unknown as CRow[]).map((c) => ({ id: c.id, type: c.item_type as OrnamentType, side: c.side as Side, slot: c.slot, from: c.sender?.username ?? '?' }))
  return { owner, tree: { id: part.id, owner, model: cfg.model, lights: cfg.lights, topper: cfg.topper, scene: cfg.scene, ornaments } }
}

export async function searchTrees(q: string, eventId: string): Promise<TreeCard[]> {
  const prefix = q.toLowerCase().replace(/[^a-z0-9_]/g, '')
  const { data, error } = await supabase
    .from('participations')
    .select('id,config,profiles!inner(id,username,display_name,avatar_url),contributions(count)')
    .eq('event_id', eventId)
    .like('profiles.username', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(12)
  if (error) throw error
  return (data ?? []).map((r) => ({ id: r.id, owner: toProfile(r.profiles as unknown as DbProfile), look: r.config as Look, count: (r.contributions as unknown as { count: number }[])?.[0]?.count ?? 0 }))
}

export async function placeOrnament(...[participationId, type, message, side, slot]: Parameters<PlaceFn>): Promise<string | null> {
  const { error } = await supabase.rpc('add_ornament', { p_participation_id: participationId, p_item_type: type, p_message: message, p_side: side, p_slot: slot })
  return error ? errText(error) : null
}


type MsgRow = { body: string }
type MRow = { config: Look; events: { name: string; year: number }; contributions: { id: string; item_type: string; side: string; slot: number; sender: { username: string } | null; contribution_messages: MsgRow | MsgRow[] | null }[] }

// Memórias de quem está logado: árvores de edições já encerradas, com as mensagens que o dono já pode ler.
export async function fetchMemories(userId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('participations')
    .select('id,config,events!inner(name,year,ends_at),contributions(id,item_type,side,slot,sender:profiles!contributions_sender_id_fkey(username),contribution_messages(body))')
    .eq('user_id', userId)
    .lt('events.ends_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as MRow[]).map((r) => ({
    year: r.events.year, eventName: r.events.name, model: r.config.model, lights: r.config.lights, topper: r.config.topper, scene: r.config.scene,
    ornaments: r.contributions.map((c) => {
      const m = Array.isArray(c.contribution_messages) ? c.contribution_messages[0] : c.contribution_messages
      return { id: c.id, type: c.item_type as OrnamentType, side: c.side as Side, slot: c.slot, from: c.sender?.username ?? '?', message: m?.body }
    }),
  }))
}
