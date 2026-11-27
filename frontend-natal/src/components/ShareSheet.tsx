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
  // No desktop, o compartilhamento de arquivos pode fazer o WhatsApp receber
  // somente a imagem. Reservamos o compartilhamento nativo de arquivos para celulares.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const canNative = isMobile && typeof navigator.share === 'function'

  // Pré-gera as imagens e atualiza quando a árvore muda. O arquivo precisa estar pronto
  // antes do toque para que o compartilhamento nativo funcione bem em celulares.
  useEffect(() => {
    let alive = true
    setFiles({})
    ;(['post', 'story'] as Fmt[]).forEach((f) => {
      cardBlob(props, f).then((b) => { if (alive) setFiles((x) => ({ ...x, [f]: b })) }).catch(() => undefined)
    })
    return () => { alive = false }
    // A árvore é atualizada por modelo/enfeites; esses valores definem a arte compartilhada.
  }, [props.username, props.model, props.lights, props.topper, props.scene, props.ornaments])

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); flash('Link copiado! Agora é só colar na conversa.') }
    catch { flash('Não consegui copiar. Selecione o link e copie manualmente.') }
  }
  const shareImage = async (format: Fmt, title = 'Minha árvore de Natal') => {
    const blob = files[format]
    if (!blob) { flash('Preparando a imagem… tente de novo em um instante.'); return false }
    const file = new File([blob], `mimemora-${username}-${format}.png`, { type: 'image/png' })
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false
    try {
      await navigator.share({ title, text: `${msg} ${link}`, files: [file] })
      return true
    } catch (error) {
      // O cancelamento é uma ação normal do usuário, não deve abrir outro destino.
      if (error instanceof DOMException && error.name === 'AbortError') return true
      return false
    }
  }
  const native = async () => {
    const shared = await shareImage('story')
    if (!shared && files.story) {
      // Navegadores sem suporte a arquivos ainda podem compartilhar texto e link.
      try { await navigator.share({ title: 'Minha árvore de Natal', text: msg, url: link }) } catch { /* cancelado */ }
    }
  }
  const whatsapp = async () => {
    // Em celulares, tenta enviar arquivo + texto pelo menu nativo.
    if (isMobile) {
      const shared = await shareImage('post', 'Minha árvore no Mimemora')
      if (shared) return
    }
    // No computador, wa.me preserva o texto e o link. O WhatsApp Web/Desktop
    // não recebe anexos locais por URL; por isso salvamos a arte para anexar manualmente.
    if (files.post) saveBlob(files.post, `mimemora-${username}-post.png`)
    go(`https://wa.me/?text=${enc(`${msg} ${link}`)}`)
    flash(files.post
      ? 'Convite aberto com texto e link. A imagem foi salva: anexe-a na conversa!'
      : 'Convite aberto com texto e link. Aguarde a imagem terminar de preparar e tente novamente.')
  }

  const xShare = () => {
    // O X não permite anexar imagens locais por meio da URL de publicação.
    // Abrimos o compositor com texto + link e salvamos a arte para anexar manualmente.
    if (files.post) saveBlob(files.post, `mimemora-${username}-post.png`)
    go(`https://x.com/intent/post?text=${enc(msg)}&url=${enc(link)}`)
    flash(files.post
      ? 'Publicação aberta com texto e link. A imagem foi salva: anexe-a no X!'
      : 'Publicação aberta com texto e link. A imagem ainda está sendo preparada; tente baixar depois.')
  }
  const download = (f: Fmt) => {
    const b = files[f]
    if (!b) { flash('Preparando a imagem… tente de novo em um instante.'); return }
    saveBlob(b, `mimemora-${username}-${f}.png`)
    flash('Imagem salva! Poste e convide seus amigos.')
  }
  const insta = async () => {
    const b = files.story
    if (!b) { flash('Preparando a imagem… tente de novo em um instante.'); return }
    const shared = await shareImage('story', 'Minha árvore no Mimemora')
    if (!shared) {
      saveBlob(b, `mimemora-${username}-stories.png`)
      flash('Imagem de Stories salva! Abra o Instagram e publique a imagem.')
    }
  }

  const chips: [string, string, string, () => void][] = [
    ['Telegram', '#2AABEE', 'T', () => go(`https://t.me/share/url?url=${enc(link)}&text=${enc(msg)}`)],
    ['Facebook', '#1877F2', 'f', () => go(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`)],
    ['X', '#111', 'X', xShare],
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
        <button onClick={whatsapp} className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-4 font-extrabold text-[#06361a]">WhatsApp</button>
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
        <p className="mt-2 text-xs text-cream/50">No celular, o compartilhamento nativo tenta enviar imagem, texto e link juntos. No computador, WhatsApp e X abrem com texto e link preenchidos e salvam a imagem para você anexar manualmente. A prévia do link também depende de cada rede.</p>
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
