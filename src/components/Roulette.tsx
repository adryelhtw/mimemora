import { useCallback, useEffect, useState } from 'react'
import { rouletteStatus, spinRoulette } from '../lib/mimos'
import type { RouletteStatus, SpinResult } from '../lib/mimos'
import { useMimos } from '../lib/mimosContext'
import { errText } from '../lib/api'
import { nowMs } from '../lib/clock'

const polar = (a: number, r: number): [number, number] => { const t = ((a - 90) * Math.PI) / 180; return [100 + r * Math.cos(t), 100 + r * Math.sin(t)] }
const COLORS = { comum: ['#fbeed3', '#f7dbe5'], incomum: ['#f2c46d', '#f2c46d'], raro: ['#ff9fb8', '#ff9fb8'] }
const until = (iso: string) => {
  const ms = Math.max(0, new Date(iso).getTime() - nowMs())
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

// Roleta diária: o resultado é sorteado e validado no servidor. A tela só anima até a fatia sorteada.
export function Roulette() {
  const { refresh, burst } = useMimos()
  const [st, setSt] = useState<RouletteStatus | null>(null)
  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [res, setRes] = useState<SpinResult | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => rouletteStatus().then(setSt).catch(() => setErr('Não consegui carregar a roleta agora.')), [])
  useEffect(() => { load() }, [load])
  if (!st) return err ? <p className="text-sm font-bold text-gold">{err}</p> : null

  const n = st.prizes.length, slice = 360 / n
  const spin = async () => {
    setErr(''); setSpinning(true)
    try {
      const r = await spinRoulette()
      const idx = Math.max(0, st.prizes.findIndex((p) => p.id === r.prize_id))
      setRot((cur) => Math.ceil(cur / 360) * 360 + 360 * 5 + ((360 - (idx * slice + slice / 2)) % 360))   // para na fatia sorteada
      setTimeout(() => {
        setRes(r); setSpinning(false)
        if (r.kind === 'mimos') burst(r.amount, r.converted ? 'você já tinha o item: virou mimos!' : 'da roleta de hoje', r.rarity === 'raro')
        else burst(0, `novo item: ${r.label}`, true)
        refresh(true); load()
      }, 4400)
    } catch (e) { setSpinning(false); setErr(errText(e)); load() }
  }
  const last = res ?? st.last

  return (
    <div className="card flex items-center gap-4 p-4 text-left">
      <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
        <svg viewBox="0 0 200 200" className="wheel h-full w-full" style={{ transform: `rotate(${rot}deg)` }} role="img" aria-label="roleta de mimos">
          {st.prizes.map((p, i) => {
            const a0 = slice * i, a1 = a0 + slice, am = a0 + slice / 2
            const [x0, y0] = polar(a0, 92), [x1, y1] = polar(a1, 92), [tx, ty] = polar(am, 62)
            return (
              <g key={p.id}>
                <path d={`M100 100L${x0} ${y0}A92 92 0 0 1 ${x1} ${y1}Z`} fill={COLORS[p.rarity][i % 2]} stroke="#0a1a33" strokeWidth="1.5" />
                <text x={tx} y={ty} fontSize="15" fontWeight="800" fill="#3a1500" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${am} ${tx} ${ty})`}>{p.kind === 'mimos' ? `+${p.amount}` : '✦'}</text>
              </g>
            )
          })}
          <circle cx="100" cy="100" r="12" fill="#0a1a33" stroke="#f2c46d" strokeWidth="2" />
        </svg>
        <svg viewBox="0 0 20 20" className="absolute left-1/2 top-[-6px] h-5 w-5 -translate-x-1/2" aria-hidden="true"><path d="M2 3h16L10 17z" fill="#f2c46d" stroke="#0a1a33" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-display text-xl">roleta de mimos</p>
        {st.can_spin
          ? <button className="pill" onClick={spin} disabled={spinning}>{spinning ? 'girando…' : 'girar agora'}</button>
          : <p className="text-sm text-cream/80">Hoje: <b className="text-gold">{last?.label}</b>. Próxima tentativa em {until(st.next_at)} (à meia-noite).</p>}
        <p className="min-h-4 text-xs font-bold text-gold" role="alert">{err}</p>
        <details className="text-xs text-cream/70">
          <summary className="cursor-pointer font-bold text-gold">ver recompensas e chances</summary>
          <ul className="mt-2 space-y-1">
            {st.prizes.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{p.label}{p.rarity === 'raro' ? ' ✦ raro' : ''}</span><span>{p.chance}%</span></li>)}
          </ul>
          <p className="mt-1">O sorteio é feito no servidor, uma vez por dia (horário de Brasília).</p>
        </details>
      </div>
    </div>
  )
}
