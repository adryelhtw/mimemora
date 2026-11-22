import { useEffect, useState } from 'react'
import type { Profile, TreeData } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { DecorateSheet } from '../components/DecorateSheet'
import { Avatar } from '../components/ui'
import { fetchPublic, searchTrees } from '../lib/api'
import type { PlaceFn, TreeCard } from '../lib/api'

type Props = { me: Profile; eventId: string; onPlace: PlaceFn }

export function Decorate({ me, eventId, onPlace }: Props) {
  const [q, setQ] = useState('')
  const [cards, setCards] = useState<TreeCard[] | null>(null)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<TreeData | null>(null)

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      searchTrees(q, eventId).then((r) => { if (alive) { setCards(r); setError('') } }).catch(() => { if (alive) setError('Não consegui carregar as árvores agora.') })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [q, eventId])

  const open = async (username: string) => {
    try { const r = await fetchPublic(username, eventId); if (r?.tree) setTarget(r.tree) } catch { setError('Não consegui abrir essa árvore.') }
  }
  const place = async (type: Parameters<PlaceFn>[1], msg: string, side: Parameters<PlaceFn>[3], slot: number) => {
    if (!target?.id) return 'Essa árvore não existe mais.'
    const e = await onPlace(target.id, type, msg, side, slot)
    const fresh = await fetchPublic(target.owner.username, eventId).catch(() => null)   // atualiza posições ocupadas
    if (fresh?.tree) setTarget(fresh.tree)
    return e
  }

  return (
    <section className="space-y-4">
      <div><h1 className="font-display text-3xl">Enfeitar amigos</h1><p className="font-hand text-xl text-cream/70">Escolha uma árvore, pendure um enfeite e deixe um segredo.</p></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por @username" className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3" />
      {error && <p className="text-sm font-bold text-gold" role="alert">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards?.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-3">
            <Tree model={c.look.model} lights={c.look.lights} topper={c.look.topper} scene={c.look.scene} animated={false} base={false} tags={false} className="h-28 w-24 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><Avatar p={c.owner} size={28} /><b className="truncate">@{c.owner.username}</b></div>
              <p className="my-1 text-sm text-cream/70">{c.count} {c.count === 1 ? 'enfeite' : 'enfeites'}</p>
              <button disabled={c.owner.username === me.username} onClick={() => open(c.owner.username)} className="pill disabled:opacity-50">{c.owner.username === me.username ? 'Sua árvore' : 'Enfeitar'}</button>
            </div>
          </div>
        ))}
        {cards && !cards.length && (
          <div className="card col-span-full p-8 text-center">
            <Tree model="classica" animated={false} base={false} className="mx-auto mb-3 h-24 opacity-60" />
            <p className="font-display text-lg">{q ? `Nenhuma árvore com “@${q.replace('@', '')}” por aqui` : 'Ainda não há árvores por aqui'}</p>
            <p className="text-sm text-cream/70">Convide seus amigos para criarem a árvore deles.</p>
          </div>
        )}
        {!cards && !error && <p className="text-cream/70">Carregando…</p>}
      </div>
      <DecorateSheet target={target} me={me} onClose={() => setTarget(null)} onPlace={place} />
    </section>
  )
}
