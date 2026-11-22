import { useState } from 'react'
import type { FormEvent } from 'react'
import { AvatarPicker, resolveAvatar } from '../components/AvatarPicker'
import type { AvatarChoice } from '../components/AvatarPicker'
import { PRESET_AVATARS } from '../components/avatars'
import { isUnique, saveProfile, usernameTaken } from '../lib/api'
import type { DbProfile } from '../lib/api'
import { Logo } from '../components/Logo'
import { USERNAME_MAX, normalizeUsername, usernameError } from '../lib/username'

// Primeiro acesso (Google ou e-mail): escolher username, nome e foto/ícone. Depois, vai para a criação da árvore.
export function Welcome({ db, onDone }: { db: DbProfile; onDone: () => Promise<void> }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState(db.display_name ?? '')
  const [choice, setChoice] = useState<AvatarChoice>(db.avatar_url ? { kind: 'keep' } : { kind: 'preset', key: PRESET_AVATARS[0].key })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const u = normalizeUsername(username), n = name.trim()
    const bad = usernameError(u) || (n ? '' : 'Escreva seu nome.')
    if (bad) { setErr(bad); return }
    setBusy(true); setErr('')
    try {
      if (await usernameTaken(u)) { setErr('Esse username já está em uso. Tente outro.'); return }
      let avatar_url: string | undefined
      try { avatar_url = await resolveAvatar(db.id, choice) } catch (x) { setErr((x as Error).message || 'Não consegui enviar a foto. Tente outra imagem ou escolha um ícone.'); return }
      await saveProfile(db.id, { username: u, display_name: n, ...(avatar_url ? { avatar_url } : {}) })
      await onDone()
    } catch (x) {
      setErr(isUnique(x) ? 'Esse username já está em uso. Tente outro.' : 'Não consegui salvar agora. Tente de novo.')
    } finally { setBusy(false) }
  }

  return (
    <section className="relative z-10 mx-auto flex min-h-[88dvh] max-w-sm flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <div className="mb-2 flex flex-col items-center gap-2"><Logo className="h-9 text-cream" /><p className="font-hand text-2xl leading-none text-gold">bem-vindo(a)!</p></div>
        <h1 className="font-display text-3xl leading-tight">Vamos montar o seu perfil</h1>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <AvatarPicker current={db.avatar_url} name={name} choice={choice} onChange={setChoice} />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-cream/60">Username (aparece nos enfeites)</span>
          <div className="mt-1 flex items-center rounded-xl border border-white/15 bg-black/20 px-4">
            <span className="text-cream/60">@</span>
            <input value={username} maxLength={USERNAME_MAX + 1} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="marina" autoCapitalize="none" autoCorrect="off" className="w-full bg-transparent px-2 py-3 outline-none" />
          </div>
          <span className="text-xs text-cream/50">3 a {USERNAME_MAX} caracteres: letras minúsculas, números ou _</span>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-cream/60">Seu nome</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Marina Souza" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" />
        </label>
        <button disabled={busy} className="cta disabled:opacity-50">{busy ? 'Salvando…' : 'Continuar e criar minha árvore'}</button>
        <p className="min-h-5 text-center text-sm font-bold text-gold" role="alert">{err}</p>
      </form>
    </section>
  )
}
