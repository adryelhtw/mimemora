import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'
import type { Profile } from '../types'
import { Icon } from './Icons'
import { PresetAvatar, presetOf } from './avatars'

function AvatarBase({ p, size = 44 }: { p: Profile; size?: number }) {
  const preset = presetOf(p.photo)
  if (preset) return <PresetAvatar preset={preset} size={size} />
  if (p.photo) return <img src={p.photo} alt={p.name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-gold/60" />
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg,hsl(${p.hue} 70% 62%),hsl(${(p.hue + 40) % 360} 65% 42%))` }}
      className="grid shrink-0 place-items-center rounded-full font-display font-bold text-white ring-2 ring-gold/60"
      aria-label={p.name}
    >
      {p.name[0]}
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'   // a página atrás não rola enquanto a janela está aberta
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  // Portal: a janela sai do <main> e fica acima do menu de navegação e do rodapé.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="sheet relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-night-2 p-5 sm:rounded-3xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-2 hover:bg-white/10"><Icon name="close" /></button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  )
}

const FLAKES = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => ((i * n) % 97) / 97 // pseudo-aleatório fixo: a neve é igual a cada carregamento
  const glyph = i % 4 === 0
  return { left: r(53) * 100, size: glyph ? 10 + r(31) * 9 : 2 + r(17) * 6, glyph, dur: 9 + r(29) * 13 + (glyph ? 4 : 0), delay: -r(41) * 22, dx: (r(13) - 0.5) * 120, op: 0.45 + r(7) * 0.5 }
})

export function Snow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className={f.glyph ? 'flake flake-g' : 'flake'}
          style={{ left: `${f.left}%`, width: f.glyph ? undefined : f.size, height: f.glyph ? undefined : f.size, fontSize: f.glyph ? f.size : undefined, opacity: f.op, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--dx': `${f.dx}px` } as CSSProperties}
        >
          {f.glyph ? '\u2744\uFE0E' : null}
        </span>
      ))}
    </div>
  )
}

// Botão minúsculo no canto superior direito. Não é fixo: rola junto com a página.
export function SnowToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} aria-label={on ? 'Desligar neve' : 'Ligar neve'} className="group relative grid h-7 w-7 place-items-center rounded-full text-cream/60 transition hover:text-cream">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {[0, 60, 120].map((a) => <path key={a} d="M12 3v18M9.5 5.5 12 8l2.5-2.5M9.5 18.5 12 16l2.5 2.5" transform={`rotate(${a} 12 12)`} />)}
        {!on && <path d="M4 4 20 20" strokeWidth="2.2" />}
      </svg>
      <span role="tooltip" className="pointer-events-none absolute right-full top-1/2 mr-1 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-cream opacity-0 transition-opacity group-hover:opacity-100">
        {on ? 'Desligar neve' : 'Ligar neve'}
      </span>
    </button>
  )
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div role="status" className="sheet fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-gold/40 bg-night-2 px-4 py-3 text-center text-sm font-bold shadow-xl">
      {msg}
    </div>
  )
}

// Foto de perfil, com a moldura equipada (se houver).
export function Avatar({ p, size = 44 }: { p: Profile; size?: number }) {
  if (!p.frame) return <AvatarBase p={p} size={size} />
  const pad = Math.max(3, Math.round(size * 0.07))
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size + pad * 2, height: size + pad * 2 }}>
      <span className={`frame-ring frame-${p.frame}`} aria-hidden="true" />
      <span className="relative"><AvatarBase p={p} size={size} /></span>
    </span>
  )
}
