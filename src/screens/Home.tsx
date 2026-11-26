import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Gift, Ornament, Profile, Side, TreeData } from '../types'
import { MODELS, SIDE_CAP } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { Countdown } from '../events/natal-2026/Countdown'
import { Sheet } from '../components/ui'
import { ShareButton } from '../components/ShareButton'
import { Roulette } from '../components/Roulette'
import { GiftInfoSheet, GiftsReceived } from '../components/GiftSheets'
import type { EventRow } from '../lib/api'
import { nowMs } from '../lib/clock'

type Props = { me: Profile; tree: TreeData; event: EventRow; onShare: () => void }

// Fases do evento (o servidor decide a abertura; aqui só mostramos em qual fase estamos).
function PhaseBar({ event }: { event: EventRow }) {
  const t = nowMs(), opens = new Date(event.opens_at).getTime(), expect = event.expectation_at ? new Date(event.expectation_at).getTime() : opens
  const cur = t >= opens ? 3 : t >= expect ? 2 : 1
  const steps = ['criação', 'compartilhamento', 'expectativa', 'revelação']
  const hint = ['', 'convide amigos, enfeite árvores e mande presentes', 'falta pouco: os enfeites aparecem, mas as mensagens seguem secretas', 'abra as cartas e os presentes']
  return (
    <div>
      <ol className="flex flex-wrap items-center justify-center gap-1 text-[11px] lg:justify-start">
        {steps.map((s, i) => <li key={s} className={`rounded-full px-2 py-1 font-bold ${i < cur ? 'bg-gold/20 text-gold' : i === cur ? 'bg-gold text-[#3a1500]' : 'bg-white/5 text-cream/50'}`}>{i < cur ? '✓ ' : ''}{s}</li>)}
      </ol>
      <p className="mt-1 text-xs text-cream/70">{hint[cur]}</p>
    </div>
  )
}

export function Home({ me, tree, event, onShare }: Props) {
  const [pick, setPick] = useState<Ornament | null>(null)
  const [giftInfo, setGiftInfo] = useState<Gift | null>(null)
  const [side, setSide] = useState<Side>('frente')
  const [seenBack, setSeenBack] = useState(false)
  const n = tree.ornaments.length, total = SIDE_CAP * 2
  const counts: Record<Side, number> = { frente: tree.ornaments.filter((o) => o.side === 'frente').length, verso: tree.ornaments.filter((o) => o.side === 'verso').length }
  const other: Side = side === 'frente' ? 'verso' : 'frente'
  const go = (s: Side) => { setSide(s); if (s === 'verso') setSeenBack(true) }
  const opened = nowMs() >= new Date(event.opens_at).getTime()
  return (
    <>
      <section className="grid items-center gap-6 lg:grid-cols-2">
        <div className="relative">
          <div className="glow" style={{ background: `radial-gradient(closest-side, ${MODELS[tree.model].glow}55, transparent 70%)` }} />
          <TreeFlip side={side} model={tree.model} lights={tree.lights} topper={tree.topper} scene={tree.scene} backdrop ornaments={tree.ornaments} gifts={tree.gifts} onGift={setGiftInfo} onPick={setPick} className="relative mx-auto w-full max-w-[440px]" style={{ maxHeight: '58dvh' }} />
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
          {opened && (
            <Link to="/revelacao" className="card block p-4 text-left hover:bg-white/10">
              <b className="font-display text-lg text-gold">A revelação começou!</b><br />
              <span className="text-sm text-cream/80">Abra as cartas e os presentes da sua árvore →</span>
            </Link>
          )}
          <Countdown />
          <PhaseBar event={event} />
          <ShareButton onClick={onShare} />
          <div className="space-y-2">
            <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n}><span style={{ width: `${Math.round((n / total) * 100)}%` }} /></div>
            <p className="text-sm text-cream/70">
              {n === 0 ? 'Sua árvore está esperando o primeiro enfeite. Compartilhe o link!' : `${n} de ${total} lugares ocupados · ${total - n} esperando seus amigos`}
            </p>
          </div>
          <Roulette />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm lg:justify-start">
            <Link to="/enfeitar" className="font-bold text-gold">Enfeitar a árvore de um amigo →</Link>
            <Link to="/loja?aba=indicacoes" className="text-cream/70 underline">convide amigos e ganhe mimos</Link>
            <GiftsReceived gifts={tree.gifts ?? []} />
          </div>
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
      <GiftInfoSheet gift={giftInfo} onClose={() => setGiftInfo(null)} />
    </>
  )
}
