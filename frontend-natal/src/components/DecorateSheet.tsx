import { useState } from 'react'
import type { OrnamentType, Profile, Side, TreeData } from '../types'
import { ORNAMENTS, OrnamentIcon } from '../events/natal-2026/ornaments'
import { SIDE_CAP } from '../events/natal-2026/Tree'
import { TreeFlip } from '../events/natal-2026/TreeFlip'
import { Sheet } from './ui'

// onPlace devolve null se deu certo, ou o texto do erro (ex.: alguém ocupou a posição antes).
type Props = { target: TreeData | null; me: Profile; onClose: () => void; onPlace: (type: OrnamentType, message: string, side: Side, slot: number) => Promise<string | null> }

export function DecorateSheet({ target, me, onClose, onPlace }: Props) {
  return (
    <Sheet open={!!target} onClose={onClose} title={`Enfeitar a árvore de @${target?.owner.username ?? ''}`}>
      {target && <Form target={target} me={me} onSubmit={onPlace} onDone={onClose} />}
    </Sheet>
  )
}

function Form({ target, me, onSubmit, onDone }: { target: TreeData; me: Profile; onSubmit: Props['onPlace']; onDone: () => void }) {
  const free = (s: Side) => {
    const used = new Set(target.ornaments.filter((o) => o.side === s).map((o) => o.slot))
    return Array.from({ length: SIDE_CAP }, (_, i) => i).filter((i) => !used.has(i))
  }
  const nFree: Record<Side, number> = { frente: free('frente').length, verso: free('verso').length }
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<OrnamentType | null>(null)
  const [msg, setMsg] = useState('')
  const [side, setSide] = useState<Side>(nFree.frente > 0 ? 'frente' : 'verso')
  const [slot, setSlot] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (target.owner.username === me.username) return <p className="py-6 text-center text-cream/80">Você não pode enfeitar a própria árvore.</p>
  if (target.ornaments.some((o) => o.from === me.username)) return <p className="py-6 text-center text-cream/80">Você já deixou seu enfeite nesta árvore. Cada pessoa pode deixar apenas um.</p>
  if (nFree.frente + nFree.verso === 0) return <p className="py-6 text-center text-cream/80">Esta árvore já está cheia. Que tal enfeitar a de outro amigo?</p>

  if (step === 1) return (
    <div className="space-y-4">
      <p className="text-sm text-cream/70">Escolha um enfeite. Você só pode deixar um por árvore.</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {ORNAMENTS.map((o) => (
          <button key={o.id} onClick={() => setType(o.id)} aria-label={o.name} aria-pressed={type === o.id}
            className={`rounded-xl border p-2 ${type === o.id ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/5'}`}>
            <OrnamentIcon type={o.id} className="mx-auto h-12 w-10" /><span className="mt-1 block text-[10px] font-bold leading-tight">{o.name}</span>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-cream/60">Sua mensagem secreta</span>
        <textarea value={msg} maxLength={500} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Escreva algo carinhoso..." className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 p-3" />
        <span className="text-xs text-cream/50">{msg.length}/500 · só poderá ser lida a partir de 25/12/2026, 00:00 (Brasília)</span>
      </label>
      <button className="cta disabled:opacity-40" disabled={!type || !msg.trim()} onClick={() => setStep(2)}>Escolher a posição →</button>
    </div>
  )

  const pickSide = (s: Side) => { setSide(s); setSlot(null) }
  const preview = slot !== null && type ? [{ id: 'preview', type, side, slot, from: me.username }] : []
  const send = async () => {
    if (!type || slot === null) return
    setBusy(true); setErr('')
    const e = await onSubmit(type, msg.trim(), side, slot)
    setBusy(false)
    if (e) { setErr(e); setSlot(null) } else onDone()
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-cream/70">Toque em um círculo dourado para pendurar seu enfeite. Depois de enviado, ele não pode mudar de lugar.</p>
      <div className="flex gap-2">
        {(['frente', 'verso'] as Side[]).map((s) => (
          <button key={s} disabled={nFree[s] === 0} onClick={() => pickSide(s)} aria-pressed={side === s}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-bold disabled:opacity-40 ${side === s ? 'bg-gold text-[#3a1500]' : 'bg-white/10'}`}>
            {s === 'frente' ? 'Frente' : 'Verso'} · {nFree[s] === 0 ? 'cheio' : `${nFree[s]} livres`}
          </button>
        ))}
      </div>
      <TreeFlip side={side} model={target.model} lights={target.lights} topper={target.topper} scene={target.scene} backdrop sealed={false}
        ornaments={[...target.ornaments, ...preview]} slots={{ free: free(side).filter((i) => i !== slot), onPick: setSlot }}
        className="mx-auto w-full max-w-[360px]" style={{ maxHeight: '46dvh' }} />
      <p className="text-center text-sm font-bold text-gold" role="status">{err || (slot === null ? 'Escolha uma posição livre' : `Posição escolhida: ${side}, nº ${slot + 1}`)}</p>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="rounded-full px-4 font-bold text-gold" onClick={() => setStep(1)}>← Voltar</button>
        <button className="cta disabled:opacity-40" disabled={slot === null || !type || busy} onClick={send}>{busy ? 'Enviando…' : 'Confirmar envio'}</button>
      </div>
    </div>
  )
}
