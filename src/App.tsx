import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CONTACT_EMAIL } from './config/app'
import type { Look, TreeData } from './types'
import { AuthProvider, useAuth } from './lib/auth'
import { configStatus, configured } from './lib/supabase'
import { createTree, fetchEvent, fetchPublic, isUnique, placeOrnament, toProfile } from './lib/api'
import type { EventRow, PlaceFn } from './lib/api'
import { clearDraft } from './lib/treeStore'
import { publishCard } from './lib/card'
import { Avatar, Snow, SnowToggle, Toast } from './components/ui'
import { Icon } from './components/Icons'
import type { IconName } from './components/Icons'
import { ErrorBanner, ErrorBoundary } from './components/ErrorBoundary'
import { Logo } from './components/Logo'
import { ShareSheet } from './components/ShareSheet'
import { Home } from './screens/Home'
import { Login, NEXT_KEY } from './screens/Login'
import { Welcome } from './screens/Welcome'
import { ResetPassword } from './screens/ResetPassword'
import { CreateTree } from './screens/CreateTree'
import { Decorate } from './screens/Decorate'
import { Memories } from './screens/Memories'
import { Events } from './screens/Events'
import { ProfileScreen } from './screens/Profile'
import { PublicTree } from './screens/PublicTree'

const TABS: [string, IconName, string][] = [['/', 'tree', 'Árvore'], ['/enfeitar', 'gift', 'Enfeitar'], ['/memorias', 'heart', 'Memórias'], ['/eventos', 'cal', 'Eventos'], ['/perfil', 'user', 'Perfil']]

const SNOW_KEY = 'neve:ligada'
// Neve ligada por padrão; a escolha feita no botão fica salva.
const loadSnow = () => {
  try { const v = localStorage.getItem(SNOW_KEY); if (v !== null) return v === '1' } catch { /* sem armazenamento */ }
  return true
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const Notice = ({ title, children }: { title: string; children: string }) => (
  <div className="mx-auto max-w-md space-y-2 py-20 text-center"><h1 className="font-display text-2xl text-gold">{title}</h1><p className="text-cream/80">{children}</p></div>
)

function AppRoutes() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { ready, session, profile: db, profileError, reloadProfile, signOut } = useAuth()
  const [event, setEvent] = useState<EventRow | null | undefined>(undefined) // undefined = carregando
  const [eventErr, setEventErr] = useState('')
  const [mineBox, setMineBox] = useState<{ user: string; tree: TreeData | null } | null>(null)
  const [justCreated, setJustCreated] = useState(false)
  const [share, setShare] = useState(false)
  const [toast, setToast] = useState('')
  const [snow, setSnow] = useState(loadSnow)
  const username = db?.username ?? null
  const me = db && db.username ? toProfile(db) : null
  // undefined = ainda carregando a árvore deste usuário (evita redirecionar para "criar árvore" por engano)
  const mine: TreeData | null | undefined = !username ? null : mineBox?.user === username ? mineBox.tree : undefined
  const setMine = (t: TreeData | null) => { if (username) setMineBox({ user: username, tree: t }) }

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 4500) }
  const switchSnow = () => {
    const next = !snow
    setSnow(next)
    try { localStorage.setItem(SNOW_KEY, next ? '1' : '0') } catch { /* sem armazenamento */ }
  }

  useEffect(() => {
    if (!configured) { setEvent(null); return }
    fetchEvent().then((e) => { setEvent(e); if (!e) setEventErr('a consulta funcionou, mas não voltou nenhuma linha (o evento não foi inserido ou a leitura está bloqueada)') })
      .catch((e) => { setEvent(null); setEventErr((e as { message?: string })?.message ?? String(e)) })
  }, [])

  const loadMine = useCallback(async () => {
    if (!event || !username) return null
    return (await fetchPublic(username, event.id))?.tree ?? null
  }, [event, username])

  useEffect(() => {
    if (!username || !event) return
    let alive = true
    fetchPublic(username, event.id)
      .then((r) => alive && setMineBox({ user: username, tree: r?.tree ?? null }))
      .catch(() => alive && setMineBox({ user: username, tree: null }))
    return () => { alive = false }
  }, [username, event])

  // Ao voltar para a aba, atualiza os enfeites recebidos.
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') loadMine().then((t) => t && setMine(t)).catch(() => undefined) }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [loadMine])

  // Mantém a imagem de compartilhamento (prévia do link) atualizada com a árvore e os enfeites recebidos.
  useEffect(() => {
    if (!db?.id || !username || !mine) return
    const key = `${mine.model}|${mine.lights}|${mine.topper}|${mine.scene}|${mine.ornaments.map((o) => o.id).sort().join(',')}`
    const ls = `card-key:${db.id}`
    try { if (localStorage.getItem(ls) === key) return } catch { /* ok */ }
    const t = setTimeout(() => {
      publishCard(db.id, { username, model: mine.model, lights: mine.lights, topper: mine.topper, scene: mine.scene, ornaments: mine.ornaments }, db.card_url)
        .then(() => { try { localStorage.setItem(ls, key) } catch { /* ok */ } })
        .catch(() => undefined)
    }, 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.id, username, mine])

  // Quem veio de um link de amigo volta para ele, mas só depois de ter a própria árvore.
  const takeNext = () => {
    try { const n = localStorage.getItem(NEXT_KEY); if (n) { localStorage.removeItem(NEXT_KEY); return n } } catch { /* ok */ }
    return null
  }
  useEffect(() => {
    if (!session || !username || !mine || justCreated) return
    const next = takeNext()
    if (next) navigate(next, { replace: true })
  }, [session, username, mine, justCreated, navigate])

  // A aparência só é definida aqui, uma única vez (INSERT). Depois, o banco bloqueia qualquer alteração.
  const confirmTree = async (l: Look): Promise<string | null> => {
    if (!db?.username || !event) return 'Não foi possível criar a árvore agora.'
    try { await createTree(db.id, event.id, l) } catch (e) {
      const code = (e as { code?: string } | null)?.code
      return isUnique(e) ? 'Você já criou a árvore deste Natal.' : code === '42501' ? 'O período para criar árvores terminou.' : 'Não consegui criar a árvore agora. Tente de novo.'
    }
    clearDraft(db.id)
    try { setMine(await loadMine()) } catch { setMine(null) }
    setJustCreated(true)
    return null
  }

  const place: PlaceFn = async (...args) => {
    const e = await placeOrnament(...args)
    if (!e) flash('Enfeite pendurado! A mensagem fica secreta até 25/12 🎄')
    return e
  }

  const bare = ['/entrar', '/bem-vindo', '/criar-arvore', '/redefinir-senha'].includes(pathname)
  const loading = !ready || event === undefined || (!!username && mine === undefined)
  const openShare = () => setShare(true)
  const gate = (el: ReactElement) => (!session ? <Navigate to="/entrar" replace /> : !username ? <Navigate to="/bem-vindo" replace /> : !mine ? <Navigate to="/criar-arvore" replace /> : el)
  const look: Look | null = mine?.lights && mine.topper && mine.scene ? { model: mine.model, lights: mine.lights, topper: mine.topper, scene: mine.scene } : null

  let content: ReactElement
  if (!configured) content = <Notice title="Falta configurar o Supabase">{`O site recebeu: VITE_SUPABASE_URL = ${configStatus.url}${configStatus.urlStart ? ` (${configStatus.urlStart}…)` : ''}; VITE_SUPABASE_ANON_KEY = ${configStatus.keyLength} caracteres (precisa de mais de 20). Na Vercel: Settings → Environment Variables e depois Redeploy. No Codespaces: arquivo .env.local e reiniciar o npm run dev.`}</Notice>
  else if (loading) content = <div className="grid place-items-center py-28" role="status" aria-label="Carregando"><Logo className="h-10 animate-pulse text-cream/80" /></div>
  else if (!event) content = <Notice title="Evento não encontrado">{`O evento Natal 2026 não foi encontrado no banco. Detalhe técnico: ${eventErr || 'sem detalhe'}`}</Notice>
  else content = (
    <Routes>
      <Route path="/" element={gate(<Home me={me!} tree={mine!} onShare={openShare} />)} />
      <Route path="/entrar" element={session ? <Navigate to={username ? '/' : '/bem-vindo'} replace /> : <Login />} />
      <Route path="/bem-vindo" element={!session ? <Navigate to="/entrar" replace /> : username ? <Navigate to="/" replace /> : db ? <Welcome db={db} onDone={reloadProfile} /> : <Notice title="Perfil não encontrado">{`Não consegui carregar o seu perfil. Detalhe técnico: ${profileError || 'sem detalhe'}`}</Notice>} />
      <Route path="/criar-arvore" element={!session ? <Navigate to="/entrar" replace /> : !username ? <Navigate to="/bem-vindo" replace /> : mine && !justCreated ? <Navigate to="/" replace /> : <CreateTree me={me!} confirmed={look} justCreated={justCreated} onConfirm={confirmTree} onFinish={() => { setJustCreated(false); navigate(takeNext() ?? '/') }} />} />
      <Route path="/enfeitar" element={gate(<Decorate me={me!} eventId={event.id} onPlace={place} onNotify={flash} />)} />
      <Route path="/memorias" element={gate(<Memories userId={db?.id ?? ''} />)} />
      <Route path="/eventos" element={gate(<Events tree={mine!} />)} />
      <Route path="/perfil" element={gate(<ProfileScreen me={me!} tree={mine!} onShare={openShare} onSaved={reloadProfile} onLogout={signOut} onNotify={flash} />)} />
      <Route path="/redefinir-senha" element={<ResetPassword hasSession={!!session} />} />
      <Route path="/u/:username" element={<PublicTree me={me} eventId={event.id} onPlace={place} onNotify={flash} />} />
      <Route path="/u/:username/:eventSlug" element={<PublicTree me={me} eventId={event.id} onPlace={place} onNotify={flash} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  return (
    <>
      {snow && <Snow />}
      <div className="absolute right-1 top-1 z-30"><SnowToggle on={snow} onToggle={switchSnow} /></div>
      <ScrollTop />
      {import.meta.env.DEV && <ErrorBanner />}
      {!bare && (
        <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between py-3 pl-4 pr-10 sm:px-4">
          <Link to="/" aria-label="mimemora, página inicial" className="text-cream"><Logo className="h-7" /></Link>
          <div className="flex items-center gap-3">
            {!session && <Link to="/entrar" className="pill">Entrar</Link>}
            {me && mine && <button className="pill" onClick={openShare}><Icon name="share" className="h-4 w-4" />Compartilhar</button>}
            {me && <Link to="/perfil" aria-label="Meu perfil"><Avatar p={me} size={36} /></Link>}
          </div>
        </header>
      )}
      <main className={bare ? 'relative z-10' : 'relative z-10 mx-auto max-w-5xl px-4 pb-6 pt-2'}>
        <ErrorBoundary key={pathname}>{content}</ErrorBoundary>
      </main>
      <footer className="relative z-10 px-4 pb-28 pt-2 text-center text-[11px] text-cream/35">
        <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-cream/70">{CONTACT_EMAIL}</a>
      </footer>
      {!bare && session && me && mine && (
        <nav className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 justify-around rounded-full border border-white/15 bg-night/95 px-2 py-2" aria-label="Navegação principal">
          {TABS.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[11px] font-bold ${isActive ? 'bg-gold/20 text-gold' : 'text-cream/70'}`}>
              <Icon name={icon} />{label}
            </NavLink>
          ))}
        </nav>
      )}
      <Toast msg={toast} />
      {me && mine && <ShareSheet open={share} onClose={() => setShare(false)} username={me.username} model={mine.model} lights={mine.lights} topper={mine.topper} scene={mine.scene} ornaments={mine.ornaments} />}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
