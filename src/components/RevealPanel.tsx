import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Gift, TreeData } from '../types'
import { errText } from '../lib/api'
import { useMimos } from '../lib/mimosContext'
import { markRevealSeen, openGift } from '../lib/mimos'
import { supabase } from '../lib/supabase'

// Painel da revelação na própria página inicial: boas-vindas (só até a primeira carta ser aberta), progresso,
// presentes misteriosos e conclusão. As cartas em si abrem clicando nos enfeites da árvore (modal), sem trocar de página.
export function RevealPanel({ tree, eventId, openedIds, onNotify }: { tree: TreeData; eventId: string; openedIds: Set<string>; onNotify: (m: string) => void }) {
  const { refresh } = useMimos()
  const [gifts, setGifts] = useState<Gift[]>((tree.gifts ?? []).filter((g) => g.kind === 'misterioso'))
  const [won, setWon] = useState<Record<string, string>>({})
  // null = ainda perguntando ao servidor. A conclusão fica gravada no banco (public.reveals), então vale ao trocar de página, recarregar ou entrar em outro aparelho.
  const [done, setDone] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const total = tree.ornaments.length
  const left = tree.ornaments.filter((o) => !openedIds.has(o.id)).length
  const intro = !tree.revealedAt && total > 0

  useEffect(() => {
    let alive = true
    supabase.rpc('reveal_done', { p_event: eventId }).then(({ data, error }) => { if (alive) setDone(error ? false : !!data) })
    return () => { alive = false }
  }, [eventId])

  const unwrap = async (g: Gift) => {
    try {
      const r = await openGift(g.id)
      setWon((w) => ({ ...w, [g.id]: r.converted ? `${r.mimos} mimos (você já tinha o item, então os mimos vieram no lugar!)` : (r.name ?? `${r.mimos} mimos`) }))
      setGifts((gs) => gs.map((x) => (x.id === g.id ? { ...x, openedAt: new Date().toISOString() } : x)))
      refresh()
    } catch (e) { setErr(errText(e)) }
  }
  const finish = async () => {
    if (busy || done) return
    setBusy(true)
    try { await markRevealSeen(eventId); setDone(true); refresh(); onNotify('Revelação concluída! Suas conquistas foram atualizadas.') }
    catch (e) { setErr(errText(e)) }
    setBusy(false)
  }

  return (
    <div className="space-y-3 text-left">
      <div className="card p-4">
        {intro ? (
          <>
            <p className="font-hand text-2xl leading-none text-gold">chegou o dia!</p>
            <b className="font-display text-lg">A revelação já está disponível</b><br />
            <span className="text-sm text-cream/85">Sua árvore está acesa e cada enfeite guarda uma carta. É só clicar nos enfeites para abrir as mensagens.</span>
          </>
        ) : (
          <>
            <b className="font-display text-lg text-gold">Revelação</b><br />
            <span className="text-sm text-cream/80">{!total ? 'Ninguém deixou enfeites nesta edição.' : left > 0 ? `${left} ${left === 1 ? 'carta ainda fechada' : 'cartas ainda fechadas'} · clique nos enfeites para abrir.` : 'Você abriu todas as cartas 💌'}</span>
          </>
        )}
      </div>
      {err && <p className="text-sm font-bold text-gold" role="alert">{err}</p>}

      {gifts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg">Presentes misteriosos</h2>
          {gifts.map((g) => (
            <div key={g.id} className="card flex items-center justify-between gap-3 p-3 text-sm">
              <span>de <b>{g.from ? `@${g.from}` : 'alguém'}</b>{(g.openedAt || won[g.id]) && <span className="block text-gold">você ganhou: {won[g.id] ?? 'um item exclusivo (veja em Loja → meus itens)'}</span>}</span>
              {!g.openedAt && <button className="pill" onClick={() => unwrap(g)}>abrir presente</button>}
            </div>
          ))}
        </div>
      )}

      {!intro && done !== null && (done
        ? <p className="card p-4 text-center text-gold">Revelação concluída. <Link to="/conquistas" className="underline">Ver conquistas</Link></p>
        : <button className="cta disabled:opacity-50" disabled={left > 0 || busy} onClick={finish}>{left > 0 ? 'Abra todas as cartas para concluir' : 'Concluir revelação'}</button>)}
    </div>
  )
}
