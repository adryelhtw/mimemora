import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { upcoming } from '../mocks/data'
import type { Profile, TreeData } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { Countdown } from '../events/natal-2026/Countdown'
import { Avatar } from '../components/ui'
import { errText, searchProfiles, setFollow } from '../lib/api'
import type { PersonRow } from '../lib/api'

// Vitrine "Em breve" (aparece antes e depois do encerramento do Natal 2026).
function UpcomingEvents() {
  return (
    <>
      <h2 className="font-display text-xl">Em breve</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {upcoming.map((e) => (
          <article key={e.slug} className="rounded-3xl p-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]" style={{ background: `linear-gradient(180deg, rgba(6,15,35,.25) 0%, rgba(6,15,35,.9) 55%), linear-gradient(135deg,${e.from},${e.to})` }}>
            <div className="text-3xl" aria-hidden="true">{e.emoji}</div>
            <h3 className="font-display text-lg leading-tight">{e.name}</h3>
            <p className="text-xs font-bold text-gold">{e.when}</p>
            <p className="mt-2 text-sm text-cream">{e.blurb}</p>
          </article>
        ))}
      </div>
    </>
  )
}

// Buscar pessoas por @username e seguir (era da aba Enfeitar, que fecha em 25/12). Só segue/deixa de seguir: nada de enfeites.
function PeopleSearch({ me, onNotify }: { me?: Profile | null; onNotify?: (m: string) => void }) {
  const myId = me?.id ?? ''
  const [q, setQ] = useState('')
  const [found, setFound] = useState<PersonRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!myId || !q.trim()) { setFound(null); return }
    let alive = true
    const t = setTimeout(() => { searchProfiles(q, myId).then((r) => { if (alive) { setFound(r); setError('') } }).catch(() => { if (alive) setError('Não consegui buscar agora.') }) }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [q, myId])

  const toggle = async (row: PersonRow) => {
    const next = !row.following
    try {
      await setFollow(myId, row.profile.id ?? '', next)
      setFound((f) => f && f.map((x) => (x.profile.id === row.profile.id ? { ...x, following: next } : x)))
      onNotify?.(next ? `Agora você segue @${row.profile.username}.` : `Você deixou de seguir @${row.profile.username}.`)
    } catch (e) { onNotify?.(errText(e)) }
  }

  if (!myId) {
    return <p className="card p-4 text-center text-sm text-cream/80"><Link to="/entrar" className="font-bold text-gold underline">Entre na sua conta</Link> para buscar pessoas.</p>
  }

  return (
    <div className="space-y-3">
      <div><h2 className="font-display text-xl">Buscar pessoas</h2><p className="font-hand text-xl text-cream/70">Encontre alguém pelo @username e toque em seguir.</p></div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoas por @username" aria-label="Buscar pessoas por @username" className="w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3" />
      {error && <p className="text-sm font-bold text-gold" role="alert">{error}</p>}
      {found && (
        <div className="space-y-2">
          {!found.length && <p className="text-sm text-cream/70">Ninguém com “@{q.replace('@', '')}” por aqui.</p>}
          {found.map((r) => (
            <div key={r.profile.id} className="card flex items-center gap-3 p-3">
              <Link to={`/u/${r.profile.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline"><Avatar p={r.profile} size={40} /><span className="min-w-0"><b className="block truncate">{r.profile.name}</b><span className="text-sm text-cream/70">@{r.profile.username}</span></span></Link>
              <button onClick={() => toggle(r)} className={r.following ? 'rounded-full border border-gold/60 px-4 py-1.5 text-sm font-bold text-gold' : 'pill'}>{r.following ? 'seguindo ✓' : 'seguir'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type Props = { tree: TreeData | null; ended?: boolean; me?: Profile | null; onNotify?: (m: string) => void }

export function Events({ tree, ended = false, me, onNotify }: Props) {
  // Depois do encerramento: o Natal 2026 aparece como concluído, a busca de pessoas passa para cá e a vitrine "Em breve" continua.
  if (ended) {
    return (
      <section className="space-y-5">
        <h1 className="font-display text-3xl">Eventos</h1>
        <article className="card overflow-hidden p-5">
          <span className="pill">Concluído</span>
          <div className="mt-3 grid items-center gap-4 sm:grid-cols-[140px_1fr]">
            <Tree model="classica" animated={false} base={false} className="mx-auto h-40 opacity-60" />
            <div className="space-y-3">
              <h2 className="font-display text-2xl">Natal 2026</h2>
              <p className="text-cream/80">O Natal 2026 chegou ao fim. As árvores, os enfeites e as mensagens ficam guardados nas Memórias.</p>
              <Link to="/memorias" className="inline-block font-bold text-gold">Reviver nas Memórias →</Link>
            </div>
          </div>
        </article>
        <PeopleSearch me={me} onNotify={onNotify} />
        <UpcomingEvents />
      </section>
    )
  }
  if (!tree) return null
  return (
    <section className="space-y-5">
      <h1 className="font-display text-3xl">Eventos</h1>
      <article className="card overflow-hidden p-5" style={{ background: 'linear-gradient(135deg,rgba(31,112,72,.45),rgba(201,23,47,.3))' }}>
        <span className="pill">Acontecendo agora</span>
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[140px_1fr]">
          <Tree model={tree.model} lights={tree.lights} topper={tree.topper} scene={tree.scene} base={false} className="mx-auto h-40" />
          <div className="space-y-3">
            <h2 className="font-display text-2xl">Natal 2026</h2>
            <p className="text-cream/80">Monte sua árvore, receba enfeites com mensagens secretas e abra tudo no dia 25.</p>
            <Countdown compact />
            <Link to="/" className="inline-block font-bold text-gold">Ir para minha árvore →</Link>
          </div>
        </div>
      </article>
      <UpcomingEvents />
      <Link to="/memorias" className="inline-block font-bold text-gold">Ver eventos passados nas Memórias →</Link>
    </section>
  )
}
