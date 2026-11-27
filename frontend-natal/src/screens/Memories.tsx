import { useEffect, useState } from 'react'
import type { Memory } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { fetchMemories } from '../lib/api'

// Memórias de cada pessoa: as próprias árvores de edições encerradas, com as mensagens já liberadas.
export function Memories({ userId }: { userId: string }) {
  const [list, setList] = useState<Memory[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    fetchMemories(userId).then((r) => alive && setList(r)).catch(() => alive && setErr('Não consegui carregar suas memórias agora.'))
    return () => { alive = false }
  }, [userId])

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Memórias</h1>
      <p className="text-cream/70">As suas árvores de edições anteriores, com as mensagens que você já pode ler.</p>
      {err && <p className="text-sm font-bold text-gold" role="alert">{err}</p>}
      {!list && !err && <p className="text-cream/70">Carregando…</p>}
      {list && !list.length && (
        <div className="card p-8 text-center">
          <Tree model="classica" animated={false} base={false} className="mx-auto mb-3 h-24 opacity-60" />
          <p className="font-display text-lg">Suas memórias vão aparecer aqui</p>
          <p className="text-sm text-cream/70">Quando uma edição terminar, a sua árvore, os enfeites e as mensagens ficam guardados nesta página. O natal 2026 vira memória depois de 1º de janeiro de 2027.</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {list?.map((m) => (
          <article key={`${m.eventName}-${m.year}`} className="card p-4">
            <div className="flex items-center gap-4">
              <Tree model={m.model} lights={m.lights} topper={m.topper} scene={m.scene} ornaments={m.ornaments} animated={false} base={false} sealed={false} tags={false} className="h-36 w-28 shrink-0" />
              <div>
                <p className="font-display text-2xl text-gold">{m.eventName ?? `Natal ${m.year}`}</p>
                <p className="text-sm text-cream/70">{m.ornaments.length} enfeites recebidos</p>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer font-bold text-gold">Ler mensagens</summary>
              <ul className="mt-2 space-y-2">
                {m.ornaments.map((o) => (
                  <li key={o.id} className="flex gap-3 rounded-xl bg-black/20 p-3 text-sm">
                    <OrnamentIcon type={o.type} className="h-10 w-8 shrink-0" />
                    <span><b>@{o.from}</b>{o.side === 'verso' && <i className="text-cream/50"> · verso</i>}<br />{o.message ?? 'Mensagem indisponível.'}</span>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
