import type { OrnamentType } from '../types'
import { OrnamentIcon } from '../events/natal-2026/ornaments'

// Ícones padrão para quem não quer enviar foto. Salvos no perfil como "preset:<key>".
export type Preset = { key: string; type: OrnamentType; bg: [string, string] }
export const PRESET_AVATARS: Preset[] = [
  { key: 'rena', type: 'rena', bg: ['#ffd9b8', '#ffb38a'] },
  { key: 'pinguim', type: 'pinguim', bg: ['#cfe8ff', '#9ccdf5'] },
  { key: 'biscoito', type: 'biscoito', bg: ['#ffe3ef', '#ffb8d4'] },
  { key: 'anjo', type: 'anjo', bg: ['#fff3c4', '#ffe08a'] },
  { key: 'boneco', type: 'boneco', bg: ['#dcf3ff', '#b3e0f7'] },
  { key: 'lua', type: 'lua', bg: ['#e6dcff', '#c4b0f5'] },
  { key: 'coracao', type: 'coracao', bg: ['#ffdce6', '#ffb0c6'] },
  { key: 'caneca', type: 'caneca', bg: ['#ffe9d6', '#ffc99e'] },
]
export const presetOf = (url?: string | null) => (url?.startsWith('preset:') ? PRESET_AVATARS.find((p) => p.key === url.slice(7)) : undefined)

export function PresetAvatar({ preset, size }: { preset: Preset; size: number }) {
  return (
    <div style={{ width: size, height: size, background: `linear-gradient(135deg, ${preset.bg[0]}, ${preset.bg[1]})` }} className="grid shrink-0 place-items-center rounded-full ring-2 ring-gold/60">
      <OrnamentIcon type={preset.type} className="h-[72%] w-[72%]" />
    </div>
  )
}
