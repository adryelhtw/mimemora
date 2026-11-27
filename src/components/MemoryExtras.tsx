import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GlowGiver, MemoryGift } from '../lib/mimos'
import { fetchGlowGivers, fetchMemoryGifts, openGift } from '../lib/mimos'
import { errText, toProfile } from '../lib/api'
import { useMimos } from '../lib/mimosContext'
import { Avatar } from './ui'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
const KIND = { brilho: 'Brilho Mágico', misterioso: 'Presente Misterioso' }

// Seções extras de uma memória: "Presentes recebidos" e "Quem iluminou esta árvore?".
// Tudo vem do banco (funções memory_gifts / memory_glow_givers), que só devolvem linhas se a memória puder ser vista por quem pede.
export function MemoryExtras({ participationId, isOwner }: { participationId: string; isOwner: boolean }) {
  const { refresh } = useMimos()
  const [gifts, setGifts] = useState<MemoryGift[] | null>(null)
  const [givers, setGivers] = useState<GlowGiver[] | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [won, setWon] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [g, b] = await Promise.all([fetchMemoryGifts(participationId), fetchGlowGivers(participationId)])
      setGifts(g); setGivers(b); setErr('')
    } catch { setErr('Não consegui carregar os presentes agora.') }
  }, [participationId])
  useEffect(() => { load() }, [load])

  // Presente que ficou fechado: o dono ainda pode abrir depois do fim do evento (o servidor confere dono, data e abertura única).
  const open = async (g: MemoryGift) => {
    if (busy) return
    setBusy(g.id); setErr('')
    try {
      const r = await openGift(g.id)
      const text = r.item_id ? `Você ganhou: ${r.name}` : `Você ganhou ${r.mimos} mimos${r.converted ? ' (você já tinha o item, então os mimos vieram no lugar)' : ''}`
      setWon((w) => ({ ...w, [g.id]: text }))
      await load(); await refresh(true)
    } catch (e) { setErr(errText(e)) }
    setBusy('')
  }

  const boxes = (gifts ?? []).filter((g) => g.kind === 'misterioso')
  const glows = (gifts ?? []).filter((g) => g.kind === 'brilho')
  const list = [...boxes, ...glows]

  return (
    <div className="space-y-3 text-left">
      {err && <p className="text-sm font-bold text-gold" role="alert">{err}</p>}

      <div className="rounded-xl bg-black/20 p-3">
        <h3 className="font-display text-lg text-gold">Presentes recebidos</h3>
        {!gifts && !err && <p className="text-sm text-cream/70">Carregando…</p>}
        {gifts && !list.length && <p className="text-sm text-cream/70">Nenhum presente chegou a esta árvore.</p>}
        <ul className="mt-1 space-y-2">
          {list.map((g) => (
            <li key={g.id} className="card p-3 text-sm">
              <b>{KIND[g.kind]}</b> de <Link to={`/u/${g.sender}`} className="font-bold text-gold">@{g.sender}</Link>
              <span className="block text-xs text-cream/65">{fmt(g.createdAt)}</span>
              {g.kind === 'misterioso' && g.openedAt && (
                <span className="mt-1 block text-cream/85">
                  Aberto em {fmt(g.openedAt)}
                  {g.isOwner && (g.rewardLabel ? ` · você ganhou: ${g.rewardLabel}` : g.rewardMimos ? ` · você ganhou ${g.rewardMimos} mimos` : '')}
                </span>
              )}
              {g.kind === 'misterioso' && !g.openedAt && (g.isOwner
                ? <button onClick={() => open(g)} disabled={busy === g.id} className="pill mt-2 disabled:opacity-60">{busy === g.id ? 'Abrindo…' : 'Abrir presente'}</button>
                : <span className="mt-1 block text-cream/70">Ainda fechado.</span>)}
              {won[g.id] && <span className="mt-1 block font-bold text-gold" role="status">{won[g.id]}</span>}
              {g.kind === 'brilho' && <span className="mt-1 block text-cream/70">Iluminou a árvore por 3 dias.</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-black/20 p-3">
        <h3 className="font-display text-lg text-gold">Quem iluminou esta árvore?</h3>
        {givers && !givers.length && <p className="text-sm text-cream/70">{isOwner ? 'Ninguém enviou Brilho Mágico para a sua árvore.' : 'Ninguém enviou Brilho Mágico para esta árvore.'}</p>}
        <ul className="mt-1 space-y-2">
          {(givers ?? []).map((u) => (
            <li key={u.username} className="flex items-center gap-3">
              <Avatar p={toProfile({ id: '', username: u.username, display_name: u.displayName, avatar_url: u.avatarUrl })} size={36} />
              <span className="min-w-0 flex-1 text-sm">
                <Link to={`/u/${u.username}`} className="font-bold text-gold">@{u.username}</Link>
                <span className="block text-xs text-cream/65">{u.total} {u.total === 1 ? 'Brilho Mágico' : 'Brilhos Mágicos'} · último em {fmt(u.lastAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
