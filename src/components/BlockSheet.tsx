import { useEffect, useState } from 'react'
import { Sheet } from './ui'
import { blockUser, countExchanged, errText } from '../lib/api'

type Target = { id: string; username: string }
type Props = { open: boolean; onClose: () => void; target: Target; onBlocked: (removed: number) => void }

export function BlockSheet({ open, onClose, target, onBlocked }: Props) {
  return <Sheet open={open} onClose={onClose} title="Bloquear usuário"><Body target={target} onClose={onClose} onBlocked={onBlocked} /></Sheet>
}

function Body({ target, onClose, onBlocked }: Omit<Props, 'open'>) {
  const [n, setN] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { countExchanged(target.id).then(setN).catch(() => setN(0)) }, [target.id])

  const confirm = async () => {
    setBusy(true); setErr('')
    try { onBlocked(await blockUser(target.id)) } catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-cream/85">
        Ao bloquear <b>@{target.username}</b>, vocês dois deixam de ver o perfil e a árvore um do outro (inclusive por link direto, busca e outras áreas do site) e não podem se seguir nem se enfeitar.
      </p>
      {n === null && <p className="text-sm text-cream/60">Verificando enfeites trocados…</p>}
      {!!n && (
        <p className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm font-bold">
          Atenção: vocês trocaram {n} {n === 1 ? 'enfeite' : 'enfeites'}. Ao bloquear, {n === 1 ? 'ele será excluído' : 'eles serão excluídos'} permanentemente das árvores, inclusive das memórias, e não {n === 1 ? 'volta' : 'voltam'} mesmo que você desbloqueie. Nas memórias, o espaço fica vazio para sempre. Na árvore do evento atual, o espaço fica livre e poderá receber novos enfeites.
        </p>
      )}
      {n === 0 && <p className="text-sm text-cream/60">Vocês ainda não trocaram enfeites.</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClose} className="card py-3 font-bold">Cancelar</button>
        <button onClick={confirm} disabled={busy || n === null} className="rounded-full bg-[#c9172f] py-3 font-extrabold text-white disabled:opacity-50">{busy ? 'Bloqueando…' : 'Bloquear'}</button>
      </div>
      <p className="min-h-5 text-center text-sm font-bold text-gold" role="alert">{err}</p>
    </div>
  )
}
