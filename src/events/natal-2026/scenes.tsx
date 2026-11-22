import type { ReactNode } from 'react'
import type { SceneKey } from '../../types'
import { starPath } from './ornaments'

type Scene = { name: string; bg: [string, string]; gifts: [string, string, string, string, string, string] }

// Cada cenário muda o fundo, o chão (base da árvore) e os presentes. Escolhido uma única vez, junto com a árvore.
export const SCENES: Record<SceneKey, Scene> = {
  neve: { name: 'Noite de neve', bg: ['#173f75', '#08162e'], gifts: ['#c9172f', '#f2c46d', '#2f6fb5', '#ffffff', '#f2c46d', '#c9172f'] },
  lareira: { name: 'Sala aconchegante', bg: ['#5a2420', '#240d10'], gifts: ['#1f6b3f', '#f2c46d', '#c9172f', '#fff3d6', '#8a5a2b', '#f2c46d'] },
  floresta: { name: 'Floresta nevada', bg: ['#14524c', '#071f21'], gifts: ['#7a1f2b', '#e8d9b0', '#2e5d4a', '#f2c46d', '#e8d9b0', '#7a1f2b'] },
  aurora: { name: 'Aurora boreal', bg: ['#0b1d44', '#050c1f'], gifts: ['#2fc2a5', '#ffffff', '#8b5fd6', '#ffd6f5', '#ffffff', '#2fc2a5'] },
  praia: { name: 'Natal na praia', bg: ['#6a4fb8', '#ff8a6b'], gifts: ['#ff7a59', '#fff3c4', '#1fa6b8', '#ffffff', '#ffd24a', '#ff7a59'] },
  doces: { name: 'Mundo de doces', bg: ['#ffc7de', '#ff9ec4'], gifts: ['#ff5d93', '#ffffff', '#5fd3b5', '#ff5d93', '#ffffff', '#8b5fd6'] },
}

const dots = (n: number) => Array.from({ length: n }, (_, i) => ({ x: (i * 97 + 13) % 300, y: (i * 53 + 7) % 260, r: 0.8 + (i % 3) * 0.6 }))
const pine = (x: number, y: number, k: number, c: string) => (
  <path key={`${x}-${y}`} d={`M${x} ${y - 70 * k}L${x - 22 * k} ${y - 30 * k}H${x - 12 * k}L${x - 30 * k} ${y}H${x + 30 * k}L${x + 12 * k} ${y - 30 * k}H${x + 22 * k}Z`} fill={c} />
)
const stars = (n: number, o = 0.55) => dots(n).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity={o} />)

function decor(scene: SceneKey, id: string): ReactNode {
  switch (scene) {
    case 'lareira': return (
      <>
        <circle cx="30" cy="390" r="170" fill="#ff8a2a" opacity=".28" /><circle cx="30" cy="390" r="100" fill="#ffb34a" opacity=".25" />
        <path d="M-10 26Q75 62 160 26Q245 62 310 26" stroke="#2e6b3f" strokeWidth="7" fill="none" />
        <path d="M-10 26Q75 62 160 26Q245 62 310 26" stroke="#d7263d" strokeWidth="5" strokeDasharray="0 16" strokeLinecap="round" fill="none" />
        <rect x="222" y="70" width="58" height="84" rx="4" fill="#102a52" stroke="#3a1f10" strokeWidth="5" />
        <path d="M251 70V154M222 112H280" stroke="#3a1f10" strokeWidth="3" />
        {[[232, 84], [262, 96], [240, 130], [268, 138]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.6" fill="#fff" opacity=".8" />)}
      </>
    )
    case 'floresta': return (
      <>
        {stars(18, 0.5)}
        <circle cx="238" cy="62" r="30" fill="#fff8d6" opacity=".18" /><circle cx="238" cy="62" r="16" fill="#fff8d6" opacity=".9" />
        {[15, 70, 115, 185, 230, 285].map((x) => pine(x, 330, 0.9, '#0e3c3a'))}
        {[30, 95, 205, 270].map((x) => pine(x, 372, 1.1, '#082726'))}
      </>
    )
    case 'aurora': return (
      <>
        {stars(30)}
        {[[44, 0.2], [26, 0.3], [10, 0.5]].map(([w, o]) => <path key={w} d="M-10 130C50 40 120 170 190 90S280 90 310 50" stroke={`url(#${id}rb)`} strokeWidth={w} fill="none" opacity={o} strokeLinecap="round" />)}
        <path d="M0 340Q80 310 150 336T300 326V400H0Z" fill="#0f2f5a" />
      </>
    )
    case 'praia': return (
      <>
        <circle cx="70" cy="292" r="44" fill="#ffe08a" opacity=".95" />
        <rect y="300" width="300" height="100" fill="#1b5f9a" />
        <path d="M45 304H95M52 314H88M58 324H82" stroke="#ffe08a" strokeWidth="3" opacity=".6" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${30 + i * 60} ${316 + i * 10}q15-6 30 0t30 0`} stroke="#8fd0f0" strokeWidth="2" fill="none" opacity=".6" />)}
        <path d="M268 400Q258 350 270 296" stroke="#2a1f3d" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M270 296q-28-22-54-2M270 296q-6-34-30-40M270 296q22-26 46-14M270 296q8-30 32-30" stroke="#24304f" strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    )
    case 'doces': return (
      <>
        {dots(34).map((d, i) => <circle key={i} cx={d.x} cy={d.y * 1.4} r={d.r * 2.2} fill="#fff" opacity=".45" />)}
        {[0, 1].map((k) => (
          <g key={k} transform={k ? 'translate(300 0) scale(-1 1)' : undefined}>
            <path d="M26 190V120a13 13 0 0 1 26 0" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M26 190V120a13 13 0 0 1 26 0" stroke="#ff4d7e" strokeWidth="9" strokeDasharray="6 7" fill="none" />
          </g>
        ))}
        <path d="M262 268V318" stroke="#fff" strokeWidth="3" /><circle cx="262" cy="250" r="16" fill="#ff9ec4" stroke="#8b5fd6" strokeWidth="5" /><circle cx="262" cy="250" r="6" fill="#fff" />
        <path d="M0 340Q70 310 140 336T300 326V400H0Z" fill="#ffd9ea" />
      </>
    )
    default: return (
      <>
        {stars(26)}
        <path d="M0 330Q60 296 120 322T240 316T300 320V400H0Z" fill="#1d4278" /><path d="M0 350Q80 326 150 348T300 340V400H0Z" fill="#26508c" />
      </>
    )
  }
}

export function SceneBackdrop({ scene, id }: { scene: SceneKey; id: string }) {
  const s = SCENES[scene]
  return (
    <g>
      <defs>
        <linearGradient id={id + 'bg'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.bg[0]} /><stop offset="1" stopColor={s.bg[1]} /></linearGradient>
        <linearGradient id={id + 'rb'} x1="0" x2="1"><stop offset="0" stopColor="#5df2c0" /><stop offset=".55" stopColor="#7b6cff" /><stop offset="1" stopColor="#ff7ad9" /></linearGradient>
        <clipPath id={id + 'cp'}><rect width="300" height="400" rx="18" /></clipPath>
      </defs>
      <g clipPath={`url(#${id}cp)`}>
        <rect width="300" height="400" fill={`url(#${id}bg)`} />
        {decor(scene, id)}
      </g>
      <rect width="300" height="400" rx="18" fill="none" stroke="rgba(255,255,255,.14)" />
    </g>
  )
}

const E = (a: string, b: string) => (<><ellipse cx="150" cy="374" rx="144" ry="16" fill={a} /><ellipse cx="150" cy="371" rx="134" ry="12" fill={b} /></>)

export function SceneGround({ scene }: { scene: SceneKey }) {
  switch (scene) {
    case 'lareira': return (<>{E('#f2e2c4', '#9b2335')}<ellipse cx="150" cy="372" rx="116" ry="9" fill="none" stroke="#f2c46d" strokeWidth="1.5" strokeDasharray="2 5" /></>)
    case 'praia': return (<>{E('#c99a55', '#f3d9a0')}<path d={starPath(40, 376, 6, 2.6)} fill="#ff7a59" /><path d={starPath(262, 378, 5, 2.2)} fill="#ff9e7a" /></>)
    case 'doces': return (<>{E('#f08cb5', '#ffe7f0')}{[40, 80, 120, 180, 220, 260].map((x, i) => <circle key={x} cx={x} cy={371 + (i % 2 ? 2 : -2)} r="2" fill="#ff5d93" />)}</>)
    case 'aurora': return E('#7fc4da', '#e6fbff')
    case 'floresta': return E('#a9c6cc', '#eef7f6')
    default: return E('#b9cde2', '#f2f8ff')
  }
}

export function Gifts({ scene }: { scene: SceneKey }) {
  const [b1, r1, b2, r2, b3, r3] = SCENES[scene].gifts
  return (
    <g>
      <rect x="56" y="348" width="38" height="26" rx="2" fill={b1} /><rect x="72" y="348" width="6" height="26" fill={r1} /><rect x="56" y="358" width="38" height="5" fill={r1} opacity=".9" />
      <path d="M75 348c-7-8-13-1-6 0zM75 348c7-8 13-1 6 0z" fill="none" stroke={r1} strokeWidth="2" />
      <rect x="196" y="354" width="30" height="20" rx="2" fill={b2} /><rect x="208" y="354" width="6" height="20" fill={r2} opacity=".9" />
      <rect x="226" y="360" width="22" height="14" rx="2" fill={b3} /><rect x="235" y="360" width="4" height="14" fill={r3} />
    </g>
  )
}
