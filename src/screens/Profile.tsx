import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Profile as P, Side, TreeData } from '../types'
import { Avatar, Sheet } from '../components/ui'
import { Icon } from '../components/Icons'
import { ShareButton } from '../components/ShareButton'
import { SIDE_CAP, Tree } from '../events/natal-2026/Tree'
import { errText, fetchBlocked, saveProfile, unblockUser } from '../lib/api'
import { AvatarPicker, resolveAvatar } from '../components/AvatarPicker'
import type { AvatarChoice } from '../components/AvatarPicker'
import { parseMusic } from '../lib/music'
import { FollowStats } from '../components/FollowStats'
import { MusicPlayer } from '../components/MusicPlayer'
import { ProfileFx } from '../components/ProfileFx'
import { AchievementsStrip } from '../components/AchievementsStrip'
import { fetchAchievements, fetchCosmetics, setFeaturedAchievements } from '../lib/mimos'
import type { AchievementRow } from '../lib/mimos'
import { Medal } from '../components/Medal'
import { FAV_DATES, favLabel } from '../lib/dates'

type Props = { me: P; tree: TreeData; onShare: () => void; onSaved: () => Promise<void>; onLogout: () => void; onNotify: (m: string) => void }

export function ProfileScreen({ me, tree, onShare, onSaved, onLogout, onNotify }: Props) {
  const [copied, setCopied] = useState(false)
  const [edit, setEdit] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [cos, setCos] = useState<{ frame: string | null; effect: string | null }>({ frame: null, effect: null })
  useEffect(() => { if (me.id) fetchCosmetics(me.id).then(setCos).catch(() => undefined) }, [me.id])
  const link = `${window.location.origin}/u/${me.username}`
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* sem permissão */ } }
  const n = (s: Side) => tree.ornaments.filter((o) => o.side === s).length
  return (
    <section className="relative isolate mx-auto max-w-md space-y-5 text-center">
      <ProfileFx kind={cos.effect ?? undefined} />
      <div className="flex flex-col items-center gap-2">
        <Avatar p={{ ...me, frame: cos.frame ?? undefined }} size={96} />
        <h1 className="font-display text-3xl">{me.name}</h1>
        <p className="text-gold">@{me.username}</p>
        {me.about && <p className="font-hand text-xl text-cream/90">“{me.about}”</p>}
        {me.favoriteDate && <p className="text-xs text-cream/65">data favorita: {favLabel(me.favoriteDate)}</p>}
        {me.id && <FollowStats userId={me.id} />}
        {me.id && <AchievementsStrip userId={me.id} own />}
        <button onClick={() => setEdit(true)} className="text-sm font-bold text-cream/70 underline">Editar perfil</button>
      </div>
      <Tree model={tree.model} lights={tree.lights} topper={tree.topper} scene={tree.scene} ornaments={tree.ornaments} animated={false} base={false} tags={false} className="mx-auto h-44" />
      <div className="card flex items-center gap-2 p-2 pl-4 text-left">
        <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
        <button onClick={copy} className="pill"><Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar'}</button>
      </div>
      <ShareButton onClick={onShare} />
      {me.music && <MusicPlayer url={me.music} owner={me.username} />}
      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/loja" className="pill">loja e mimos</Link>
        <Link to="/conquistas" className="pill">conquistas</Link>
        <Link to={`/u/${me.username}`} className="pill">ver como os outros veem</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="card p-3"><b className="block font-display text-2xl text-gold">{n('frente')}/{SIDE_CAP}</b>na frente</div>
        <div className="card p-3"><b className="block font-display text-2xl text-gold">{n('verso')}/{SIDE_CAP}</b>no verso</div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button onClick={() => setBlocked(true)} className="font-bold text-cream/70 underline">Usuários bloqueados</button>
        <button onClick={onLogout} className="font-bold text-cream/70 underline">Sair da conta</button>
      </div>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Editar perfil"><EditForm me={me} onSaved={onSaved} onClose={() => setEdit(false)} /></Sheet>
      <Sheet open={blocked} onClose={() => setBlocked(false)} title="Usuários bloqueados"><BlockedList onNotify={onNotify} /></Sheet>
    </section>
  )
}

function BlockedList({ onNotify }: { onNotify: (m: string) => void }) {
  const [list, setList] = useState<P[] | null>(null)
  const [err, setErr] = useState('')
  const load = () => fetchBlocked().then(setList).catch(() => setErr('Não consegui carregar a lista agora.'))
  useEffect(() => { load() }, [])
  const unblock = async (u: P) => {
    try {
      await unblockUser(u.id ?? '')
      onNotify(`@${u.username} foi desbloqueado. Os enfeites antigos não voltam; novos podem ser enviados normalmente.`)
      load()
    } catch (e) { setErr(errText(e)) }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-cream/70">Pessoas bloqueadas não veem o seu perfil nem a sua árvore, e você também não vê os dela.</p>
      {!list && !err && <p className="text-cream/70">Carregando…</p>}
      {list && !list.length && <p className="card p-4 text-center text-cream/70">Você não bloqueou ninguém.</p>}
      {list?.map((u) => (
        <div key={u.id} className="card flex items-center gap-3 p-3">
          <Avatar p={u} size={40} />
          <div className="min-w-0 flex-1"><b className="block truncate">{u.name}</b><span className="text-sm text-cream/70">@{u.username}</span></div>
          <button onClick={() => unblock(u)} className="pill">Desbloquear</button>
        </div>
      ))}
      <p className="min-h-5 text-center text-sm font-bold text-gold" role="alert">{err}</p>
    </div>
  )
}

function EditForm({ me, onSaved, onClose }: { me: P; onSaved: () => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(me.name)
  const [about, setAbout] = useState(me.about ?? '')
  const [fav, setFav] = useState(me.favoriteDate ?? '')
  const [music, setMusic] = useState(me.music ?? '')
  const [choice, setChoice] = useState<AvatarChoice>({ kind: 'keep' })
  const [ach, setAch] = useState<AchievementRow[] | null>(null)
  const [featured, setFeatured] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetchAchievements().then((r) => {
      const got = r.filter((x) => x.unlocked)
      setAch(got)
      setFeatured(got.filter((x) => x.featured_rank).sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0)).map((x) => x.id))
    }).catch(() => setAch([]))
  }, [])
  const toggle = (id: string) => setFeatured((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length >= 3 ? f : [...f, id]))

  const save = async () => {
    if (!me.id || !name.trim()) { setErr('Escreva seu nome.'); return }
    if (music.trim() && !parseMusic(music)) { setErr('Link de música não reconhecido. Use um link do YouTube ou do SoundCloud.'); return }
    setBusy(true); setErr('')
    try {
      let avatar_url: string | undefined
      try { avatar_url = await resolveAvatar(me.id, choice) } catch (x) { setErr((x as Error).message || 'Não consegui enviar a foto.'); return }
      try {
        await saveProfile(me.id, { display_name: name.trim(), about: about.trim() || null, favorite_date: fav || null, music_url: music.trim() || null, ...(avatar_url ? { avatar_url } : {}) })
      } catch { setErr('Não consegui salvar o perfil agora. Tente de novo.'); return }
      if (ach) { try { await setFeaturedAchievements(featured) } catch { setErr('O perfil foi salvo, mas não consegui salvar as conquistas em destaque.'); return } }
      await onSaved()
      onClose()
    } finally { setBusy(false) }
  }
  const field = 'mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3'
  return (
    <div className="space-y-4">
      <AvatarPicker current={me.photo} name={me.name} choice={choice} onChange={setChoice} />
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-cream/60">Nome</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-cream/60">Sobre mim (opcional)</span>
        <input value={about} maxLength={60} onChange={(e) => setAbout(e.target.value)} placeholder="uma frase curtinha sobre você" className={field} />
        <span className="text-xs text-cream/50">{about.length}/60 · aparece no seu perfil público</span>
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-cream/60">Data favorita (opcional)</span>
        <select value={fav} onChange={(e) => setFav(e.target.value)} className={field} style={{ colorScheme: 'dark' }}>
          <option value="">nenhuma</option>
          {FAV_DATES.map((d) => <option key={d.key} value={d.key}>{d.emoji} {d.label}</option>)}
        </select>
      </label>
      <div>
        <span className="text-xs uppercase tracking-widest text-cream/60">Conquistas em destaque (até 3)</span>
        {ach && !ach.length && <p className="mt-1 text-xs text-cream/55">Desbloqueie conquistas para destacá-las no seu perfil. As outras ficam só com você; os outros veem apenas quantas você tem.</p>}
        {!!ach?.length && (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ach.map((a) => {
                const on = featured.includes(a.id)
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on} className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-[11px] font-bold ${on ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/5'}`}>
                    <Medal icon={a.icon} size={36} />{a.name}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 text-xs text-cream/50">{featured.length}/3 escolhidas · quem visita vê só essas e o total de conquistas.</p>
          </>
        )}
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-cream/60">Música do seu perfil (opcional)</span>
        <input value={music} maxLength={300} onChange={(e) => setMusic(e.target.value)} placeholder="cole um link do YouTube ou do SoundCloud" inputMode="url" className={field} />
        <span className="text-xs text-cream/50">Fica no seu perfil em todos os eventos e toca em loop quando alguém visita a sua árvore. Deixe em branco para não ter música.</span>
      </label>
      <p className="text-xs text-cream/50">O username (@{me.username}) não muda, para que os links compartilhados continuem funcionando.</p>
      <button className="cta disabled:opacity-50" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>
      <p className="min-h-5 text-center text-sm font-bold text-gold" role="alert">{err}</p>
    </div>
  )
}
