import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Profile, TreeData } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { DecorateSheet } from '../components/DecorateSheet'
import { Avatar } from '../components/ui'
import { errText, fetchFollowing, fetchPublic, searchProfiles, setFollow } from '../lib/api'
import type { FollowCard, PersonRow, PlaceFn } from '../lib/api'

type Props = { me: Profile; eventId: string; onPlace: PlaceFn; onNotify: (m: string) => void }

export function Decorate({ me, eventId, onPlace, onNotify }: Props) {
  const myId = me.id ?? ''
  const [q, setQ] = useState('')
  const [found, setFound] = useState<PersonRow[] | null>(null)
  const [cards, setCards] = useState<FollowCard[] | null>(null)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<TreeData | null>(null)

  const loadFollowing = useCallback(() => fetchFollowing(myId, eventId).then(setCards).catch(() => setError('Não consegui carregar quem você segue.')), [myId, eventId])
  useEffect(() => { loadFollowing() }, [loadFollowing])

  useEffect(() => {
    if (!q.trim()) { setFound(null); return }
    let alive = true
    const t = setTimeout(() => { searchProfiles(q, myId).then((r) => { if (alive) { setFound(r); setError('') } }).catch(() => { if (alive) setError('Não consegui buscar agora.') }) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [q, myId])

  const toggle = async (row: PersonRow) => {
    const next = !row.following
    try {
      await setFollow(myId, row.profile.id ?? '', next)
      setFound((f) => f && f.map((x) => (x.profile.id === row.profile.id ? { ...x, following: next } : x)))
      loadFollowing()
      onNotify(next ? `Agora você segue @${row.profile.username}.` : `Você deixou de seguir @${row.profile.username}.`)
    } catch (e) { onNotify(errText(e)) }
  }

  const open = async (username: string) => {
    try { const r = await fetchPublic(username, eventId); if (r?.tree) setTarget(r.tree) } catch { setError('Não consegui abrir essa árvore.') }
  }
  const place = async (type: Parameters<PlaceFn>[1], msg: string, side: Parameters<PlaceFn>[3], slot: number) => {
    if (!target?.id) return 'Essa árvore não existe mais.'
    const e = await onPlace(target.id, type, msg, side, slot)
    const fresh = await fetchPublic(target.owner.username, eventId).catch(() => null)   // atualiza posições ocupadas
    if (fresh?.tree) setTarget(fresh.tree)
    loadFollowing()                                                                     // o botão vira "Já enfeitou"
    return e
  }

  return (
    <section className="space-y-6">
      <div><h1 className="font-display text-3xl">Enfeitar amigos</h1><p className="font-hand text-xl text-cream/70">Busque alguém, siga e pendure um enfeite com um segredo.</p></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoas por @username" className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3" />
      {error && <p className="text-sm font-bold text-gold" role="alert">{error}</p>}

      {found && (
        <div className="space-y-2">
          <h2 className="font-display text-lg">Resultados da busca</h2>
          {!found.length && <p className="text-sm text-cream/70">Ninguém com “@{q.replace('@', '')}” por aqui.</p>}
          {found.map((r) => (
            <div key={r.profile.id} className="card flex items-center gap-3 p-3">
              <Link to={`/u/${r.profile.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline"><Avatar p={r.profile} size={40} /><span className="min-w-0"><b className="block truncate">{r.profile.name}</b><span className="text-sm text-cream/70">@{r.profile.username}</span></span></Link>
              <button onClick={() => toggle(r)} className={r.following ? 'rounded-full border border-gold/60 px-4 py-1.5 text-sm font-bold text-gold' : 'pill'}>{r.following ? 'seguindo ✓' : 'seguir'}</button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg">Quem você segue</h2>
        {cards && !cards.length && (
          <div className="card p-8 text-center">
            <Tree model="classica" animated={false} base={false} className="mx-auto mb-3 h-24 opacity-60" />
            <p className="font-display text-lg">Você ainda não segue ninguém</p>
            <p className="text-sm text-cream/70">Use a busca acima, encontre um @username e toque em seguir. As árvores de quem você segue aparecem aqui.</p>
          </div>
        )}
        {!cards && !error && <p className="text-cream/70">Carregando…</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {cards?.map((c) => (
            <div key={c.owner.id} className="card flex items-center gap-3 p-3">
              {c.look
                ? <Tree model={c.look.model} lights={c.look.lights} topper={c.look.topper} scene={c.look.scene} animated={false} base={false} tags={false} className="h-28 w-24 shrink-0" />
                : <div className="grid h-28 w-24 shrink-0 place-items-center rounded-xl bg-white/5 text-center text-[11px] text-cream/50">sem árvore ainda</div>}
              <div className="min-w-0 flex-1">
                <Link to={`/u/${c.owner.username}`} className="flex items-center gap-2 hover:underline"><Avatar p={c.owner} size={28} /><b className="truncate">@{c.owner.username}</b></Link>
                <p className="my-1 text-sm text-cream/70">{c.participationId ? `${c.count} ${c.count === 1 ? 'enfeite' : 'enfeites'}` : 'ainda não criou a árvore'}</p>
                {c.participationId && <button disabled={c.decorated} onClick={() => open(c.owner.username)} className="pill disabled:opacity-60">{c.decorated ? 'Já enfeitou' : 'Enfeitar'}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <DecorateSheet target={target} me={me} onClose={() => setTarget(null)} onPlace={place} />
    </section>
  )
}
