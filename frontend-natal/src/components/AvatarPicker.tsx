import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PRESET_AVATARS, PresetAvatar, presetOf } from './avatars'
import { uploadAvatar } from '../lib/api'

export type AvatarChoice = { kind: 'keep' } | { kind: 'preset'; key: string } | { kind: 'file'; file: File }

// Devolve o valor para salvar em profiles.avatar_url (undefined = manter como está).
export async function resolveAvatar(userId: string, c: AvatarChoice): Promise<string | undefined> {
  if (c.kind === 'preset') return `preset:${c.key}`
  if (c.kind === 'file') return uploadAvatar(userId, c.file)
  return undefined
}

function FilePreview({ file, size }: { file: File; size: number }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  return <img src={url} alt="Sua foto" style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-gold/60" />
}

type Props = { current?: string | null; name: string; choice: AvatarChoice; onChange: (c: AvatarChoice) => void }

export function AvatarPicker({ current, name, choice, onChange }: Props) {
  const [err, setErr] = useState('')
  const own = current && !presetOf(current) ? current : null // foto própria (Google ou enviada)
  const selected = choice.kind === 'preset' ? choice.key : choice.kind === 'keep' ? presetOf(current)?.key : undefined
  const big = choice.kind === 'preset' ? PRESET_AVATARS.find((p) => p.key === choice.key) : choice.kind === 'keep' ? presetOf(current) : undefined

  const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/') || f.size > 15_000_000) { setErr('Escolha uma imagem de até 15 MB.'); return }
    setErr(''); onChange({ kind: 'file', file: f })
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        {choice.kind === 'file' ? <FilePreview file={choice.file} size={88} />
          : big ? <PresetAvatar preset={big} size={88} />
          : own ? <img src={own} alt="Sua foto" className="h-[88px] w-[88px] rounded-full object-cover ring-2 ring-gold/60" />
          : <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white/10 font-display text-3xl ring-2 ring-gold/60">{(name[0] ?? '?').toLowerCase()}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {own && (
          <button type="button" onClick={() => onChange({ kind: 'keep' })} aria-pressed={choice.kind === 'keep' && !selected} aria-label="Usar a foto atual"
            className={`overflow-hidden rounded-full ${choice.kind === 'keep' && !selected ? 'ring-2 ring-gold' : 'opacity-80'}`}>
            <img src={own} alt="" className="h-12 w-12 object-cover" />
          </button>
        )}
        {PRESET_AVATARS.map((p) => (
          <button key={p.key} type="button" onClick={() => onChange({ kind: 'preset', key: p.key })} aria-pressed={selected === p.key} aria-label={`Ícone ${p.key}`}
            className={`rounded-full ${selected === p.key ? 'ring-2 ring-gold' : 'opacity-80'}`}>
            <PresetAvatar preset={p} size={48} />
          </button>
        ))}
      </div>
      <label className="pill mx-auto flex w-fit cursor-pointer">enviar uma foto<input type="file" accept="image/*" className="sr-only" onChange={pickFile} /></label>
      <p className="min-h-4 text-center text-xs font-bold text-gold" role="alert">{err}</p>
    </div>
  )
}
