import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Gift, Profile, Side, TreeData } from '../types'
import { SIDE_CAP } from '../events/natal-2026/Tree'
import { SideSwitch, TreeFlip } from '../events/natal-2026/TreeFlip'
import { Countdown } from '../events/natal-2026/Countdown'
import { DecorateSheet } from '../components/DecorateSheet'
import { LetterModal } from '../components/LetterModal'
import { BlockSheet } from '../components/BlockSheet'
import { MusicPlayer } from '../components/MusicPlayer'
import { FollowStats } from '../components/FollowStats'
import { ProfileFx } from '../components/ProfileFx'
import { favLabel } from '../lib/dates'
import { AchievementsStrip } from '../components/AchievementsStrip'
import { GiftInfoSheet, SendGiftPanel } from '../components/GiftSheets'
import { Avatar } from '../components/ui'
import { errText, fetchIsFollowing, fetchPublic, setFollow } from '../lib/api'
import type { EventRow, PlaceFn } from '../lib/api'
import { nowMs } from '../lib/clock'
import { orderOrnaments } from '../lib/letters'
import type { LetterData } from '../lib/letters'
import { readLetter } from '../lib/mimos'
import { MemoryExtras } from '../components/MemoryExtras'

type State = { s: 'loading' } | { s: 'notfound' } | { s: 'notree'; owner: Profile } | { s: 'ok'; tree: TreeData }
type Props = { me: Profile | null; eventId: string; event: EventRow; onPlace: PlaceFn; onNotify: (m: string) => void }

// Página pública /u/:username (perfil + árvore). As mensagens só chegam, uma a uma, pela função read_letter (o servidor confere se o dono já
// fez a revelação ou, encerrado o evento, se a memória é pública). Quem tem bloqueio com o dono não encontra a página.
export function PublicTree({ me, eventId, event, onPlace, onNotify }: Props) {
  const { username = '', eventSlug } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [st, setSt] = useState<State>({ s: 'loading' })
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<Side>('frente')
  const [following, setFollowing] = useState<boolean | null>(null)
  const [blockOpen, setBlockOpen] = useState(false)
  const [giftInfo, setGiftInfo] = useState<Gift | null>(null)
  const [letterIdx, setLetterIdx] = useState<number | null>(null)
  const [memOpen, setMemOpen] = useState(false)   // botão "Memórias" (perfil de evento encerrado): começa recolhido

  const load = useCallback(async () => {
    try {
      const r = await fetchPublic(username.toLowerCase(), eventId)
      setSt(!r ? { s: 'notfound' } : r.tree ? { s: 'ok', tree: r.tree } : { s: 'notree', owner: r.owner })
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
  if (st.s === 'notfound' || !owner || (eventSlug && eventSlug !== event.slug)) return <p className="py-20 text-center text-cream/70">Não encontramos esse usuário. <Link to="/" className="text-gold">Voltar</Link></p>

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
  // Mensagens: só para quem está logado e não é o dono. Em andamento: depois da primeira revelação do dono. Encerrado: se a memória for pública.
  const ended = nowMs() >= new Date(event.ends_at).getTime()
  const opened = nowMs() >= new Date(event.opens_at).getTime()
  // Depois do encerramento, /u/:username e /u/:username/natal-2026 mostram o perfil; a memória só aparece ao expandir o botão "Memórias" (e segue a privacidade da memória).
  const canRead = !!t && opened && (ended ? !!t.memoryPublic : !!t.revealedAt)
  const reader = !!me && !isMe && canRead
  const list = t ? orderOrnaments(t.ornaments) : []
  const pickLetter = (o: { id: string }) => { const i = list.findIndex((x) => x.id === o.id); if (i >= 0) setLetterIdx(i) }
  const goLetter = (i: number) => { setLetterIdx(i); const o = list[i]; if (o) setSide(o.side) }
  const readOne = async (o: { id: string }): Promise<LetterData> => ({ body: (await readLetter(o.id)).body, first: false })   // visitante: sempre abertura simples
  const place = async (...a: [Parameters<PlaceFn>[1], string, Side, number]) => {
    const e = await onPlace(t?.id ?? '', ...a)
    await load()   // atualiza as posições ocupadas (e mostra o novo enfeite)
    return e
  }

  return (
    <section className="relative isolate mx-auto max-w-md space-y-5 text-center">
      <ProfileFx kind={owner.effect} full />
      <div className="flex flex-col items-center gap-1">
        <Avatar p={owner} size={56} />
        <p className="font-display text-sm uppercase tracking-[.3em] text-gold">{ended ? 'Perfil' : 'Natal 2026'}</p>
        <h1 className="font-display text-3xl">Árvore de @{owner.username}</h1>
        <p className="text-sm text-cream/70">{owner.name}</p>
        {owner.about && <p className="font-hand text-xl text-cream/90">“{owner.about}”</p>}
        {owner.favoriteDate && <p className="text-xs text-cream/65">data favorita: {favLabel(owner.favoriteDate)}</p>}
        {me && !isMe && <button onClick={toggleFollow} disabled={following === null} className={`mt-1 ${following ? 'rounded-full border border-gold/60 px-4 py-1.5 text-sm font-bold text-gold' : 'pill'}`}>{following ? 'deixar de seguir' : 'seguir'}</button>}
        {me && owner.id && <FollowStats userId={owner.id} refreshKey={following} />}
        {owner.id && <AchievementsStrip userId={owner.id} />}
      </div>

      {ended ? (
        t ? (
          <div className="card overflow-hidden text-left">
            <button type="button" onClick={() => setMemOpen((v) => !v)} aria-expanded={memOpen} aria-controls="memorias-natal-2026"
              className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <span>
                <b className="font-display text-xl text-gold">Memórias</b><br />
                <span className="text-sm text-cream/70">{isMe ? 'Sua memória do Natal 2026' : `Natal 2026 · memória compartilhada por @${owner.username}`}</span>
              </span>
              <span aria-hidden="true" className={`text-xl text-gold transition-transform ${memOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {memOpen && (
              <div id="memorias-natal-2026" className="space-y-4 border-t border-white/10 p-4 text-center">
                <div className="relative"><div className="glow" /><TreeFlip side={side} model={t.model} lights={t.lights} topper={t.topper} scene={t.scene} backdrop ornaments={t.ornaments} gifts={t.gifts} onGift={setGiftInfo} onPick={reader ? pickLetter : undefined} hint={reader} className="relative mx-auto w-full max-w-[380px]" /></div>
                <SideSwitch side={side} onSide={setSide} counts={counts} />
                {reader && <p className="text-sm text-gold">Toque nos enfeites para ler as mensagens ✉️</p>}
                {!me && canRead && <p className="text-sm text-cream/80"><Link to={`/entrar?next=${encodeURIComponent(pathname)}`} className="font-bold text-gold underline">Entre na sua conta</Link> para ler as mensagens dos enfeites.</p>}
                {t.memoryPublic && <p className="text-sm text-cream/70">Memória somente para leitura.</p>}
                {t.id && <MemoryExtras participationId={t.id} isOwner={isMe} />}
                <GiftInfoSheet gift={giftInfo} onClose={() => setGiftInfo(null)} />
                {reader && <LetterModal list={list} index={letterIdx} onIndex={goLetter} onClose={() => setLetterIdx(null)} load={readOne} />}
              </div>
            )}
          </div>
        ) : (
          <div className="card space-y-3 p-5 text-cream/85"><p>@{owner.username} não tem memórias públicas por aqui.</p></div>
        )
      ) : t ? (
        <>
          <div className="relative"><div className="glow" /><TreeFlip side={side} model={t.model} lights={t.lights} topper={t.topper} scene={t.scene} backdrop ornaments={t.ornaments} gifts={t.gifts} onGift={setGiftInfo} onPick={reader ? pickLetter : undefined} hint={reader} className="relative mx-auto w-full max-w-[380px]" /></div>
          <SideSwitch side={side} onSide={setSide} counts={counts} />
          {reader && <p className="text-sm text-gold">Toque nos enfeites para ler as mensagens ✉️</p>}
          {!me && canRead && <p className="text-sm text-cream/80"><Link to={`/entrar?next=${encodeURIComponent(pathname)}`} className="font-bold text-gold underline">Entre na sua conta</Link> para ler as mensagens dos enfeites.</p>}
          <Countdown compact />
          {opened && !isMe && <p className="text-sm text-cream/70">O período de enfeites terminou em 25/12. Você ainda pode enviar um Brilho Mágico até 31/12.</p>}
          {!opened && !isMe && !me && <button className="cta" onClick={() => navigate(`/entrar?next=${encodeURIComponent(pathname)}`)}>Entrar para deixar um enfeite</button>}
          {!opened && !isMe && me && <button className="cta disabled:opacity-60" disabled={done || full} onClick={() => setOpen(true)}>{done ? 'Já enfeitou' : full ? 'Esta árvore já está cheia' : 'Deixar um enfeite'}</button>}
          {me && !isMe && <SendGiftPanel me={me} tree={t} onSent={load} onNotify={onNotify} boxesOpen={!opened} />}
          <GiftInfoSheet gift={giftInfo} onClose={() => setGiftInfo(null)} />
          {!opened && me && <DecorateSheet target={open ? t : null} me={me} onClose={() => setOpen(false)} onPlace={place} />}
          {reader && <LetterModal list={list} index={letterIdx} onIndex={goLetter} onClose={() => setLetterIdx(null)} load={readOne} />}
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
