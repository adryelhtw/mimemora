import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Memory, Ornament, Side } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { LetterModal } from '../components/LetterModal'
import { errText, fetchMemories } from '../lib/api'
import { orderOrnaments } from '../lib/letters'
import type { LetterData } from '../lib/letters'
import { openLetter, setMemoryPublic } from '../lib/mimos'
import { MemoryExtras } from '../components/MemoryExtras'

// Uma memória (somente leitura): a árvore com os enfeites; clicar abre a carta no modal. Nada é gravado depois do fim do evento.
function MemoryCard({ m, username }: { m: Memory; username: string }) {
  const [side, setSide] = useState<Side>('frente')
  const [idx, setIdx] = useState<number | null>(null)
  const [isPublic, setIsPublic] = useState(m.isPublic)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const list = useMemo(() => orderOrnaments(m.ornaments), [m.ornaments])
  const counts: Record<Side, number> = { frente: m.ornaments.filter((o) => o.side === 'frente').length, verso: m.ornaments.filter((o) => o.side === 'verso').length }
  const pick = (o: Ornament) => { const i = list.findIndex((x) => x.id === o.id); if (i >= 0) setIdx(i) }
  const goTo = (i: number) => { setIdx(i); const o = list[i]; if (o) setSide(o.side) }
  const load = async (o: Ornament): Promise<LetterData> => { const r = await openLetter(o.id); return { body: r.body, first: !!r.first_time } }

  const toggle = async () => {
    if (busy) return
    const next = !isPublic
    setBusy(true); setErr('')
    try { await setMemoryPublic(m.participationId, next); setIsPublic(next) } catch (e) { setErr(errText(e)) }
    setBusy(false)
  }

  return (
    <article className="card space-y-3 p-4">
      <div className="text-center">
        <p className="font-display text-2xl text-gold">{m.eventName ?? `Natal ${m.year}`}</p>
        <p className="text-sm text-cream/70">{m.ornaments.length} {m.ornaments.length === 1 ? 'enfeite recebido' : 'enfeites recebidos'}{m.ornaments.length > 0 && ' · toque nos enfeites para ler'}</p>
      </div>
      <TreeFlip side={side} model={m.model} lights={m.lights} topper={m.topper} scene={m.scene} backdrop ornaments={m.ornaments} animated={false} onPick={pick} hint className="mx-auto w-full max-w-[320px]" />
      <SideSwitch side={side} onSide={setSide} counts={counts} />

      <div className="rounded-xl bg-black/20 p-3 text-left text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>
            <b>{isPublic ? 'Memória pública' : 'Memória privada'}</b><br />
            <span className="text-cream/70">{isPublic ? 'Seus amigos podem ver esta árvore e ler as mensagens.' : 'Só você pode ver esta árvore e ler as mensagens.'}</span>
          </span>
          <button role="switch" aria-checked={isPublic} aria-label="Tornar esta memória pública" onClick={toggle} disabled={busy}
            className={`relative h-7 w-12 shrink-0 rounded-full border border-white/20 transition ${isPublic ? 'bg-gold/70' : 'bg-white/10'} disabled:opacity-60`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-all ${isPublic ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>
        {isPublic && username && <Link to={`/u/${username}/${m.eventSlug}`} className="mt-2 inline-block font-bold text-gold">ver como seus amigos veem →</Link>}
        {err && <p className="mt-2 font-bold text-gold" role="alert">{err}</p>}
      </div>
      <MemoryExtras participationId={m.participationId} isOwner />
      <LetterModal list={list} index={idx} onIndex={goTo} onClose={() => setIdx(null)} load={load} />
    </article>
  )
}

// Memórias de cada pessoa: as próprias árvores de edições encerradas, em modo somente leitura. Cada memória tem a sua visibilidade (padrão: privada).
export function Memories({ userId, username }: { userId: string; username: string }) {
  const [list, setList] = useState<Memory[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    fetchMemories(userId).then((r) => alive && setList(r)).catch(() => alive && setErr('Não consegui carregar suas memórias agora.'))
    return () => { alive = false }
  }, [userId])

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Memórias</h1>
      <p className="text-cream/70">As suas árvores de edições anteriores, com as mensagens que você já pode ler. Por padrão, cada memória é privada.</p>
      {err && <p className="text-sm font-bold text-gold" role="alert">{err}</p>}
      {!list && !err && <p className="text-cream/70">Carregando…</p>}
      {list && !list.length && (
        <div className="card p-8 text-center">
          <Tree model="classica" animated={false} base={false} className="mx-auto mb-3 h-24 opacity-60" />
          <p className="font-display text-lg">Suas memórias vão aparecer aqui</p>
          <p className="text-sm text-cream/70">Você ainda não tem memórias guardadas. As árvores, os enfeites, os presentes e as mensagens das edições que você participou ficam aqui depois que o evento termina.</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {list?.map((m) => <MemoryCard key={m.participationId} m={m} username={username} />)}
      </div>
    </section>
  )
}
