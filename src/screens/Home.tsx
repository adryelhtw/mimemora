import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Ornament, Profile, Side, TreeData } from '../types'
import { MODELS, SIDE_CAP } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { Countdown } from '../events/natal-2026/Countdown'
import { getEvent } from '../events/registry'
import { Sheet } from '../components/ui'
import { ShareButton } from '../components/ShareButton'

type Props = { me: Profile; tree: TreeData; onShare: () => void }

export function Home({ me, tree, onShare }: Props) {
  const [pick, setPick] = useState<Ornament | null>(null)
  const [side, setSide] = useState<Side>('frente')
  const [seenBack, setSeenBack] = useState(false)
  const n = tree.ornaments.length, total = SIDE_CAP * 2
  const counts: Record<Side, number> = { frente: tree.ornaments.filter((o) => o.side === 'frente').length, verso: tree.ornaments.filter((o) => o.side === 'verso').length }
  const other: Side = side === 'frente' ? 'verso' : 'frente'
  const go = (s: Side) => { setSide(s); if (s === 'verso') setSeenBack(true) }
  const opened = Date.now() >= new Date(getEvent('natal-2026')!.opensAt).getTime()
  return (
    <>
      <section className="grid items-center gap-6 lg:grid-cols-2">
        <div className="relative">
          <div className="glow" style={{ background: `radial-gradient(closest-side, ${MODELS[tree.model].glow}55, transparent 70%)` }} />
          <TreeFlip side={side} model={tree.model} lights={tree.lights} topper={tree.topper} scene={tree.scene} backdrop ornaments={tree.ornaments} onPick={setPick} className="relative mx-auto w-full max-w-[440px]" style={{ maxHeight: '58dvh' }} />
          <div className="relative mt-3"><SideSwitch side={side} onSide={go} counts={counts} nudge={counts.verso > 0 && !seenBack} /></div>
          {counts[other] > 0 && (
            <button onClick={() => go(other)} className="card relative mt-3 w-full p-3 text-left">
              <b className="text-gold">{counts[other]} {counts[other] === 1 ? 'enfeite' : 'enfeites'} no {other}</b><br />
              <span className="text-sm text-cream/80">{opened ? 'Ainda há mensagens esperando por você do outro lado. ' : 'Gire a árvore para ver quem enfeitou do outro lado. '}Toque para virar →</span>
            </button>
          )}
        </div>
        <div className="space-y-5 text-center lg:text-left">
          <div>
            <p className="font-hand text-2xl leading-none text-gold">Natal 2026 · @{me.username}</p>
            <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">Cada enfeite guarda um segredo</h1>
          </div>
          <Countdown />
          <ShareButton onClick={onShare} />
          <div className="space-y-2">
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}><span style={{ width: `${Math.round((n / total) * 100)}%` }} /></div>
            <p className="text-sm text-cream/70">
              {n === 0 ? 'Sua árvore está esperando o primeiro enfeite. Compartilhe o link!' : `${n} de ${total} lugares ocupados · ${total - n} esperando seus amigos`}
            </p>
          </div>
          <Link to="/enfeitar" className="inline-flex items-center gap-2 font-bold text-gold">Enfeitar a árvore de um amigo →</Link>
        </div>
      </section>
      <Sheet open={!!pick} onClose={() => setPick(null)} title={`Enfeite de @${pick?.from ?? ''}`}>
        <div className="space-y-3 text-center">
          {pick && <OrnamentIcon type={pick.type} className="mx-auto h-28 w-24" />}
          <p className="font-hand text-3xl text-gold">Uma mensagem secreta</p>
          <p className="text-cream/80">Ela só pode ser lida a partir de 25/12/2026, às 00:00 (horário de Brasília).</p>
          {pick && <p className="text-xs text-cream/60">Pendurado no {pick.side} da árvore</p>}
        </div>
      </Sheet>
    </>
  )
}
