import { APP_NAME } from '../config/app'

// Logo "mimemora": letras minúsculas desenhadas com traço redondo e macio.
// O pingo do "i" é um coração (mimos), com uma faíscas dourada no fim e um fio ondulado por baixo (memórias).
// Desenhada em SVG para servir também na imagem de compartilhamento: `color` define a cor das letras.
const M = 'M0 30V10M0 18Q0 11 5.5 11Q11 11 11 18V30M11 18Q11 11 16.5 11Q22 11 22 18V30'

export function LogoGlyphs({ color = 'currentColor' }: { color?: string }) {
  return (
    <g>
      <g stroke={color} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={M} />
        <path d="M33 30V11" />
        <path d={M} transform="translate(44 0)" />
        <path d="M0 21H17Q17 11 8.5 11Q0 11 0 20.5Q0 30 8.5 30Q14 30 16.5 26" transform="translate(77 0)" />
        <path d={M} transform="translate(105 0)" />
        <ellipse cx="147" cy="20.5" rx="8.5" ry="9.5" />
        <path d="M0 30V11M0 19Q1 11 9 11" transform="translate(167 0)" />
        <ellipse cx="195.5" cy="20.5" rx="8" ry="9.5" />
        <path d="M203.5 11V30" />
      </g>
      <path d="M0 4.5C-7.5-1-5.5-7.5 0-4C5.5-7.5 7.5-1 0 4.5Z" transform="translate(33 -.5)" fill="#ff9fb8" />
      <path d="M0-6 1.600-1.600 6 0 1.600 1.600 0 6-1.600 1.600-6 0-1.600-1.600Z" transform="translate(214 5)" fill="#f2c46d" />
      <path d="M44 38q10-4 20 0t20 0t20 0t20 0t20 0t20 0t20 0t20 0" stroke="#f2c46d" strokeWidth="1.800" strokeLinecap="round" fill="none" opacity=".55" />
    </g>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="-4 -9 226 52" role="img" aria-label={APP_NAME} className={className} style={{ aspectRatio: '226 / 52' }}>
      <title>{APP_NAME}</title>
      <LogoGlyphs />
    </svg>
  )
}
