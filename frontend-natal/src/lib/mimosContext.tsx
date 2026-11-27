import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { fetchBalance } from './mimos'

type Fx = { n: number; label: string; rare: boolean; k: number }
type Ctx = { balance: number | null; refresh: (silent?: boolean) => Promise<void>; burst: (n: number, label?: string, rare?: boolean) => void }
const MimosCtx = createContext<Ctx | null>(null)

export function useMimos() {
  const v = useContext(MimosCtx)
  if (!v) throw new Error('useMimos precisa estar dentro do MimosProvider')
  return v
}

// Saldo de Mimos + aviso visual discreto sempre que o saldo sobe (qualquer origem: roleta, indicação, conquista...).
export function MimosProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const prev = useRef<number | null>(null)

  const burst = useCallback((n: number, label = '', rare = false) => {
    const k = Date.now()
    setFx({ n, label, rare, k })
    setTimeout(() => setFx((f) => (f && f.k === k ? null : f)), rare ? 4200 : 2600)
  }, [])

  const refresh = useCallback(async (silent = false) => {
    if (!userId) return
    try {
      const b = await fetchBalance(userId)
      if (!silent && prev.current !== null && b > prev.current) burst(b - prev.current)
      prev.current = b
      setBalance(b)
    } catch { /* sem rede: mantém o saldo anterior */ }
  }, [userId, burst])

  useEffect(() => {
    prev.current = null
    setBalance(null)
    if (userId) refresh(true)
  }, [userId, refresh])
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [refresh])

  return (
    <MimosCtx.Provider value={{ balance, refresh, burst }}>
      {children}
      {fx && <Burst fx={fx} />}
    </MimosCtx.Provider>
  )
}

function Burst({ fx }: { fx: Fx }) {
  const dots = Array.from({ length: fx.rare ? 18 : 8 }, (_, i) => i)
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center">
      <div key={fx.k} className={`burst relative rounded-3xl border border-gold/60 bg-night-2/95 px-6 py-4 text-center shadow-2xl ${fx.rare ? 'burst-rare' : ''}`} style={{ animationDelay: `0s, ${fx.rare ? 3.6 : 2}s` }}>
        {dots.map((i) => <span key={i} className="burst-dot" style={{ '--a': `${(360 / dots.length) * i}deg`, '--c': ['#f2c46d', '#ff9fb8', '#fff3b0', '#9fd8ff'][i % 4] } as CSSProperties} />)}
        <p className="font-display text-3xl font-bold text-gold">{fx.n > 0 ? `+${fx.n} mimos` : fx.label}</p>
        {fx.n > 0 && fx.label && <p className="text-sm text-cream/80">{fx.label}</p>}
        {fx.rare && <p className="font-hand text-xl text-cream">uma recompensa rara!</p>}
      </div>
    </div>
  )
}
