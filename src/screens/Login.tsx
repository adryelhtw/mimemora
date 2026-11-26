import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Tree } from '../events/natal-2026/Tree'
import { Logo } from '../components/Logo'

export const NEXT_KEY = 'apos-login'
type Mode = 'entrar' | 'criar' | 'recuperar'

const friendly = (m: string) =>
  /invalid login/i.test(m) ? 'E-mail ou senha incorretos.'
  : /not confirmed/i.test(m) ? 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).'
  : /rate limit|too many|seconds/i.test(m) ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  : /password/i.test(m) ? 'A senha precisa ter pelo menos 8 caracteres.'
  : 'Não foi possível concluir agora. Tente de novo.'

export function Login() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  // Guarda para onde voltar depois do login (o Google sai do site e volta).
  useEffect(() => {
    const next = params.get('next')
    if (next && next.startsWith('/')) { try { localStorage.setItem(NEXT_KEY, next) } catch { /* ok */ } }
    const ref = params.get('ref')   // link de indicação: /entrar?ref=usuario
    if (ref && /^[a-z0-9_]{3,20}$/i.test(ref)) { try { localStorage.setItem('ref', ref.toLowerCase()) } catch { /* ok */ } }
  }, [params])

  const go = (m: Mode) => { setMode(m); setErr(''); setInfo('') }

  const google = async () => {
    setErr('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) setErr('Não foi possível entrar com o Google agora. Tente de novo.')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(''); setInfo('')
    const mail = email.trim()
    if (mode === 'criar' && password.length < 8) { setErr('A senha precisa ter pelo menos 8 caracteres.'); return }
    setBusy(true)
    if (mode === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) setErr(friendly(error.message))
    } else if (mode === 'criar') {
      const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: window.location.origin } })
      if (error) setErr(friendly(error.message))
      else if (data.user && data.user.identities?.length === 0) setErr('Esse e-mail já tem conta. Use a aba "entrar".')
      else if (!data.session) setInfo(`Enviamos um e-mail de confirmação para ${mail}. Abra (veja também o spam) e toque no link para continuar.`)
      // com sessão criada, o app segue sozinho para o primeiro acesso
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/redefinir-senha` })
      if (error) setErr(friendly(error.message))
      else setInfo('Se esse e-mail tiver uma conta, enviamos um link para criar uma nova senha. Veja também o spam.')
    }
    setBusy(false)
  }

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => go(m)} aria-pressed={mode === m}
      className={`flex-1 rounded-full py-2 text-sm font-bold ${mode === m ? 'bg-gold text-[#3a1500]' : 'text-cream/80'}`}>{label}</button>
  )
  const recover = mode === 'recuperar'

  return (
    <section className="relative z-10 mx-auto flex min-h-[88dvh] max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <Logo className="mx-auto h-14 text-cream" />
        <p className="text-sm text-cream/70">mimos e memórias para os dias especiais</p>
      </div>
      {recover ? (
        <p className="text-sm text-cream/80">Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      ) : (
        <>
          <div className="flex w-full gap-1 rounded-full border border-white/15 bg-black/25 p-1" role="group" aria-label="Entrar ou criar conta">
            {tab('entrar', 'entrar')}{tab('criar', 'criar conta')}
          </div>
          <button onClick={google} className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 font-bold text-[#1f2937]">
            <span className="text-lg font-extrabold text-[#4285F4]">G</span> Continuar com o Google
          </button>
          <p className="text-xs uppercase tracking-widest text-cream/50">ou com e-mail</p>
        </>
      )}
      <form onSubmit={submit} className="w-full space-y-2 text-left">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" />
        {!recover && (
          <div className="flex items-center rounded-xl border border-white/15 bg-black/20 pr-3">
            <input type={show ? 'text' : 'password'} required minLength={mode === 'criar' ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'criar' ? 'crie uma senha (mínimo 8)' : 'sua senha'} autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} className="w-full bg-transparent px-4 py-3 outline-none" />
            <button type="button" onClick={() => setShow((v) => !v)} className="text-xs font-bold text-cream/60">{show ? 'ocultar' : 'mostrar'}</button>
          </div>
        )}
        {mode === 'entrar' && <button type="button" onClick={() => go('recuperar')} className="text-xs text-cream/60 underline">esqueci minha senha</button>}
        <button disabled={busy} className="cta disabled:opacity-50">{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar minha conta' : 'Enviar link'}</button>
      </form>
      {recover && <button type="button" onClick={() => go('entrar')} className="text-sm font-bold text-gold">← voltar para entrar</button>}
      {info && <p className="card w-full p-3 text-sm">{info}</p>}
      <p className="min-h-5 text-sm font-bold text-gold" role="alert">{err}</p>
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-end gap-2 opacity-90" aria-hidden="true">
        <div className="text-right text-[11px] leading-tight text-cream/60"><span className="block uppercase tracking-widest">evento atual</span><span className="font-hand text-lg text-gold">natal 2026</span></div>
        <Tree model="classica" animated={false} className="h-20" />
      </div>
    </section>
  )
}
