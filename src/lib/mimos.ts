import { supabase } from './supabase'
import type { Gift } from '../types'

export type CatalogItem = { id: string; kind: string; key: string; name: string; tier: 'inicial' | 'especial' | 'exclusivo'; price: number; event_kind: string | null; available_from: string | null; available_until: string | null; duration_days: number | null; description: string; sort: number; min_event_year: number | null }
export type OwnedItem = { item_id: string; expires_at: string | null }
export type LedgerRow = { id: number; amount: number; reason: string; created_at: string }
export type Prize = { id: number; label: string; kind: 'mimos' | 'item'; amount: number; rarity: 'comum' | 'incomum' | 'raro'; chance: number }
export type SpinResult = { prize_id: number; kind: 'mimos' | 'item'; amount: number; item_id: string | null; label: string; rarity: string; converted?: boolean; balance?: number }
export type RouletteStatus = { can_spin: boolean; next_at: string; last: SpinResult | null; prizes: Prize[] }
export type AchievementRow = { id: string; event_kind: string | null; name: string | null; description: string | null; icon: string; secret: boolean; unlocked: boolean; unlocked_at: string | null; progress: number | null; target: number | null; reward_mimos: number | null; featured_rank: number | null }
export type ReferralRow = { username: string; display_name: string | null; avatar_url: string | null; completed: boolean; created_at: string }
export type RewardRule = { code: string; amount: number; description: string }
export type LetterResult = { body: string; first_time?: boolean; revealed_at?: string | null }

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export async function fetchBalance(uid: string): Promise<number> {
  const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', uid).maybeSingle()
  if (error) throw error
  return data?.balance ?? 0
}
export async function fetchLedger(uid: string, limit = 20): Promise<LedgerRow[]> {
  const { data, error } = await supabase.from('ledger').select('id,amount,reason,created_at').eq('user_id', uid).order('id', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as LedgerRow[]
}
export async function fetchCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from('items').select('*').order('sort')
  if (error) throw error
  return (data ?? []) as CatalogItem[]
}
export async function fetchInventory(uid: string): Promise<OwnedItem[]> {
  const { data, error } = await supabase.from('user_items').select('item_id,expires_at').eq('user_id', uid)
  if (error) throw error
  const now = Date.now()
  return ((data ?? []) as OwnedItem[]).filter((o) => !o.expires_at || new Date(o.expires_at).getTime() > now)
}
export async function fetchRewardRules(): Promise<RewardRule[]> {
  const { data, error } = await supabase.from('reward_rules').select('code,amount,description').order('code')
  if (error) throw error
  return (data ?? []) as RewardRule[]
}

export const buyItem = (id: string) => rpc<{ item: string; expires_at: string | null }>('buy_item', { p_item: id })
export const equipItem = (kind: 'frame' | 'effect', key: string) => rpc<void>('equip_item', { p_kind: kind, p_key: key })
export const rouletteStatus = () => rpc<RouletteStatus>('roulette_status')
export const spinRoulette = () => rpc<SpinResult>('spin_roulette')
export const sendGift = (participationId: string, kind: 'brilho' | 'misterioso') => rpc<string>('send_gift', { p_participation_id: participationId, p_kind: kind })
export const openGift = (id: string) => rpc<{ item_id: string | null; name: string | null; mimos: number; converted?: boolean }>('open_gift', { p_gift: id })
export const claimReferral = (code: string) => rpc<boolean>('claim_referral', { p_code: code })
export const fetchReferrals = () => rpc<ReferralRow[]>('my_referrals')
export const fetchAchievements = () => rpc<AchievementRow[]>('my_achievements')
export const fetchPublicAchievements = (userId: string) => rpc<{ id: string; name: string; icon: string; unlocked_at: string }[]>('public_achievements', { p_user: userId })
export const markRevealSeen = (eventId: string) => rpc<void>('mark_reveal_seen', { p_event: eventId })

export async function fetchCosmetics(userId: string): Promise<{ frame: string | null; effect: string | null }> {
  const rows = await rpc<{ frame: string | null; effect: string | null }[]>('profile_cosmetics', { p_user: userId })
  return rows?.[0] ?? { frame: null, effect: null }
}

type GiftRow = { id: string; kind: 'brilho' | 'misterioso'; created_at: string; expires_at: string | null; opened_at: string | null; sender: { username: string } | null }
export async function fetchGifts(participationId: string): Promise<Gift[]> {
  const { data, error } = await supabase.from('gifts').select('id,kind,created_at,expires_at,opened_at,sender:profiles!gifts_sender_id_fkey(username)').eq('participation_id', participationId).order('created_at')
  if (error) throw error
  return ((data ?? []) as unknown as GiftRow[]).map((g) => ({ id: g.id, kind: g.kind, from: g.sender?.username ?? '', createdAt: g.created_at, expiresAt: g.expires_at, openedAt: g.opened_at }))
}

// Cartas: o texto nunca é lido direto da tabela. O dono abre pela função open_letter (registra a abertura) e os visitantes
// leem pela read_letter (não registra nada); as duas conferem permissão e datas no servidor.
export const openLetter = (id: string) => rpc<LetterResult>('open_letter', { p_contribution: id })
export const readLetter = (id: string) => rpc<LetterResult>('read_letter', { p_contribution: id })
export const setMemoryPublic = (participationId: string, isPublic: boolean) => rpc<void>('set_memory_visibility', { p_participation: participationId, p_public: isPublic })
// Cartas que o dono já abriu neste evento (só ele enxerga as próprias linhas).
export async function fetchOpenedIds(eventId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('ornament_opens').select('decoration_id').eq('event_id', eventId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.decoration_id as string))
}

export const fetchAchievementCount = (userId: string) => rpc<number>('achievement_count', { p_user: userId })
export const setFeaturedAchievements = (ids: string[]) => rpc<void>('set_featured_achievements', { p_ids: ids })
