import { useEffect, useState } from 'react'
import type { Gift, Profile, TreeData } from '../types'
import { Sheet } from './ui'
import { fetchCatalog, sendGift } from '../lib/mimos'
import type { CatalogItem } from '../lib/mimos'
import { errText } from '../lib/api'
import { useMimos } from '../lib/mimosContext'
import { nowMs } from '../lib/clock'

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const KIND = { brilho: 'Brilho Mágico', misterioso: 'Presente Misterioso' }
const who = (g: Gift) => (g.from ? `@${g.from}` : 'alguém (oculto)')

// Enviar presentes a um amigo (comprados com mimos, além do enfeite tradicional).
export function SendGiftPanel({ me, tree, onSent, onNotify }: { me: Profile; tree: TreeData; onSent: () => void; onNotify: (m: string) => void }) {
  const { balance, refresh } = useMimos()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [ask, setAsk] = useState<'brilho' | 'misterioso' | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { fetchCatalog().then(setCatalog).catch(() => undefined) }, [])
  const price = (k: 'brilho' | 'misterioso') => catalog.find((c) => c.id === `gift:${k}`)?.price ?? 0
  const sent = (k: string) => !!tree.gifts?.some((g) => g.kind === k && g.from === me.username)

  const confirm = async () => {
    if (!ask || !tree.id) return
    setBusy(true); setErr('')
    try {
      await sendGift(tree.id, ask)
      await refresh(true)
      onNotify(ask === 'brilho' ? 'Brilho Mágico enviado! ✦' : 'Presente Misterioso enviado! A caixa já está na árvore.')
      setAsk(null); onSent()
    } catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }

  const card = (k: 'brilho' | 'misterioso', title: string, text: string) => (
    <button key={k} onClick={() => { setErr(''); setAsk(k) }} disabled={sent(k)} className="card p-3 text-left disabled:opacity-60">
      <b className="block font-display text-lg">{title}</b>
      <span className="text-xs text-cream/75">{text}</span>
      <span className="mt-1 block text-sm font-bold text-gold">{sent(k) ? 'já enviado ✓' : `${price(k)} mimos`}</span>
    </button>
  )
  const enough = (balance ?? 0) >= (ask ? price(ask) : 0)
  return (
    <div className="space-y-2 text-left">
      <p className="text-center text-xs uppercase tracking-widest text-cream/60">presentes especiais · além do seu enfeite</p>
      <div className="grid grid-cols-2 gap-2">
        {card('brilho', 'Brilho Mágico', 'Envolve a árvore com uma luz por 3 dias. Seu nome aparece num selo.')}
        {card('misterioso', 'Presente Misterioso', 'Uma caixa no pé da árvore. Só abre na revelação, com surpresa.')}
      </div>
      <Sheet open={!!ask} onClose={() => setAsk(null)} title={ask ? KIND[ask] : ''}>
        <div className="space-y-3 text-center">
          <p className="text-sm text-cream/85">
            {ask === 'brilho'
              ? `O Brilho Mágico envolve a árvore de @${tree.owner.username} por 3 dias e mostra um selo com o seu nome. Não muda a aparência da árvore.`
              : `O Presente Misterioso fica numa caixa no pé da árvore de @${tree.owner.username}, com o seu nome. Ninguém vê o conteúdo: ele só abre na revelação.`}
          </p>
          <p className="text-sm">Custa <b className="text-gold">{ask ? price(ask) : 0} mimos</b> · seu saldo: {balance ?? 0}</p>
          <button className="cta disabled:opacity-50" disabled={busy || !enough} onClick={confirm}>{busy ? 'Enviando…' : enough ? 'Enviar presente' : 'Mimos insuficientes'}</button>
          <p className="min-h-5 text-sm font-bold text-gold" role="alert">{err}</p>
        </div>
      </Sheet>
    </div>
  )
}

// Detalhe de um presente (toque na caixa ou no selo): quem enviou e quando.
export function GiftInfoSheet({ gift, onClose }: { gift: Gift | null; onClose: () => void }) {
  return (
    <Sheet open={!!gift} onClose={onClose} title={gift ? KIND[gift.kind] : ''}>
      {gift && (
        <div className="space-y-2 text-center">
          <p className="text-cream/85">Enviado por <b>{who(gift)}</b> em {fmt(gift.createdAt)}.</p>
          {gift.kind === 'misterioso'
            ? <p className="text-sm text-cream/70">{gift.openedAt ? 'Este presente já foi aberto.' : 'O conteúdo é surpresa: ele só pode ser aberto na revelação.'}</p>
            : <p className="text-sm text-cream/70">{gift.expiresAt && new Date(gift.expiresAt).getTime() > nowMs() ? `O brilho segue ativo até ${fmt(gift.expiresAt)}.` : 'O efeito de brilho já terminou, mas o carinho fica registrado aqui.'}</p>}
        </div>
      )}
    </Sheet>
  )
}

// "Presentes recebidos": lista permanente de quem enviou, mesmo depois que o efeito terminar.
export function GiftsReceived({ gifts }: { gifts: Gift[] }) {
  const [open, setOpen] = useState(false)
  if (!gifts.length) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="font-bold text-gold underline">presentes recebidos ({gifts.length})</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Presentes recebidos">
        <ul className="space-y-2">
          {[...gifts].reverse().map((g) => (
            <li key={g.id} className="card p-3 text-left text-sm">
              <b>{KIND[g.kind]}</b> de <b>{who(g)}</b>
              <span className="block text-xs text-cream/65">
                {fmt(g.createdAt)} · {g.kind === 'brilho' ? (g.expiresAt && new Date(g.expiresAt).getTime() > nowMs() ? 'ativo agora' : 'efeito encerrado') : g.openedAt ? 'aberto' : 'fechado até a revelação'}
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  )
}
