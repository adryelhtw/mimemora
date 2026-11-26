import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Gift, Side, TreeData } from '../types'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { Countdown } from '../events/natal-2026/Countdown'
import { errText } from '../lib/api'
import type { EventRow } from '../lib/api'
import { nowMs } from '../lib/clock'
import { useMimos } from '../lib/mimosContext'
import { fetchLetters, markRevealSeen, openGift } from '../lib/mimos'
import type { Letter } from '../lib/mimos'

// Revelação (fase 4): as cartas e os presentes só existem para o dono depois de opens_at, e o servidor confere a data
// (as cartas vêm protegidas pelo banco; o presente é sorteado só na hora de abrir).
export function Reveal({ tree, event, onNotify }: { tree: TreeData; event: EventRow; onNotify: (m: string) => void }) {
  const { refresh } = useMimos()
  const open = nowMs() >= new Date(event.opens_at).getTime()
  const [letters, setLetters] = useState<Letter[] | null>(null)
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [gifts, setGifts] = useState<Gift[]>((tree.gifts ?? []).filter((g) => g.kind === 'misterioso'))
  const [won, setWon] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open || !tree.id) return
    fetchLetters(tree.id).then(setLetters).catch(() => setErr('Não consegui carregar as cartas agora.'))
  }, [open, tree.id])

  if (!open) return (
    <section className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="font-display text-3xl">Revelação</h1>
      <p className="text-cream/80">As cartas e os presentes da sua árvore abrem em 25/12, à meia-noite. Até lá, tudo segue em segredo.</p>
      <Countdown />
      <Link to="/" className="inline-block font-bold text-gold">← voltar para a árvore</Link>
    </section>
  )

  const open1 = (id: string) => setSeen((s) => new Set(s).add(id))
  const bySide = (s: Side) => (letters ?? []).filter((l) => l.side === s)
  const closed = (s: Side) => bySide(s).filter((l) => !seen.has(l.id)).length
  const allRead = !!letters && letters.every((l) => seen.has(l.id))

  const unwrap = async (g: Gift) => {
    try {
      const r = await openGift(g.id)
      setWon((w) => ({ ...w, [g.id]: r.name ?? `${r.mimos} mimos` }))
      setGifts((gs) => gs.map((x) => (x.id === g.id ? { ...x, openedAt: new Date().toISOString() } : x)))
      refresh()
    } catch (e) { setErr(errText(e)) }
  }
  const finish = async () => {
    try { await markRevealSeen(event.id); setDone(true); refresh(); onNotify('Revelação concluída! Suas conquistas foram atualizadas.') }
    catch (e) { setErr(errText(e)) }
  }

  const letterCard = (l: Letter) => seen.has(l.id) ? (
    <div key={l.id} className="letter-open card flex gap-3 p-3 text-left text-sm">
      <OrnamentIcon type={l.type} className="h-12 w-10 shrink-0" />
      <span><b>{l.from ? `@${l.from}` : 'alguém (oculto)'}</b><br />{l.message ?? 'Mensagem indisponível.'}</span>
    </div>
  ) : (
    <button key={l.id} onClick={() => open1(l.id)} className="card flex items-center gap-3 p-3 text-left">
      <OrnamentIcon type={l.type} className="h-12 w-10 shrink-0" />
      <span className="text-sm"><b>carta de {l.from ? `@${l.from}` : 'alguém'}</b><br /><span className="text-gold">toque para abrir</span></span>
    </button>
  )

  return (
    <section className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <p className="font-hand text-2xl leading-none text-gold">chegou o dia!</p>
        <h1 className="font-display text-3xl">Revelação</h1>
        <p className="text-sm text-cream/70">{letters ? `${letters.length} ${letters.length === 1 ? 'carta' : 'cartas'} esperando por você` : 'Carregando…'}</p>
      </div>
      {err && <p className="text-center text-sm font-bold text-gold" role="alert">{err}</p>}

      {(['frente', 'verso'] as Side[]).map((s) => bySide(s).length > 0 && (
        <div key={s} className="space-y-2">
          <h2 className="font-display text-lg">{s === 'frente' ? 'Na frente da árvore' : 'No verso da árvore'} <span className="text-sm text-cream/60">· {bySide(s).length}</span></h2>
          {s === 'verso' && closed('verso') > 0 && <p className="text-xs text-gold">Não esqueça o verso: {closed('verso')} {closed('verso') === 1 ? 'carta ainda fechada' : 'cartas ainda fechadas'}.</p>}
          {bySide(s).map(letterCard)}
        </div>
      ))}
      {letters && !letters.length && <p className="card p-6 text-center text-cream/70">Ninguém deixou enfeites nesta edição.</p>}

      {gifts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg">Presentes misteriosos</h2>
          {gifts.map((g) => (
            <div key={g.id} className="card flex items-center justify-between gap-3 p-3 text-sm">
              <span>de <b>{g.from ? `@${g.from}` : 'alguém'}</b>{(g.openedAt || won[g.id]) && <span className="block text-gold">você ganhou: {won[g.id] ?? 'um item exclusivo (veja em Loja → meus itens)'}</span>}</span>
              {!g.openedAt && <button className="pill" onClick={() => unwrap(g)}>abrir presente</button>}
            </div>
          ))}
        </div>
      )}

      {done
        ? <p className="card p-4 text-center text-gold">Revelação concluída. <Link to="/conquistas" className="underline">Ver conquistas</Link></p>
        : <button className="cta disabled:opacity-50" disabled={!allRead} onClick={finish}>{allRead ? 'Concluir revelação' : 'Abra todas as cartas para concluir'}</button>}
    </section>
  )
}
