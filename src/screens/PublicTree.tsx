import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Profile, Side, TreeData } from '../types'
import { SIDE_CAP } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { Countdown } from '../events/natal-2026/Countdown'
import { DecorateSheet } from '../components/DecorateSheet'
import { Avatar } from '../components/ui'
import { fetchPublic } from '../lib/api'
import type { PlaceFn } from '../lib/api'

type State = { s: 'loading' } | { s: 'notfound' } | { s: 'notree'; owner: Profile } | { s: 'ok'; tree: TreeData }
type Props = { me: Profile | null; eventId: string; onPlace: PlaceFn }

// Página pública /u/:username. Mostra a árvore e os enfeites; as mensagens nunca chegam aqui.
export function PublicTree({ me, eventId, onPlace }: Props) {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [st, setSt] = useState<State>({ s: 'loading' })
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<Side>('frente')

  const load = useCallback(async () => {
    try {
      const r = await fetchPublic(username.toLowerCase(), eventId)
      setSt(!r ? { s: 'notfound' } : r.tree ? { s: 'ok', tree: r.tree } : { s: 'notree', owner: r.owner })
    } catch { setSt({ s: 'notfound' }) }
  }, [username, eventId])

  useEffect(() => { setSt({ s: 'loading' }); load() }, [load])
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [load])

  if (st.s === 'loading') return <p className="py-20 text-center text-cream/70">Carregando a árvore…</p>
  if (st.s === 'notfound') return <p className="py-20 text-center text-cream/70">Não encontramos esse usuário. <Link to="/" className="text-gold">Voltar</Link></p>
  if (st.s === 'notree') return <p className="py-20 text-center text-cream/70">@{st.owner.username} ainda não criou a árvore de Natal. <Link to="/" className="text-gold">Voltar</Link></p>

  const t = st.tree
  const mine = !!me && t.owner.username === me.username
  const done = !!me && t.ornaments.some((o) => o.from === me.username)
  const counts: Record<Side, number> = { frente: t.ornaments.filter((o) => o.side === 'frente').length, verso: t.ornaments.filter((o) => o.side === 'verso').length }
  const full = counts.frente + counts.verso >= SIDE_CAP * 2
  const place = async (...a: [Parameters<PlaceFn>[1], string, Side, number]) => {
    const e = await onPlace(t.id ?? '', ...a)
    await load()   // atualiza as posições ocupadas (e mostra o novo enfeite)
    return e
  }
  return (
    <section className="mx-auto max-w-md space-y-5 text-center">
      <div className="flex flex-col items-center gap-1">
        <Avatar p={t.owner} size={44} />
        <p className="font-display text-sm uppercase tracking-[.3em] text-gold">Natal 2026</p>
        <h1 className="font-display text-3xl">Árvore de @{t.owner.username}</h1>
      </div>
      <div className="relative"><div className="glow" /><TreeFlip side={side} model={t.model} lights={t.lights} topper={t.topper} scene={t.scene} backdrop ornaments={t.ornaments} className="relative mx-auto w-full max-w-[380px]" /></div>
      <SideSwitch side={side} onSide={setSide} counts={counts} />
      <Countdown compact />
      {!mine && !me && <button className="cta" onClick={() => navigate(`/entrar?next=${encodeURIComponent(pathname)}`)}>Entrar para deixar um enfeite</button>}
      {!mine && me && <button className="cta disabled:opacity-50" disabled={done || full} onClick={() => setOpen(true)}>{done ? 'Você já deixou seu enfeite ✓' : full ? 'Esta árvore já está cheia' : 'Deixar um enfeite'}</button>}
      {me && <DecorateSheet target={open ? t : null} me={me} onClose={() => setOpen(false)} onPlace={place} />}
    </section>
  )
}
