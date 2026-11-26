import type { CSSProperties } from 'react'

const dots = (n: number) => Array.from({ length: n }, (_, i) => ({ left: (i * 37 + 11) % 100, size: 3 + (i % 3) * 1.5, dur: 4 + (i % 5) * 1.2, delay: -((i * 7) % 9) }))

// Efeito de perfil equipado (cosmético): camada decorativa atrás do cabeçalho. O pai precisa ser "relative isolate".
export function ProfileFx({ kind }: { kind?: string }) {
  if (!kind) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-80 overflow-hidden rounded-3xl" aria-hidden="true">
      {kind === 'aurora' && <div className="fx-aurora" />}
      {kind === 'brilhos' && dots(18).map((d, i) => (
        <span key={i} className="fx-dot" style={{ left: `${d.left}%`, width: d.size, height: d.size, background: '#fff3b0', boxShadow: '0 0 8px 2px rgba(242,196,109,.8)', animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` } as CSSProperties} />
      ))}
      {kind === 'flocos' && dots(26).map((d, i) => (
        <span key={i} className="flake" style={{ left: `${d.left}%`, width: d.size + 1, height: d.size + 1, opacity: 0.8, animationDuration: `${d.dur * 2}s`, animationDelay: `${d.delay}s`, '--dx': '20px' } as CSSProperties} />
      ))}
    </div>
  )
}
