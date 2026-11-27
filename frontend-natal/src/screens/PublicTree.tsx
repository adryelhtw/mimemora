import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Gift, Profile, Side, TreeData } from '../types'
import { SIDE_CAP } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { Countdown } from '../events/natal-2026/Countdown'
import { DecorateSheet } from '../components/DecorateSheet'
import { BlockSheet } from '../components/BlockSheet'
import { MusicPlayer } from '../components/MusicPlayer'
import { FollowStats } from '../components/FollowStats'
import { ProfileFx } from '../components/ProfileFx'
import { favLabel } from '../lib/dates'
import { AchievementsStrip } from '../components/AchievementsStrip'
import { GiftInfoSheet, SendGiftPanel } from '../components/GiftSheets'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { fetchPublicOpenedLetters } from '../lib/mimos'
import type { PublicLetter } from '../lib/mimos'
import { Avatar } from '../components/ui'
import { errText, fetchIsFollowing, fetchPublic, setFollow } from '../lib/api'
import type { PlaceFn } from '../lib/api'

type State = { s: 'loading' } | { s: 'notfound' } | { s: 'notree'; owner: Profile } | { s: 'ok'; tree: TreeData }
type Props = { me: Profile | null; eventId: string; onPlace: PlaceFn; onNotify: (m: string) => void }

// Página pública /u/:username: mensagens só aparecem depois que o dono abre cada carta.
export function PublicTree({ me, eventId, onPlace, onNotify }: Props) {
  const { username = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [st, setSt] = useState<State>({ s: 'loading' })
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<Side>('frente')
  const [following, setFollowing] = useState<boolean | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [giftInfo, setGiftInfo] = useState<Gift | null>(null)
  const [publicLetters, setPublicLetters] = useState<PublicLetter[]>([])

  const load = useCallback(async () => {
    try {
      const r = await fetchPublic(username.toLowerCase(), eventId)
      if (!r) { setPublicLetters([]); setSt({ s: 'notfound' }); return }
      if (r.tree?.id) {
        setSt({ s: 'ok', tree: r.tree })
        const opened = await fetchPublicOpenedLetters(r.tree.id).catch(() => [])
        setPublicLetters(opened)
      } else { setPublicLetters([]); setSt({ s: 'notree', owner: r.owner }) }
    } catch { setSt({ s: 'notfound' }) }
  }, [username, eventId])

  useEffect(() => { setSt({ s: 'loading' }); load() }, [load])
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [load])

  const owner = st.s === 'ok' ? st.tree.owner : st.s === 'notree' ? st.owner : null
  const t = st.s === 'ok' ? st.tree : null
  const isMe = !!me && !!owner && owner.username === me.username
  useEffect(() => {
    if (!me?.id || !owner?.id || isMe) { setFollowing(null); return }
    let alive = true
    fetchIsFollowing(me.id, owner.id).then((v) => alive && setFollowing(v)).catch(() => alive && setFollowing(null))
    return () => { alive = false }
  }, [me?.id, owner?.id, isMe])

  // Indicação: quem chega por uma árvore e se cadastra depois conta como convidado de quem a compartilhou.
  useEffect(() => {
    if (me || !owner?.username) return
    try { if (!localStorage.getItem('ref')) localStorage.setItem('ref', owner.username) } catch { /* ok */ }
  }, [me, owner?.username])

  if (st.s === 'loading') return <p className="py-20 text-center text-cream/70">Carregando a árvore…</p>
  if (st.s === 'notfound' || !owner) return <p className="py-20 text-center text-cream/70">Não encontramos esse usuário. <Link to="/" className="text-gold">Voltar</Link></p>

  const toggleFollow = async () => {
    if (!me?.id || !owner.id || following === null) return
    const next = !following
    setFollowing(next)
    try { await setFollow(me.id, owner.id, next); onNotify(next ? `Agora você segue @${owner.username}.` : `Você deixou de seguir @${owner.username}.`) }
    catch (e) { setFollowing(!next); onNotify(errText(e)) }
  }

  const done = !!me && !!t && t.ornaments.some((o) => o.from === me.username)
  const counts: Record<Side, number> = { frente: t?.ornaments.filter((o) => o.side === 'frente').length ?? 0, verso: t?.ornaments.filter((o) => o.side === 'verso').length ?? 0 }
  const full = counts.frente + counts.verso >= SIDE_CAP * 2
  const place = async (...a: [Parameters<PlaceFn>[1], string, Side, number]) => {
    const e = await onPlace(t?.id ?? '', ...a)
    await load()   // atualiza as posições ocupadas (e mostra o novo enfeite)
    return e
  }

  return (
    <section className="relative isolate mx-auto max-w-md space-y-5 text-center">
      <ProfileFx kind={owner.effect} />
      <div className="flex flex-col items-center gap-1">
        <Avatar p={owner} size={56} />
        <p className="font-display text-sm uppercase tracking-[.3em] text-gold">Natal 2026</p>
        <h1 className="font-display text-3xl">Árvore de @{owner.username}</h1>
        <p className="text-sm text-cream/70">{owner.name}</p>
        {owner.about && <p className="font-hand text-xl text-cream/90">“{owner.about}”</p>}
        {owner.favoriteDate && <p className="text-xs text-cream/65">data favorita: {favLabel(owner.favoriteDate)}</p>}
        {me && !isMe && <button onClick={toggleFollow} disabled={following === null} className={`mt-1 ${following ? 'rounded-full border border-gold/60 px-4 py-1.5 text-sm font-bold text-gold' : 'pill'}`}>{following ? 'deixar de seguir' : 'seguir'}</button>}
        {me && owner.id && <FollowStats userId={owner.id} refreshKey={following} />}
        {owner.id && <AchievementsStrip userId={owner.id} />}
      </div>

      {t ? (
        <>
          <div className="relative"><div className="glow" /><TreeFlip side={side} model={t.model} lights={t.lights} topper={t.topper} scene={t.scene} backdrop ornaments={t.ornaments} gifts={t.gifts} onGift={setGiftInfo} className="relative mx-auto w-full max-w-[380px]" /></div>
          <SideSwitch side={side} onSide={setSide} counts={counts} />
          <Countdown compact />
          {publicLetters.length > 0 && (
            <div className="space-y-3 text-left">
              <div className="text-center">
                <h2 className="font-display text-xl">Mensagens já abertas</h2>
                <p className="text-xs text-cream/65">Estas são as cartas que @{owner.username} já abriu. As demais continuam em segredo.</p>
              </div>
              {publicLetters.map((letter) => (
                <article key={letter.id} className="card flex gap-3 p-3 text-sm">
                  <OrnamentIcon type={letter.type} className="h-12 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-gold">{letter.from ? `@${letter.from}` : 'alguém (oculto)'}</p>
                    <p className="whitespace-pre-wrap break-words text-cream/90">{letter.message}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!isMe && !me && <button className="cta" onClick={() => navigate(`/entrar?next=${encodeURIComponent(pathname)}`)}>Entrar para deixar um enfeite</button>}
          {!isMe && me && <button className="cta disabled:opacity-60" disabled={done || full} onClick={() => setOpen(true)}>{done ? 'Já enfeitou' : full ? 'Esta árvore já está cheia' : 'Deixar um enfeite'}</button>}
          {me && !isMe && <SendGiftPanel me={me} tree={t} onSent={load} onNotify={onNotify} />}
          <GiftInfoSheet gift={giftInfo} onClose={() => setGiftInfo(null)} />
          {me && <DecorateSheet target={open ? t : null} me={me} onClose={() => setOpen(false)} onPlace={place} />}
        </>
      ) : (
        <p className="card p-6 text-cream/80">@{owner.username} ainda não criou a árvore de Natal.</p>
      )}

      {owner.music && <MusicPlayer url={owner.music} owner={owner.username} />}

      {me && !isMe && owner.id && (
        <>
          <button onClick={() => setBlockOpen(true)} className="text-xs text-cream/45 underline hover:text-cream/80">bloquear usuário</button>
          <BlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} target={{ id: owner.id, username: owner.username }}
            onBlocked={(n) => { setBlockOpen(false); onNotify(n ? `Usuário bloqueado. ${n} ${n === 1 ? 'enfeite foi excluído' : 'enfeites foram excluídos'}.` : 'Usuário bloqueado.'); navigate('/', { replace: true }) }} />
        </>
      )}
    </section>
  )
}
