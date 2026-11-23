import { useState } from 'react'
import { parseMusic } from '../lib/music'

// Toca a música do perfil só na página de quem visita a árvore dele. O player fica visível (regra do YouTube/Spotify).
// Navegadores podem bloquear som automático: nesse caso basta tocar em play.
export function MusicPlayer({ url, owner }: { url: string; owner: string }) {
  const embed = parseMusic(url)
  const [closed, setClosed] = useState(false)
  if (!embed || closed) return null
  return (
    <div className="card mx-auto w-full max-w-sm p-3 text-left">
      <div className="mb-2 flex items-center justify-between text-xs text-cream/70">
        <span>♪ a música de @{owner}</span>
        <button onClick={() => setClosed(true)} className="rounded-full px-2 py-0.5 hover:bg-white/10" aria-label="Parar a música">parar ✕</button>
      </div>
      <iframe title={`música de @${owner}`} src={embed.src} width="100%" height={embed.height} allow="autoplay; encrypted-media" loading="eager" referrerPolicy="strict-origin-when-cross-origin" className="rounded-xl border-0" />
      <p className="mt-1 text-[11px] text-cream/40">se o navegador bloquear o som automático, toque em play.</p>
    </div>
  )
}
