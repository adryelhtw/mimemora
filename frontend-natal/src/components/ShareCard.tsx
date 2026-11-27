import type { LightsKey, Ornament, SceneKey, TopperKey, TreeModel } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { LogoGlyphs } from './Logo'

export const SIZE = { link: [1200, 630], post: [1080, 1350], story: [1080, 1920] } as const
export type Fmt = keyof typeof SIZE
type CardProps = { username: string; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
const F = 'Georgia, serif'

// Convite em SVG puro: a mesma arte vira prévia na tela e PNG para baixar. Nunca inclui mensagens.
export function ShareCardSvg({ username, model, lights, topper, scene, ornaments, format, fit }: CardProps & { format: Fmt; fit?: boolean }) {
  const [w, h] = SIZE[format], land = format === 'link', dy = format === 'story' ? 285 : 0
  const th = land ? 570 : 640, tw = th * 0.75
  const tx = land ? 690 + (480 - tw) / 2 : (w - tw) / 2, ty = land ? 30 : 540 + dy
  const x = land ? 70 : w / 2, a = land ? 'start' : 'middle', fs = land ? 62 : 76, lh = land ? 70 : 80, t0 = land ? 205 : 235 + dy
  const bw = 500, bh = land ? 72 : 80, bx = land ? 70 : w / 2 - bw / 2, by = land ? 495 : 1205 + dy
  const n = ornaments.length
  const stars = Array.from({ length: 44 }, (_, i) => ({ x: (i * 337) % w, y: (i * 211) % h, r: 1 + (i % 3) * 0.8 }))
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} {...(fit ? { className: 'block h-auto w-full' } : { width: w, height: h })}>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#173f75" /><stop offset="1" stopColor="#07142a" /></linearGradient>
        <radialGradient id="gl" gradientUnits="userSpaceOnUse" cx={tx + tw / 2} cy={ty + th / 2} r={th * 0.8}><stop offset="0" stopColor="#ffcf6a" stopOpacity=".42" /><stop offset="1" stopColor="#ffcf6a" stopOpacity="0" /></radialGradient>
        <linearGradient id="cta" x1="0" x2="1"><stop offset="0" stopColor="#f2c46d" /><stop offset="1" stopColor="#ef9b3a" /></linearGradient>
      </defs>
      <rect width={w} height={h} fill="url(#bg)" />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity=".55" />)}
      <rect width={w} height={h} fill="url(#gl)" />
      <rect x="14" y="14" width={w - 28} height={h - 28} rx="30" fill="none" stroke="#f2c46d" strokeOpacity=".4" strokeWidth="2" />
      <Tree model={model} lights={lights} topper={topper} scene={scene} backdrop ornaments={ornaments} animated={false} x={tx} y={ty} width={tw} height={th} />
      <text x={x} y={land ? 105 : 120 + dy} fill="#f2c46d" fontFamily={F} fontSize="26" letterSpacing="7" textAnchor={a}>CONVITE · NATAL 2026</text>
      <text x={x} y={t0} fill="#fbf3e4" fontFamily={F} fontWeight="700" fontSize={fs} textAnchor={a}>Deixe um enfeite</text>
      <text x={x} y={t0 + lh} fill="#fbf3e4" fontFamily={F} fontWeight="700" fontSize={fs} textAnchor={a}>na minha árvore</text>
      <text x={x} y={t0 + lh * 2} fill="#f2c46d" fontFamily={F} fontWeight="700" fontSize={fs} textAnchor={a}>de Natal</text>
      <text x={x} y={land ? 420 : 475 + dy} fill="#f2c46d" fontFamily={F} fontStyle="italic" fontSize={land ? 46 : 56} textAnchor={a}>@{username}</text>
      <text x={x} y={land ? 462 : 520 + dy} fill="#fbf3e4" opacity=".75" fontFamily={F} fontSize={land ? 26 : 28} textAnchor={a}>
        {n} {n === 1 ? 'enfeite já pendurado' : 'enfeites já pendurados'} · mensagens secretas
      </text>
      <rect x={bx} y={by} width={bw} height={bh} rx={bh / 2} fill="url(#cta)" />
      <text x={bx + bw / 2} y={by + bh / 2 + 11} fill="#3a1500" fontFamily={F} fontWeight="700" fontSize={land ? 30 : 34} textAnchor="middle">Deixar meu enfeite  →</text>
      {land && <g transform="translate(70 590) scale(.78)" opacity=".85"><LogoGlyphs color="#fbf3e4" /></g>}
      {!land && <g transform={`translate(${w / 2 - 88} ${format === 'story' ? h - 120 : 1308}) scale(.78)`} opacity=".85"><LogoGlyphs color="#fbf3e4" /></g>}
    </svg>
  )
}

export async function cardBlob(props: CardProps, format: Fmt): Promise<Blob> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const [w, h] = SIZE[format]
  const url = URL.createObjectURL(new Blob([renderToStaticMarkup(<ShareCardSvg {...props} format={format} />)], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(img, 0, 0, w, h)
  URL.revokeObjectURL(url)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem'))), 'image/png'))
}

export function saveBlob(b: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
