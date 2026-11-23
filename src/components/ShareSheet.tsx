import { useEffect, useState } from 'react'
import type { LightsKey, Ornament, SceneKey, TopperKey, TreeModel } from '../types'
import { Icon } from './Icons'
import { Sheet } from './ui'
import { ShareCardSvg, cardBlob, saveBlob } from './ShareCard'
import type { Fmt } from './ShareCard'

type Props = { username: string; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
const DEFAULT_MSG = 'Deixe um enfeite na minha árvore de Natal 🎄 Eu só abro as mensagens no dia 25!'

export function ShareSheet({ open, onClose, ...rest }: Props & { open: boolean; onClose: () => void }) {
  return <Sheet open={open} onClose={onClose} title="Compartilhar minha árvore"><Body {...rest} /></Sheet>
}

function Body(props: Props) {
  const { username } = props
  const [msg, setMsg] = useState(DEFAULT_MSG)
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [files, setFiles] = useState<Partial<Record<Fmt, Blob>>>({})
  const link = `${window.location.origin}/u/${username}`, enc = encodeURIComponent
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(''), 4500) }
  const go = (u: string) => window.open(u, '_blank', 'noopener')
  const canNative = typeof navigator.share === 'function'

  // As imagens são preparadas ao abrir: o celular só deixa compartilhar arquivo logo após o toque,
  // então não dá para gerar a imagem depois do clique.
  useEffect(() => {
    let alive = true
    ;(['post', 'story'] as Fmt[]).forEach((f) => { cardBlob(props, f).then((b) => { if (alive) setFiles((x) => ({ ...x, [f]: b })) }).catch(() => undefined) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); flash('Link copiado! Agora é só colar na conversa.') }
    catch { flash('Não consegui copiar. Selecione o link e copie manualmente.') }
  }
  const native = async () => { try { await navigator.share({ title: 'Minha árvore de Natal', text: msg, url: link }) } catch { /* cancelado */ } }
  const download = (f: Fmt) => {
    const b = files[f]
    if (!b) { flash('Preparando a imagem… tente de novo em um instante.'); return }
    saveBlob(b, `mimemora-${username}-${f}.png`)
    flash('Imagem salva! Poste e convide seus amigos.')
  }
  const insta = () => {
    const b = files.story
    if (!b) { flash('Preparando a imagem… tente de novo em um instante.'); return }
    const file = new File([b], `mimemora-${username}-stories.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], text: `${msg} ${link}` }).catch(() => undefined)
    else { saveBlob(file, file.name); flash('Imagem de Stories salva! Poste no Instagram e use o link na bio ou em um sticker de link.') }
  }

  const chips: [string, string, string, () => void][] = [
    ['Telegram', '#2AABEE', 'T', () => go(`https://t.me/share/url?url=${enc(link)}&text=${enc(msg)}`)],
    ['Facebook', '#1877F2', 'f', () => go(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`)],
    ['X', '#111', 'X', () => go(`https://x.com/intent/post?text=${enc(msg)}&url=${enc(link)}`)],
    ['Instagram', 'linear-gradient(135deg,#feda75,#d62976 55%,#4f5bd5)', 'IG', insta],
  ]

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-hand text-xl text-gold">Assim seus amigos vão ver o convite</p>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/30 shadow-lg">
          <ShareCardSvg {...props} format="link" fit />
          <div className="border-t border-white/10 bg-white/5 px-3 py-2 text-sm"><b>árvore de natal de @{username} · mimemora</b><br /><span className="text-cream/70">Deixe um enfeite com uma mensagem secreta 🎄</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => go(`https://wa.me/?text=${enc(`${msg} ${link}`)}`)} className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-4 font-extrabold text-[#06361a]">WhatsApp</button>
        <button onClick={copy} className="flex items-center justify-center gap-2 rounded-2xl bg-gold px-3 py-4 font-extrabold text-[#3a1500]">
          <Icon name={copied ? 'check' : 'copy'} className="h-5 w-5" />{copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
        {chips.map(([name, bg, glyph, fn]) => (
          <button key={name} onClick={fn} className="flex flex-col items-center gap-1">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 text-base font-extrabold text-white" style={{ background: bg }}>{glyph}</span>{name}
          </button>
        ))}
      </div>
      {canNative && <button onClick={native} className="card flex w-full items-center justify-center gap-2 py-3 font-bold"><Icon name="share" className="h-5 w-5" /> Mais opções do celular</button>}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cream/60">Salvar imagem para publicar</p>
        <div className="grid grid-cols-2 gap-2">
          {([['post', 'Feed (4:5)'], ['story', 'Stories (9:16)']] as [Fmt, string][]).map(([f, label]) => (
            <button key={f} onClick={() => download(f)} className="card flex items-center justify-center gap-2 py-3 font-bold disabled:opacity-60" disabled={!files[f]}>
              <Icon name="download" className="h-4 w-4" />{files[f] ? label : 'Preparando…'}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-cream/50">A imagem da árvore aparece na prévia do link no WhatsApp, X, Telegram e Facebook. Ela é atualizada quando você abre o mimemora com enfeites novos.</p>
      </div>

      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm" aria-label="Link público da sua árvore" />
      <details className="rounded-xl bg-white/5 p-3">
        <summary className="cursor-pointer text-sm font-bold text-gold">Personalizar a mensagem</summary>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3" aria-label="Mensagem de compartilhamento" />
        <button onClick={() => setMsg(DEFAULT_MSG)} className="mt-1 text-xs font-bold text-cream/70 underline">Restaurar padrão</button>
      </details>
      <p className="min-h-5 text-center text-sm font-bold text-gold" role="status">{note}</p>
    </div>
  )
}
