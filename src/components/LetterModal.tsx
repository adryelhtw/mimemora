import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TouchEvent } from 'react'
import type { Ornament } from '../types'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { errText } from '../lib/api'
import type { LetterData } from '../lib/letters'
import { Icon } from './Icons'

type Phase = 'loading' | 'closed' | 'flap' | 'paper' | 'text' | 'error'
type Props = {
  list: Ornament[]                                  // enfeites na ordem de navegação
  index: number | null                              // null = fechado
  onIndex: (i: number) => void                      // anterior/próximo (a página pode virar a árvore para o lado certo)
  onClose: () => void
  load: (o: Ornament) => Promise<LetterData>        // dono: open_letter · visitante/memória: read_letter / open_letter
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Janela sobreposta à árvore (mesma página, mesma rota). Primeira abertura = animação completa; depois, abertura simples.
export function LetterModal({ list, index, onIndex, onClose, load }: Props) {
  const cur = index === null ? null : list[index] ?? null
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<LetterData | null>(null)
  const [full, setFull] = useState(false)
  const [err, setErr] = useState('')
  const loadRef = useRef(load)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const curId = cur?.id

  useEffect(() => { loadRef.current = load })

  useEffect(() => {
    if (!cur) return
    let alive = true
    const timers: number[] = []
    setData(null); setErr(''); setFull(false); setPhase('loading')
    loadRef.current(cur).then((d) => {
      if (!alive) return
      setData(d)
      if (d.first && !reduced()) {
        setFull(true)
        setPhase('closed')
        timers.push(window.setTimeout(() => alive && setPhase('flap'), 500))
        timers.push(window.setTimeout(() => alive && setPhase('paper'), 1150))
        timers.push(window.setTimeout(() => alive && setPhase('text'), 1950))
      } else setPhase('text')
    }).catch((e) => { if (alive) { setErr(errText(e)); setPhase('error') } })
    return () => { alive = false; timers.forEach((t) => window.clearTimeout(t)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curId])

  const prev = index !== null && index > 0 ? index - 1 : null
  const next = index !== null && index < list.length - 1 ? index + 1 : null
  const open = index !== null

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && prev !== null) onIndex(prev)
      else if (e.key === 'ArrowRight' && next !== null) onIndex(next)
    }
    window.addEventListener('keydown', k)
    const was = document.body.style.overflow
    document.body.style.overflow = 'hidden'   // a página atrás não rola: ao fechar, a árvore está exatamente onde estava
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = was }
  }, [open, prev, next, onClose, onIndex])

  if (!cur || index === null) return null

  const from = cur.from ? `@${cur.from}` : 'alguém'
  const onStart = (e: TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onEnd = (e: TouchEvent) => {
    const s = touch.current; touch.current = null
    if (!s) return
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0 && next !== null) onIndex(next)
    else if (dx > 0 && prev !== null) onIndex(prev)
  }
  const skip = () => { if (phase === 'closed' || phase === 'flap' || phase === 'paper') setPhase('text') }
  const envelope = phase === 'loading' || phase === 'closed' || phase === 'flap' || phase === 'paper'

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Carta de ${from}`}>
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" tabIndex={-1} />
      <div className="sheet relative flex max-h-[88dvh] w-full max-w-sm flex-col rounded-3xl border border-white/10 bg-night-2 p-4 shadow-2xl" onTouchStart={onStart} onTouchEnd={onEnd}>
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <OrnamentIcon type={cur.type} className="h-10 w-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-bold">{from}</p>
              <p className="text-xs text-cream/60">{cur.side === 'verso' ? 'no verso da árvore' : 'na frente da árvore'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar carta" autoFocus className="rounded-full p-2 hover:bg-white/10"><Icon name="close" /></button>
        </header>

        <div className="min-h-[250px] flex-1 overflow-y-auto py-3" aria-live="polite">
          {phase === 'error' && <p className="py-16 text-center text-sm font-bold text-gold" role="alert">{err}</p>}
          {envelope && (
            <div className={`env ${phase === 'flap' || phase === 'paper' ? 'is-open' : ''} ${phase === 'paper' ? 'is-rise' : ''} ${phase === 'loading' ? 'is-wait' : ''}`} onClick={skip} role="presentation">
              <div className="env-back" /><div className="env-paper" /><div className="env-front" /><div className="env-flap" />
            </div>
          )}
          {envelope && full && <p className="text-center text-xs text-cream/50">toque para pular</p>}
          {phase === 'text' && data && (
            <article key={cur.id} className={`letter-card rounded-2xl bg-[#fbf3e4] p-5 text-[#3a2a14] ${full ? '' : 'simple'}`}>
              <p className="font-hand text-2xl leading-none text-[#8a3a48]">{from} escreveu:</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">{data.body}</p>
            </article>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 pt-1">
          <button onClick={() => prev !== null && onIndex(prev)} disabled={prev === null} aria-label="Enfeite anterior" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 disabled:opacity-30"><Icon name="prev" /></button>
          <span className="text-xs text-cream/60">{index + 1} de {list.length}</span>
          <button onClick={() => next !== null && onIndex(next)} disabled={next === null} aria-label="Próximo enfeite" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 disabled:opacity-30"><Icon name="next" /></button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
