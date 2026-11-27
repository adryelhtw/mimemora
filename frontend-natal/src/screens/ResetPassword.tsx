import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

// Aberta pelo link do e-mail "esqueci minha senha". O link já entra na conta; aqui a pessoa define a nova senha.
export function ResetPassword({ hasSession }: { hasSession: boolean }) {
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) { setErr('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (pw !== pw2) { setErr('As senhas não são iguais.'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setErr(/same|different/i.test(error.message) ? 'Escolha uma senha diferente da anterior.' : 'Não foi possível salvar a nova senha. Peça um novo link.')
    else setDone(true)
  }

  const head = <Logo className="h-12 text-cream" />
  const box = 'relative z-10 mx-auto flex min-h-[88dvh] max-w-sm flex-col items-center justify-center gap-4 p-6 text-center'

  if (!hasSession) return (
    <section className={box}>{head}
      <p className="text-cream/80">Este link expirou ou já foi usado. Peça um novo na tela de entrada.</p>
      <Link to="/entrar" className="cta">Voltar para entrar</Link>
    </section>
  )
  if (done) return (
    <section className={box}>{head}
      <p className="font-hand text-3xl text-gold">senha atualizada!</p>
      <button className="cta" onClick={() => navigate('/')}>Continuar</button>
    </section>
  )
  return (
    <section className={box}>{head}
      <p className="text-cream/80">Escolha sua nova senha.</p>
      <form onSubmit={submit} className="w-full space-y-2 text-left">
        <div className="flex items-center rounded-xl border border-white/15 bg-black/20 pr-3">
          <input type={show ? 'text' : 'password'} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="nova senha (mínimo 8)" autoComplete="new-password" className="w-full bg-transparent px-4 py-3 outline-none" />
          <button type="button" onClick={() => setShow((v) => !v)} className="text-xs font-bold text-cream/60">{show ? 'ocultar' : 'mostrar'}</button>
        </div>
        <input type={show ? 'text' : 'password'} required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="repita a nova senha" autoComplete="new-password" className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" />
        <button disabled={busy} className="cta disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
      <p className="min-h-5 text-sm font-bold text-gold" role="alert">{err}</p>
    </section>
  )
}
