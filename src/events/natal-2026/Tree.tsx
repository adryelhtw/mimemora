import { useId } from 'react'
import type { SVGProps } from 'react'
import type { Gift, LightsKey, Ornament, SceneKey, Side, TopperKey, TreeModel } from '../../types'
import { OrnamentArt, starPath } from './ornaments'
import { Gifts, SceneBackdrop, SceneGround } from './scenes'
import { nowMs } from '../../lib/clock'

type Pal = { name: string; g: [string, string, string]; edge: 'scallop' | 'spike' | 'straight'; snow?: boolean; trim?: string; lights: string[]; glow: string }

export const MODELS: Record<TreeModel, Pal> = {
  classica: { name: 'Clássica', g: ['#3fa56a', '#1f7048', '#0f4a30'], edge: 'scallop', lights: ['#ffd36b', '#ff8a7a', '#fff2b8'], glow: '#ffcf6a' },
  nevada: { name: 'Nevada', g: ['#4aa0a8', '#2a727e', '#164a58'], edge: 'spike', snow: true, lights: ['#cfeaff', '#ffffff', '#ffe9a8'], glow: '#bfe3ff' },
  elegante: { name: 'Esmeralda', g: ['#1f8a68', '#0f6149', '#08402f'], edge: 'straight', trim: '#f2c46d', lights: ['#fff1c1', '#f2c46d', '#ffffff'], glow: '#f2c46d' },
  rosa: { name: 'Algodão-doce', g: ['#f2b4cd', '#d77aa0', '#9d4a70'], edge: 'scallop', lights: ['#ffffff', '#ffe0ee', '#fff3b0'], glow: '#ffb8d6' },
  'meia-noite': { name: 'Meia-noite', g: ['#4a68a8', '#2b4580', '#17264d'], edge: 'spike', snow: true, trim: '#cfd8ea', lights: ['#cfe3ff', '#ffffff', '#9fc3ff'], glow: '#9fc3ff' },
  dourada: { name: 'Dourada', g: ['#f6d98a', '#d4a13c', '#94661a'], edge: 'scallop', trim: '#fff3c4', lights: ['#ffffff', '#ffe39a', '#ffb347'], glow: '#ffd36b' },
  violeta: { name: 'Ametista', g: ['#b58be0', '#7d4fb8', '#472a78'], edge: 'scallop', lights: ['#ffe9ff', '#ffd6f5', '#fff3b0'], glow: '#d9a8ff' },
  aurora: { name: 'Aurora', g: ['#5de0c0', '#3a8fd8', '#6a3fc0'], edge: 'straight', trim: '#e8fbff', lights: ['#9dfbe8', '#ffffff', '#d6b8ff'], glow: '#8fe9ff' },
  solar: { name: 'Pôr do sol', g: ['#ffb36b', '#ef5a6f', '#7a2a78'], edge: 'scallop', trim: '#ffe9c4', lights: ['#fff1c1', '#ffd0a8', '#ffffff'], glow: '#ff9a6b' },
}

export const LIGHTS: Record<LightsKey, { name: string; colors: string[] }> = {
  douradas: { name: 'Douradas', colors: ['#ffd36b', '#ffe9a8', '#ffb347'] },
  brancas: { name: 'Brancas', colors: ['#ffffff', '#f0f6ff', '#fffbe6'] },
  coloridas: { name: 'Coloridas', colors: ['#ff6b6b', '#ffd36b', '#6bd6ff', '#7dff9a'] },
  geladas: { name: 'Geladas', colors: ['#cfeaff', '#9fd0ff', '#ffffff'] },
}
export const TOPPERS: { key: TopperKey; name: string }[] = [{ key: 'estrela', name: 'Estrela' }, { key: 'laco', name: 'Laço' }, { key: 'floco', name: 'Floco' },
  { key: 'anjo', name: 'Anjinho' }, { key: 'lua', name: 'Lua' }, { key: 'coroa', name: 'Coroa' }]

export function TopperArt({ kind, glow, starFill, animated }: { kind: TopperKey; glow: string; starFill: string; animated?: boolean }) {
  if (kind === 'laco') return (
    <g transform="translate(150 38)">
      <path d="M0 4C-22-14-32 8-8 10ZM0 4C22-14 32 8 8 10Z" fill="#c9172f" stroke="#8f0f22" strokeWidth="1" />
      <path d="M-3 10-10 28M3 10 10 28" stroke="#c9172f" strokeWidth="5" strokeLinecap="round" />
      <circle cy="6" r="5" fill="#a3142f" /><circle cx="-1.5" cy="4.5" r="1.5" fill="#fff" opacity=".5" />
    </g>
  )
  if (kind === 'floco') return (
    <g transform="translate(150 40)" stroke="#eaf6ff" strokeWidth="3" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a})`}><path d="M0-20V20M-5-14 0-9 5-14M-5 14 0 9 5 14" /></g>)}
      <circle r="3" fill="#fff" stroke="none" />
    </g>
  )
  if (kind === 'anjo') return (
    <g transform="translate(150 38)">
      <ellipse cx="-14" cy="3" rx="12" ry="6" transform="rotate(-25 -14 3)" fill="#fff" opacity=".95" />
      <ellipse cx="14" cy="3" rx="12" ry="6" transform="rotate(25 14 3)" fill="#fff" opacity=".95" />
      <path d="M0 5-8 25H8z" fill="#fdfaf2" stroke="#d9c8a0" />
      <circle cy="-1" r="6" fill="#ffd9b3" /><path d="M-6-3q6-7 12 0z" fill="#e8c36a" />
      <ellipse cy="-11" rx="7" ry="2.4" fill="none" stroke="#f2c46d" strokeWidth="2" />
    </g>
  )
  if (kind === 'lua') return (
    <g transform="translate(150 38)">
      <path d="M6-18A18 18 0 1 0 6 18A14 14 0 1 1 6-18Z" fill="#f6d46f" stroke="#c99414" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={starPath(12, -4, 5, 2.2)} fill="#fff8d6" />
    </g>
  )
  if (kind === 'coroa') return (
    <g transform="translate(150 42)">
      <path d="M-18 12-20-10-9 0 0-14 9 0 20-10 18 12z" fill="#f2c46d" stroke="#c99414" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="-18" y="8" width="36" height="6" rx="2" fill="#e0a82e" stroke="#c99414" />
      <circle cx="-20" cy="-10" r="2.6" fill="#c9172f" /><circle cy="-14" r="3" fill="#c9172f" /><circle cx="20" cy="-10" r="2.6" fill="#c9172f" />
      <circle cx="-8" cy="11" r="1.6" fill="#6fd6ff" /><circle cx="8" cy="11" r="1.6" fill="#7dff9a" />
    </g>
  )
  return (
    <>
      <g transform="translate(150 42)">
        <g className={animated ? 'pulse' : undefined}>
          {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0-25V-33" stroke={glow} strokeWidth="2" strokeLinecap="round" opacity=".7" transform={`rotate(${i * 45})`} />)}
        </g>
      </g>
      <path d={starPath(150, 42, 19, 8)} fill={starFill} stroke="#d99a1e" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={starPath(150, 42, 9, 4)} fill="#fff" opacity=".45" />
    </>
  )
}

const TIERS = [{ t: 52, b: 140, w: 58 }, { t: 100, b: 206, w: 84 }, { t: 160, b: 274, w: 108 }, { t: 222, b: 340, w: 132 }]

// Posições dos enfeites (todos os modelos compartilham a mesma geometria).
export const SLOTS: [number, number][] = [
  [150, 104],
  [116, 160], [184, 160],
  [112, 216], [188, 216],
  [86, 272], [150, 272], [214, 272],
  [54, 328], [118, 328], [182, 328], [246, 328],
]
// 12 posições por lado (24 por árvore). Fileiras a 56 unidades; lado a lado, 62 a 76. Cada slot ocupa de y-33 (topo da etiqueta) a y+21 (base do enfeite), então nada se sobrepõe.
export const SIDE_CAP = SLOTS.length

const AURA_SPARKS: [number, number, number][] = [[24, 60, 1], [276, 90, 0.9], [18, 200, 1], [282, 230, 0.8], [40, 330, 0.9], [262, 340, 1], [150, 14, 1.1], [96, 30, 0.8], [210, 40, 0.9]]
const BOX_X = [150, 112, 188, 74, 226]
const BOX_COLORS = ['#c9172f', '#2f6fb5', '#1f8a5b', '#8b5fd6', '#e0a82e']
const SPARKLES: [number, number, number][] = [[44, 112, 1], [258, 160, 0.8], [38, 262, 0.9], [264, 304, 0.7]]

const tierPath = (t: number, b: number, w: number, edge: Pal['edge']) => {
  const n = Math.max(3, Math.round(w / 22)), step = (2 * w) / n
  let d = `M150 ${t}Q${150 + w * 0.62} ${t + (b - t) * 0.5} ${150 + w} ${b}`
  for (let i = 0; i < n; i++) {
    const x = 150 + w - step * (i + 1), m = x + step / 2
    d += edge === 'scallop' ? `Q${m} ${b + 15} ${x} ${b}` : edge === 'spike' ? `L${m} ${b + 12}L${x} ${b}` : `L${x} ${b}`
  }
  return d + `Q${150 - w * 0.62} ${t + (b - t) * 0.5} 150 ${t}Z`
}

const snowCap = (t: number, b: number, w: number) => {
  const y = t + (b - t) * 0.45, h = w * 0.45 * 0.97, s = (2 * h) / 3
  let d = `M150 ${t}L${150 + h} ${y}`
  for (let i = 0; i < 3; i++) { const x = 150 + h - s * i; d += `Q${x - s / 2} ${y + 13} ${x - s} ${y}` }
  return d + 'Z'
}

// galhos caídos: dão volume e textura em cada camada
const branches = (t: number, b: number, w: number) =>
  [0.3, 0.55, 0.8].map((k) => {
    const y = t + (b - t) * k, h = w * k * 0.92
    return `M150 ${y - 6}Q${150 - h * 0.5} ${y - 2} ${150 - h} ${y + 10}M150 ${y - 6}Q${150 + h * 0.5} ${y - 2} ${150 + h} ${y + 10}`
  }).join('')

const swag = (t: number, b: number, w: number) => {
  const y0 = t + (b - t) * 0.5, hw = w * 0.46
  return { y0, hw, pts: [0.08, 0.28, 0.5, 0.72, 0.92].map((k) => ({ x: 150 - hw + 2 * hw * k, y: y0 + 52 * (1 - k) * k })) }
}

type Props = { model: TreeModel; ornaments?: Ornament[]; onPick?: (o: Ornament) => void; animated?: boolean; base?: boolean; sealed?: boolean; lights?: LightsKey; topper?: TopperKey; side?: Side; scene?: SceneKey; backdrop?: boolean; tags?: boolean; gifts?: Gift[]; onGift?: (g: Gift) => void; slots?: { free: number[]; onPick: (n: number) => void } } & SVGProps<SVGSVGElement>

export function Tree({ model, ornaments = [], onPick, animated = true, base = true, sealed = true, lights, topper = 'estrela', side = 'frente', scene = 'neve', backdrop = false, tags = true, slots, gifts, onGift, ...svg }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ''), p = MODELS[model], u = (s: string) => `url(#${id}${s})`
  const tw = animated ? 'twinkle' : undefined
  const lc = lights ? LIGHTS[lights].colors : p.lights
  const now = nowMs()
  const glows = (gifts ?? []).filter((g) => g.kind === 'brilho' && (!g.expiresAt || new Date(g.expiresAt).getTime() > now))   // Brilho Mágico ativo
  const boxes = (gifts ?? []).filter((g) => g.kind === 'misterioso').slice(0, 5)                                                // Presentes Misteriosos
  const sw = TIERS.map((r) => swag(r.t, r.b, r.w))
  const bulbs = sw.flatMap((s, ti) => s.pts.map((b, i) => ({ ...b, k: `${ti}-${i}`, c: lc[(i + ti) % lc.length], d: { animationDelay: `${-((i * 3 + ti) % 5) * 0.55}s` } })))
  return (
    <svg viewBox="0 0 300 400" role="img" aria-label={`Árvore de Natal ${p.name}`} {...svg}>
      <defs>
        <linearGradient id={id + 'g'} x1="0" x2="1"><stop offset="0" stopColor={p.g[0]} /><stop offset=".55" stopColor={p.g[1]} /><stop offset="1" stopColor={p.g[2]} /></linearGradient>
        <linearGradient id={id + 'v'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".32" /></linearGradient>
        <linearGradient id={id + 't'} x1="0" x2="1"><stop offset="0" stopColor="#7a4a2a" /><stop offset="1" stopColor="#3f2414" /></linearGradient>
        <radialGradient id={id + 's'}><stop offset="0" stopColor="#fff8d6" /><stop offset="1" stopColor="#f4b93a" /></radialGradient>
        <radialGradient id={id + 'o'}><stop offset="0" stopColor={p.glow} stopOpacity=".85" /><stop offset="1" stopColor={p.glow} stopOpacity="0" /></radialGradient>
        <radialGradient id={id + 'au'}><stop offset="0" stopColor="#fff3b0" stopOpacity=".5" /><stop offset=".6" stopColor="#f2c46d" stopOpacity=".18" /><stop offset="1" stopColor="#f2c46d" stopOpacity="0" /></radialGradient>
        <radialGradient id={id + 'og'}><stop offset="0" stopColor="#fff" stopOpacity=".4" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {backdrop && <SceneBackdrop scene={scene} id={id} />}
      <SceneGround scene={scene} />
      {glows.length > 0 && (
        <g pointerEvents="none">
          <ellipse cx="150" cy="205" rx="152" ry="198" fill={u('au')} className={animated ? 'pulse' : undefined} />
          {AURA_SPARKS.map(([x, y, k], i) => (
            <path key={i} d="M0-7 1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z" transform={`translate(${x} ${y}) scale(${k})`} fill="#fff3b0" className={tw} style={{ animationDelay: `${-i * 0.5}s` }} />
          ))}
        </g>
      )}
      <rect x="134" y="334" width="32" height="38" rx="3" fill={u('t')} />
      {[...TIERS].reverse().map((r) => {
        const d = tierPath(r.t, r.b, r.w, p.edge), br = branches(r.t, r.b, r.w)
        return (
          <g key={r.t}>
            <path d={d} transform="translate(0 7)" fill="#000" opacity=".22" />
            <path d={d} fill={u('g')} stroke={p.trim} strokeWidth={p.trim ? 2.4 : 0} strokeLinejoin="round" />
            <path d={d} fill={u('v')} />
            <path d={br} stroke="#000" strokeOpacity=".2" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d={br} transform="translate(0 -2)" stroke="#fff" strokeOpacity=".13" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d={`M150 ${r.t}Q${150 - r.w * 0.62} ${(r.t + r.b) / 2} ${150 - r.w} ${r.b}`} stroke="#fff" strokeOpacity=".22" strokeWidth="2" fill="none" strokeLinecap="round" />
            {p.snow && <path d={snowCap(r.t, r.b, r.w)} fill="#f4f9ff" opacity=".96" />}
          </g>
        )
      })}
      {sw.map((s, ti) => (
        <g key={ti} fill="none">
          {p.trim && <path d={`M${150 - s.hw * 1.04} ${s.y0 - 15}Q150 ${s.y0 + 9} ${150 + s.hw * 1.04} ${s.y0 - 15}`} stroke={p.trim} strokeWidth="3.2" strokeDasharray="0 7" strokeLinecap="round" opacity=".95" />}
          <path d={`M${150 - s.hw} ${s.y0}Q150 ${s.y0 + 26} ${150 + s.hw} ${s.y0}`} stroke="#1c1c1c" strokeOpacity=".55" />
        </g>
      ))}
      <g>{bulbs.map((b) => <circle key={b.k} cx={b.x} cy={b.y} r="6" fill={b.c} opacity=".3" />)}</g>
      {bulbs.map((b) => (
        <g key={b.k} className={tw} style={b.d}><circle cx={b.x} cy={b.y} r="2.7" fill={b.c} /><circle cx={b.x - 0.7} cy={b.y - 0.8} r="1" fill="#fff" /></g>
      ))}
      <circle cx="150" cy="44" r="28" fill={u('o')} className={animated ? 'pulse' : undefined} />
      <TopperArt kind={topper} glow={p.glow} starFill={u('s')} animated={animated} />
      {animated && SPARKLES.map(([x, y, k], i) => (
        <path key={i} d="M0-7 1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z" transform={`translate(${x} ${y}) scale(${k})`} fill="#fff8d6" className="twinkle" style={{ animationDelay: `${-i * 0.9}s` }} />
      ))}
      {base && <Gifts scene={scene} />}
      {side === 'frente' && boxes.map((g, i) => {
        const act = onGift ? () => onGift(g) : undefined
        return (
          <g key={g.id} transform={`translate(${BOX_X[i] - 15} 364)`} style={{ cursor: act ? 'pointer' : undefined }} role={act ? 'button' : undefined} tabIndex={act ? 0 : undefined}
            aria-label={`Presente misterioso de ${g.from ? '@' + g.from : 'alguém'}`} onClick={act} onKeyDown={act ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } } : undefined}>
            <rect width="30" height="24" rx="2" fill={BOX_COLORS[i % BOX_COLORS.length]} stroke="#fff" strokeOpacity=".35" />
            <rect x="12" width="6" height="24" fill="#f2c46d" /><rect y="9" width="30" height="5" fill="#f2c46d" opacity=".9" />
            <path d="M15 0c-7-8-13-1-6 0zM15 0c7-8 13-1 6 0z" fill="none" stroke="#f2c46d" strokeWidth="2" />
          </g>
        )
      })}
      {tags && glows.slice(0, 3).map((g, i) => {
        const label = `✦ ${g.from ? '@' + g.from : 'oculto'}`, w = label.length * 4.8 + 10
        return (
          <g key={g.id} transform={`translate(${296 - w} ${22 + i * 18})`} style={{ cursor: onGift ? 'pointer' : undefined }} onClick={onGift ? () => onGift(g) : undefined}>
            <rect width={w} height="14" rx="7" fill="#0a1a33" fillOpacity=".9" stroke="#f2c46d" strokeOpacity=".7" strokeWidth=".8" />
            <text x={w / 2} y="10" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff3b0" fontFamily="Nunito, system-ui, sans-serif">{label}</text>
          </g>
        )
      })}
      {slots?.free.map((n) => {
        const [x, y] = SLOTS[n], pickSlot = () => slots.onPick(n)
        return (
          <g key={'s' + n} role="button" tabIndex={0} aria-label={`Posição livre ${n + 1}`} style={{ cursor: 'pointer' }} onClick={pickSlot}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickSlot() } }}>
            <circle cx={x} cy={y} r="27" fill="transparent" />
            <circle cx={x} cy={y} r="17" fill="rgba(255,255,255,.12)" stroke="#f2c46d" strokeWidth="1.6" strokeDasharray="3.5 3.5" className={animated ? 'slot' : undefined} />
            <path d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} stroke="#f2c46d" strokeWidth="2" strokeLinecap="round" />
          </g>
        )
      })}
      {ornaments.filter((o) => o.side === side).map((o) => {
        const [x, y] = SLOTS[o.slot] ?? SLOTS[0], s = 0.95
        const label = o.from ? `@${o.from.length > 12 ? o.from.slice(0, 11) + '…' : o.from}` : 'oculto', w = label.length * 4.8 + 9
        const act = onPick ? () => onPick(o) : undefined
        return (
          <g key={o.id}>
            <circle cx={x} cy={y} r="25" fill={u('og')} />
            <g transform={`translate(${x - 20 * s} ${y - 26 * s}) scale(${s})`}>
              <g
                className={animated ? 'sway' : undefined}
                style={{ animationDelay: `${-(o.slot % 7) * 0.6}s`, cursor: act ? 'pointer' : undefined }}
                role={act ? 'button' : undefined}
                tabIndex={act ? 0 : undefined}
                aria-label={act ? `Enfeite de @${o.from}` : undefined}
                onClick={act}
                onKeyDown={act ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } } : undefined}
              >
                <OrnamentArt type={o.type} />
                {sealed && (
                  <g transform="translate(29 36)">
                    <circle r="4.8" fill="#a3142f" stroke="#f5d98a" strokeWidth=".9" />
                    <path d="M-2.3-1.2 0 .9 2.3-1.2" stroke="#fff" strokeWidth=".9" fill="none" strokeLinecap="round" />
                  </g>
                )}
              </g>
            </g>
            {tags && (
              <g transform={`translate(${x} ${y - 26 * s - 2})`} onClick={act} style={{ cursor: act ? 'pointer' : undefined }}>
                <rect x={-w / 2} y="-7" width={w} height="14" rx="7" fill="#0a1a33" fillOpacity=".9" stroke="#f2c46d" strokeOpacity=".6" strokeWidth=".8" />
                <text textAnchor="middle" y="3.2" fontSize="8.6" fontWeight="700" fill="#fbf3e4" fontFamily="Nunito, system-ui, sans-serif">{label}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
