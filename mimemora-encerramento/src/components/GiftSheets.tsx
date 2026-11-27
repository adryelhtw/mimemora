import { useEffect, useState } from 'react'
import type { Gift, Profile, TreeData } from '../types'
import { Sheet } from './ui'
import { MAX_BOXES } from '../events/natal-2026/Tree'
import { fetchCatalog, sendGift } from '../lib/mimos'
import type { CatalogItem } from '../lib/mimos'
import { errText } from '../lib/api'
import { useMimos } from '../lib/mimosContext'
import { nowMs } from '../lib/clock'

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const KIND = { brilho: 'Brilho Mágico', misterioso: 'Presente Misterioso' }
const who = (g: Gift) => (g.from ? `@${g.from}` : 'alguém (oculto)')

// Enviar presentes a um amigo (comprados com mimos, além do enfeite tradicional).
// Regras: um Brilho Mágico por vez em cada árvore; até 5 Presentes Misteriosos por árvore (1 por pessoa).
// boxesOpen=false (a partir de 25/12): o Presente Misterioso não pode mais ser enviado; o Brilho Mágico segue até o fim do evento.
export function SendGiftPanel({ me, tree, onSent, onNotify, boxesOpen = true }: { me: Profile; tree: TreeData; onSent: () => void; onNotify: (m: string) => void; boxesOpen?: boolean }) {
  const { balance, refresh } = useMimos()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [ask, setAsk] = useState<'brilho' | 'misterioso' | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { fetchCatalog().then(setCatalog).catch(() => undefined) }, [])
  const price = (k: 'brilho' | 'misterioso') => catalog.find((c) => c.id === `gift:${k}`)?.price ?? 0
  const glow = tree.gifts?.find((g) => g.kind === 'brilho' && g.expiresAt && new Date(g.expiresAt).getTime() > nowMs())
  const boxes = tree.gifts?.filter((g) => g.kind === 'misterioso').length ?? 0
  const sentBox = !!tree.gifts?.some((g) => g.kind === 'misterioso' && g.from === me.username)

  const confirm = async () => {
    if (!ask || !tree.id) return
    setBusy(true); setErr('')
    try {
      await sendGift(tree.id, ask)
      await refresh(true)
      onNotify(ask === 'brilho' ? 'Brilho Mágico enviado! ✦' : 'Presente Misterioso enviado! A caixa já está na árvore.')
      setAsk(null); onSent()
    } catch (e) { setErr(errText(e)); onSent() } finally { setBusy(false) }
  }

  const card = (k: 'brilho' | 'misterioso', title: string, text: string, disabled: boolean, status: string) => (
    <button key={k} onClick={() => { setErr(''); setAsk(k) }} disabled={disabled} className="card p-3 text-left disabled:opacity-60">
      <b className="block font-display text-lg">{title}</b>
      <span className="text-xs text-cream/75">{text}</span>
      <span className="mt-1 block text-sm font-bold text-gold">{status}</span>
    </button>
  )
  const enough = (balance ?? 0) >= (ask ? price(ask) : 0)
  return (
    <div className="space-y-2 text-left">
      <p className="text-center text-xs uppercase tracking-widest text-cream/60">presentes especiais · além do seu enfeite</p>
      <div className="grid grid-cols-2 gap-2">
        {card('brilho', 'Brilho Mágico', 'Envolve a árvore (frente e verso) com uma luz por 3 dias. Seu nome aparece num selo.', !!glow,
          glow ? `já tem um brilho ativo até ${fmt(glow.expiresAt!)} (de ${who(glow)})` : `${price('brilho')} mimos`)}
        {card('misterioso', 'Presente Misterioso', 'Uma caixa no pé da árvore. Só abre na revelação, com surpresa.', sentBox || boxes >= MAX_BOXES || !boxesOpen,
          !boxesOpen ? 'o envio terminou em 25/12' : sentBox ? 'já enviado ✓' : boxes >= MAX_BOXES ? `o pé da árvore está cheio (${boxes}/${MAX_BOXES})` : `${price('misterioso')} mimos · ${boxes}/${MAX_BOXES} caixas`)}
      </div>
      <p className="text-center text-[11px] text-cream/50">Cada árvore tem um Brilho Mágico por vez e comporta até {MAX_BOXES} presentes misteriosos (um por pessoa).</p>
      <Sheet open={!!ask} onClose={() => setAsk(null)} title={ask ? KIND[ask] : ''}>
        <div className="space-y-3 text-center">
          <p className="text-sm text-cream/85">
            {ask === 'brilho'
              ? `O Brilho Mágico envolve a árvore de @${tree.owner.username}, na frente e no verso, por 3 dias e mostra um selo com o seu nome. Só um brilho fica ativo por vez: se outra pessoa enviar antes, você precisa esperar ele terminar. Não muda a aparência da árvore.`
              : `O Presente Misterioso fica numa caixa no pé da árvore de @${tree.owner.username}, com o seu nome. Ninguém vê o conteúdo: ele só abre na revelação. Se a pessoa já tiver o item, ganha mimos no lugar.`}
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
