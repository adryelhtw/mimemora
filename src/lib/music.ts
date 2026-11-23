// Converte o link de música do perfil em um player incorporado. Só aceita YouTube, SoundCloud e Spotify (https).
export type MusicEmbed = { kind: 'youtube' | 'soundcloud' | 'spotify'; src: string; height: number }

export function parseMusic(raw: string): MusicEmbed | null {
  let u: URL
  try { u = new URL(raw.trim()) } catch { return null }
  if (u.protocol !== 'https:' || raw.length > 300) return null
  const host = u.hostname.replace(/^(www|m|music)\./, '')

  if (host === 'youtu.be' || host === 'youtube.com') {
    const id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : (u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,15})/)?.[1] ?? '')
    const list = u.searchParams.get('list')
    if (/^[\w-]{6,15}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&playsinline=1&rel=0`, height: 130 }
    if (host === 'youtube.com' && list && /^[\w-]{10,60}$/.test(list)) return { kind: 'youtube', src: `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1&loop=1&playsinline=1`, height: 130 }
    return null
  }
  if (host === 'soundcloud.com' && u.pathname.length > 2) {
    return { kind: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + u.pathname)}&auto_play=true&visual=false&hide_related=true&show_comments=false`, height: 130 }
  }
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,30})/)
    if (m) return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: 152 }
  }
  return null
}
