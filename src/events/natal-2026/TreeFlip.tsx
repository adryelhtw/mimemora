import type { ComponentProps } from 'react'
import type { Side } from '../../types'
import { Icon } from '../../components/Icons'
import { SIDE_CAP, Tree } from './Tree'

type Props = Omit<ComponentProps<typeof Tree>, 'side'> & { side: Side }

// A mesma árvore (mesmo modelo, luzes e topo) girando entre frente e verso.
export function TreeFlip({ side, animated = true, slots, ...rest }: Props) {
  const back = side === 'verso'
  return (
    <div className="flip">
      <div className={`flip-in ${back ? 'back' : ''}`}>
        <div className="face" aria-hidden={back}><Tree {...rest} side="frente" animated={animated && !back} slots={back ? undefined : slots} /></div>
        <div className="face verso" aria-hidden={!back}><Tree {...rest} side="verso" animated={animated && back} slots={back ? slots : undefined} /></div>
      </div>
    </div>
  )
}

export function SideSwitch({ side, onSide, counts, nudge }: { side: Side; onSide: (s: Side) => void; counts: Record<Side, number>; nudge?: boolean }) {
  const tab = (s: Side, label: string) => (
    <button key={s} onClick={() => onSide(s)} aria-pressed={side === s} className={`flex-1 rounded-full px-3 py-2 text-sm font-bold ${side === s ? 'bg-gold text-[#3a1500]' : 'text-cream/80'}`}>
      {label} <span className="opacity-75">· {counts[s]}/{SIDE_CAP}</span>
    </button>
  )
  return (
    <div className="mx-auto flex max-w-sm items-center gap-1 rounded-full border border-white/15 bg-black/25 p-1" role="group" aria-label="Lado da árvore">
      {tab('frente', 'Frente')}
      <button onClick={() => onSide(side === 'frente' ? 'verso' : 'frente')} aria-label="Virar a árvore" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 ${nudge ? 'nudge' : ''}`}>
        <Icon name="flip" />
      </button>
      {tab('verso', 'Verso')}
    </div>
  )
}
