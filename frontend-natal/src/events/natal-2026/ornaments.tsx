import type { ReactNode } from 'react'
import type { OrnamentType } from '../../types'

export const ORNAMENTS: { id: OrnamentType; name: string }[] = [
  { id: 'bola-rubi', name: 'Bola rubi' }, { id: 'bola-ouro', name: 'Bola dourada' }, { id: 'bola-gelo', name: 'Bola de gelo' },
  { id: 'estrela', name: 'Estrela' }, { id: 'sino', name: 'Sino' }, { id: 'meia', name: 'Meia' },
  { id: 'presente', name: 'Presente' }, { id: 'bengala', name: 'Bengala' }, { id: 'boneco', name: 'Boneco de neve' }, { id: 'coracao', name: 'Coração' },
  { id: 'biscoito', name: 'Biscoito' }, { id: 'rena', name: 'Rena' }, { id: 'pinguim', name: 'Pinguim' },
  { id: 'anjo', name: 'Anjinho' }, { id: 'floco', name: 'Floco' }, { id: 'pinha', name: 'Pinha' },
  { id: 'vela', name: 'Vela' }, { id: 'carta', name: 'Cartinha' }, { id: 'caneca', name: 'Chocolate quente' }, { id: 'lua', name: 'Lua sonolenta' },
]

export const starPath = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R
    return `${i ? 'L' : 'M'}${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`
  }).join('') + 'Z'

const G = '#e8c36a'
const shine = (x: number, y: number) => <ellipse cx={x} cy={y} rx="3.4" ry="6" fill="#fff" opacity=".5" transform={`rotate(25 ${x} ${y})`} />
const ball = (c: string, band: string) => (
  <>
    <rect x="16" y="6" width="8" height="5" rx="1.5" fill={G} />
    <circle cx="20" cy="28" r="15" fill={c} />
    <path d="M6 27q14 9 28 0" stroke={band} strokeWidth="2.6" fill="none" />
    <circle cx="20" cy="28" r="14.5" fill="none" stroke="rgba(0,0,0,.18)" />
    {shine(14, 21)}
  </>
)

// Cada desenho cabe em 40x48, com o gancho no topo (20,0).
const ART: Record<OrnamentType, ReactNode> = {
  'bola-rubi': ball('#c9172f', G),
  'bola-ouro': ball('#e5b94a', '#fff3c4'),
  'bola-gelo': ball('#7fc4ea', '#e8f6ff'),
  estrela: (
    <>
      <path d={starPath(20, 25, 17, 7.5)} fill="#f4c542" stroke="#c99414" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={starPath(20, 25, 9, 4)} fill="#fff" opacity=".4" />
    </>
  ),
  sino: (
    <>
      <path d="M20 9C13 9 11 19 10 29L6 36H34L30 29C29 19 27 9 20 9Z" fill="#e8b93e" stroke="#b98a1c" />
      <circle cx="20" cy="39" r="3.2" fill="#b98a1c" />
      <path d="M20 12 14 7v8zM20 12l6-5v8z" fill="#c9172f" />
      <path d="M14 18c1-4 3-6 5-7" stroke="#fff" opacity=".5" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  meia: (
    <>
      <path d="M14 12h14v20q9 2 9 9 0 5-6 5H20q-6 0-6-6z" fill="#c9172f" />
      <rect x="12" y="8" width="18" height="7" rx="3" fill="#fff" />
      <path d="M28 40q9-1 9 3 0 3-6 3h-5z" fill="#fff" opacity=".85" />
      <path d="M17 18v14" stroke="#fff" opacity=".25" strokeWidth="2" />
    </>
  ),
  presente: (
    <>
      <rect x="7" y="22" width="26" height="21" rx="2" fill="#1f8a5b" />
      <rect x="5" y="17" width="30" height="8" rx="2" fill="#2fae78" />
      <rect x="18" y="17" width="4" height="26" fill={G} />
      <ellipse cx="14.5" cy="14" rx="5" ry="3.2" fill="none" stroke={G} strokeWidth="2" transform="rotate(-25 14.5 14)" />
      <ellipse cx="25.5" cy="14" rx="5" ry="3.2" fill="none" stroke={G} strokeWidth="2" transform="rotate(25 25.5 14)" />
    </>
  ),
  bengala: (
    <>
      <path d="M27 44V16a8.5 8.5 0 0 0-17 0" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M27 44V16a8.5 8.5 0 0 0-17 0" fill="none" stroke="#d7263d" strokeWidth="7" strokeDasharray="4.5 5" />
    </>
  ),
  boneco: (
    <>
      <circle cx="20" cy="36" r="10" fill="#fff" stroke="#bcd7ee" />
      <circle cx="20" cy="20" r="7.5" fill="#fff" stroke="#bcd7ee" />
      <rect x="15" y="9" width="10" height="7" rx="1" fill="#2b2b3a" />
      <rect x="12.5" y="15" width="15" height="2.4" fill="#2b2b3a" />
      <path d="M13 26q7 4 14 0v3q-7 4-14 0z" fill="#c9172f" />
      <path d="M20 21l7 1.6-7 1.6z" fill="#f08a24" />
      <circle cx="17" cy="19" r=".9" fill="#222" /><circle cx="23" cy="19" r=".9" fill="#222" />
      <circle cx="20" cy="34" r="1" fill="#222" /><circle cx="20" cy="38" r="1" fill="#222" />
    </>
  ),
  coracao: (
    <>
      <path d="M20 42C8 32 6 24 10 19c4-5 10-2 10 3 0-5 6-8 10-3 4 5 2 13-10 23z" fill="#e63b6a" />
      <ellipse cx="13.5" cy="22" rx="2.4" ry="4" fill="#fff" opacity=".5" transform="rotate(30 13.5 22)" />
    </>
  ),
  biscoito: (
    <>
      <g fill="#c4813f">
        <circle cx="20" cy="15" r="6.5" /><rect x="13" y="20" width="14" height="14" rx="5" />
        <rect x="4" y="20" width="14" height="6" rx="3" /><rect x="22" y="20" width="14" height="6" rx="3" />
        <rect x="12.5" y="31" width="7" height="12" rx="3.5" /><rect x="20.5" y="31" width="7" height="12" rx="3.5" />
      </g>
      <path d="M6.5 25.5h3M30.5 25.5h3M13.5 41.5h4M22.5 41.5h4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="14" r=".9" fill="#4a2a10" /><circle cx="22.5" cy="14" r=".9" fill="#4a2a10" />
      <path d="M17.5 17q2.5 2 5 0" stroke="#4a2a10" strokeWidth=".9" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="25" r="1.3" fill="#c9172f" /><circle cx="20" cy="29.5" r="1.3" fill="#1f8a5b" />
    </>
  ),
  rena: (
    <>
      <path d="M20 8V20" stroke={G} strokeWidth="1.2" />
      <g stroke="#8a5a2b" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M14 22 12 11M12 11 8 8.5M12.6 15.5 8.5 14.5" /><path d="M26 22 28 11M28 11 32 8.5M27.4 15.5 31.5 14.5" />
      </g>
      <ellipse cx="11" cy="25" rx="3.6" ry="2.4" fill="#a8723c" transform="rotate(-25 11 25)" />
      <ellipse cx="29" cy="25" rx="3.6" ry="2.4" fill="#a8723c" transform="rotate(25 29 25)" />
      <ellipse cx="20" cy="31" rx="10" ry="11.5" fill="#b9814a" /><ellipse cx="20" cy="37" rx="6" ry="4.6" fill="#e2b98a" />
      <circle cx="15.5" cy="28" r="1.3" fill="#2a1608" /><circle cx="24.5" cy="28" r="1.3" fill="#2a1608" />
      <circle cx="20" cy="36" r="3.3" fill="#e0243c" /><circle cx="19" cy="35" r="1" fill="#fff" opacity=".7" />
    </>
  ),
  pinguim: (
    <>
      <ellipse cx="20" cy="29" rx="10.5" ry="14" fill="#22314a" /><ellipse cx="20" cy="33" rx="6.6" ry="9.5" fill="#f4f7fb" />
      <path d="M13 28q-6 3-4 9M27 28q6 3 4 9" stroke="#22314a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M12.5 26q7.5 3 15 0v3q-7.5 3-15 0z" fill="#c9172f" />
      <path d="M12 16a8 8 0 0 1 16 0z" fill="#c9172f" /><rect x="11" y="15" width="18" height="3" rx="1.5" fill="#fff" /><circle cx="20" cy="9" r="2.6" fill="#fff" />
      <circle cx="16.8" cy="21.5" r="1.2" fill="#fff" /><circle cx="23.2" cy="21.5" r="1.2" fill="#fff" />
      <circle cx="16.8" cy="21.5" r=".5" fill="#111" /><circle cx="23.2" cy="21.5" r=".5" fill="#111" />
      <path d="M17.6 23.6h4.8L20 26.6z" fill="#f08a24" />
      <ellipse cx="16" cy="43" rx="3.6" ry="1.8" fill="#f08a24" /><ellipse cx="24" cy="43" rx="3.6" ry="1.8" fill="#f08a24" />
    </>
  ),
  anjo: (
    <>
      <ellipse cx="11" cy="27" rx="6.5" ry="12" fill="#fff" opacity=".92" transform="rotate(-25 11 27)" />
      <ellipse cx="29" cy="27" rx="6.5" ry="12" fill="#fff" opacity=".92" transform="rotate(25 29 27)" />
      <path d="M20 21 12 42h16z" fill="#fdfaf2" stroke="#d9c8a0" /><circle cx="20" cy="17" r="5.2" fill="#ffd9b3" />
      <path d="M15 15q5-6 10 0z" fill="#e8c36a" /><ellipse cx="20" cy="9.5" rx="5.6" ry="1.8" fill="none" stroke="#f2c46d" strokeWidth="1.6" />
      <circle cx="18.3" cy="17.3" r=".7" fill="#7a4a2a" /><circle cx="21.7" cy="17.3" r=".7" fill="#7a4a2a" />
      <path d="M18.4 19.3q1.6 1.2 3.2 0" stroke="#c46a5a" strokeWidth=".8" fill="none" strokeLinecap="round" />
    </>
  ),
  floco: (
    <>
      <rect x="16" y="6" width="8" height="5" rx="1.5" fill={G} /><circle cx="20" cy="28" r="15" fill="#2b6cb5" />
      <circle cx="20" cy="28" r="14.5" fill="none" stroke="rgba(255,255,255,.25)" />
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 20 28)`} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M20 17v22M17.2 20.5 20 23.3l2.8-2.8M17.2 35.5 20 32.7l2.8 2.8" />
        </g>
      ))}
      {shine(12.5, 20)}
    </>
  ),
  pinha: (
    <>
      <ellipse cx="20" cy="29" rx="9.5" ry="14.5" fill="#8a5a33" />
      {[21, 26, 31, 36].map((y) => {
        const w = 9.5 * Math.sqrt(1 - ((y - 29) / 14.5) ** 2)
        return (
          <g key={y} fill="none">
            <path d={`M${20 - w} ${y}q${w} 5 ${2 * w} 0`} stroke="#4f301b" strokeWidth="1.6" />
            <path d={`M${20 - w + 1.5} ${y - 1}q${w - 1.5} 3.5 ${2 * w - 3} 0`} stroke="#f3f9ff" strokeWidth="1" opacity=".75" />
          </g>
        )
      })}
      <path d="M20 13 15 9v7zM20 13l5-4v7z" fill="#c9172f" /><circle cx="20" cy="13" r="1.6" fill="#a3142f" />
    </>
  ),
  vela: (
    <>
      <circle cx="20" cy="15" r="9" fill="#ffd36b" opacity=".25" />
      <path d="M20 8C16 14 16 19 20 21C24 19 24 14 20 8Z" fill="#ffb347" /><path d="M20 13C18.5 16 18.5 18.5 20 19.5C21.500 18.5 21.5 16 20 13Z" fill="#fff3b0" />
      <rect x="15" y="22" width="10" height="19" rx="1.5" fill="#fdf6e3" stroke="#e5d3a8" /><path d="M20 21v2" stroke="#5b3a1a" />
      <path d="M15 23h10v2q-1 4-2.500 1.200Q21 29 19.500 25.500Q18 28 16.500 25Q15.500 26 15 24Z" fill="#fff" />
      <ellipse cx="20" cy="42" rx="11" ry="3" fill="#d9a93a" />
      <ellipse cx="13" cy="41" rx="4" ry="2" fill="#1f8a5b" transform="rotate(-20 13 41)" /><ellipse cx="27" cy="41" rx="4" ry="2" fill="#1f8a5b" transform="rotate(20 27 41)" />
      <circle cx="20" cy="40.500" r="1.800" fill="#c9172f" />
    </>
  ),
  carta: (
    <>
      <path d="M20 8V16" stroke={G} strokeWidth="1.2" />
      <rect x="6" y="16" width="28" height="23" rx="2" fill="#fbf3e4" stroke="#d9c8a0" />
      <path d="M6 17 20 30 34 17" fill="#f0e3c8" stroke="#d9c8a0" />
      <rect x="27" y="19" width="5" height="6" fill="#2f6fb5" />
      <circle cx="20" cy="29" r="5.200" fill="#c9172f" stroke="#a3142f" />
      <path d="M20 31.500C17.200 29.400 17.800 27.400 19.200 27.400c.5 0 .8.300.8.700 0-.4.300-.7.800-.7 1.400 0 2 2 -.8 4.100Z" fill="#fff" opacity=".9" />
    </>
  ),
  caneca: (
    <>
      <path d="M20 8V16" stroke={G} strokeWidth="1.2" />
      <path d="M16 10q-2-3 0-5M24 10q-2-3 0-5" stroke="#fff" strokeWidth="1.200" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M29 24q8 1 6 8q-1 4-6 4" stroke="#c9172f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M9 20h20v13q0 8-10 8t-10-8z" fill="#c9172f" />
      <path d="M9 30h20" stroke="#fff" strokeWidth="2" strokeDasharray="3 3" />
      <ellipse cx="19" cy="20" rx="10.500" ry="3.200" fill="#fff3d6" /><ellipse cx="19" cy="20" rx="9" ry="2.300" fill="#6b3f1f" />
      <rect x="13" y="15.500" width="5.500" height="4.500" rx="1.800" fill="#fff" /><rect x="20" y="14.500" width="5.500" height="4.500" rx="1.800" fill="#ffe9f0" />
    </>
  ),
  lua: (
    <>
      <path d="M24 13A15.500 15.500 0 1 0 24 43A11.500 11.500 0 1 1 24 13Z" fill="#f6d46f" stroke="#c99414" strokeWidth="1" />
      <path d="M12 26q2 2 4 0" stroke="#7a4a2a" strokeWidth="1.200" fill="none" strokeLinecap="round" />
      <path d="M11 30q3 2.500 6 0" stroke="#c46a5a" strokeWidth="1" fill="none" strokeLinecap="round" /><circle cx="11" cy="28.500" r="1.800" fill="#ff9e9e" opacity=".7" />
      <path d="M10 19Q9 9 22 10L17 21Z" fill="#c9172f" /><path d="M10 19 17 21" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" /><circle cx="22" cy="9.500" r="2.500" fill="#fff" />
      <path d="M29 22h4l-4 5h4M33 15h3l-3 4h3" stroke="#fff" strokeWidth="1.200" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export function OrnamentArt({ type }: { type: OrnamentType }) {
  return (
    <>
      <path d="M20 0v8" stroke={G} strokeWidth="1.2" />
      {ART[type]}
    </>
  )
}

export function OrnamentIcon({ type, className }: { type: OrnamentType; className?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <OrnamentArt type={type} />
    </svg>
  )
}
