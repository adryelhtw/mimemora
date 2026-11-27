import { Component, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// Se uma tela quebrar, mostra o erro em vez de deixar a página em branco.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="p-6">
        <h1 className="font-display text-2xl text-gold">Algo deu errado</h1>
        <p className="my-2 text-sm">Tire um print desta tela e envie para o suporte do projeto.</p>
        <pre className="whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-xs">{String(this.state.error.stack ?? this.state.error)}</pre>
      </div>
    )
  }
}

// Só no modo de desenvolvimento: mostra erros que não derrubam a tela (eventos, promessas).
export function ErrorBanner() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const onErr = (e: ErrorEvent) => setMsg(e.message)
    const onRej = (e: PromiseRejectionEvent) => setMsg(String(e.reason))
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej) }
  }, [])
  if (!msg) return null
  return <button onClick={() => setMsg('')} className="fixed left-2 top-2 z-[100] max-w-[90vw] rounded-lg bg-red-700 p-2 text-left text-xs text-white">Erro: {msg} (toque para fechar)</button>
}
