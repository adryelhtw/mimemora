import { supabase } from './supabase'
import { cardBlob } from '../components/ShareCard'
import type { LightsKey, Ornament, SceneKey, TopperKey, TreeModel } from '../types'

type CardArgs = { username: string; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }

// Gera a imagem da árvore (a mesma da prévia de compartilhamento) e publica no Storage.
// O link /u/username usa essa imagem na prévia do WhatsApp, X, Telegram etc. (ver api/og.js).
export async function publishCard(userId: string, args: CardArgs, previousUrl?: string | null) {
  const blob = await cardBlob(args, 'link')
  const path = `${userId}/card-${Date.now()}.png`
  const { error } = await supabase.storage.from('cards').upload(path, blob, { contentType: 'image/png', cacheControl: '31536000' })
  if (error) throw error
  const url = supabase.storage.from('cards').getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabase.from('profiles').update({ card_url: url }).eq('id', userId)
  if (e2) throw e2
  const old = previousUrl?.split('/cards/')[1]
  if (old) await supabase.storage.from('cards').remove([old.split('?')[0]])
}
