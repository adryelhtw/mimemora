import { useEffect, useState } from 'react'
import { getEvent } from '../registry'
import { nowMs } from '../../lib/clock'

const target = new Date(getEvent('natal-2026')!.opensAt).getTime()

// PROTÓTIPO: usa o relógio do aparelho. Na versão real, o horário vem do servidor.
const left = () => {
  const ms = Math.max(0, target - nowMs()), s = Math.floor(ms / 1000)
  return { done: ms === 0, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function Countdown({ compact = false }: { compact?: boolean }) {
  const [t, setT] = useState(left)
  useEffect(() => { const i = setInterval(() => setT(left()), 1000); return () => clearInterval(i) }, [])
  // Chegou a hora: um anel dourado suave pulsa na caixa e o presente balança devagar (desligam sozinhos com "reduzir movimento").
  if (t.done) return (
    <p className="countdown nudge text-center font-display text-xl text-gold" style={{ animationDuration: '3.2s' }}>
      É Natal! As mensagens já podem ser abertas <span aria-hidden="true" className="inline-block" style={{ animation: 'lidbob 3.6s ease-in-out infinite' }}>🎁</span>
    </p>
  )
  const hint = t.d === 0 ? 'É hoje, à meia-noite!' : t.d === 1 ? 'Falta só um dia!' : 'Cada dia mais perto do 25'
  const cells: [string, number][] = [['dias', t.d], ['horas', t.h], ['min', t.m], ['seg', t.s]]
  return (
    <div className="countdown">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[.25em] text-gold">Faltam</p>
        <p className="font-hand text-xl leading-none text-cream/90">{hint}</p>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label={`Faltam ${t.d} dias, ${t.h} horas, ${t.m} minutos e ${t.s} segundos`}>
        {cells.map(([label, n]) => (
          <div key={label} className="text-center">
            <div className={`cell ${compact ? 'h-14' : 'h-[4.5rem] sm:h-24'}`}>
              <span key={n} className={`num tick font-display font-bold text-gold ${compact ? 'text-2xl' : 'text-4xl sm:text-5xl'}`}>{label === 'dias' ? n : String(n).padStart(2, '0')}</span>
            </div>
            <div className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-cream/70">{label}</div>
          </div>
        ))}
      </div>
      {!compact && <p className="mt-3 text-center text-xs text-cream/60">As mensagens abrem em 25/12/2026, às 00:00 (Brasília)</p>}
    </div>
  )
}
