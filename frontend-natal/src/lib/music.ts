// Converte o link de música do perfil. Só aceita YouTube e SoundCloud (https).
export type MusicEmbed =
  | { kind: 'youtube'; videoId?: string; list?: string }
  | { kind: 'soundcloud'; src: string }

export function parseMusic(raw: string): MusicEmbed | null {
  let u: URL
  try { u = new URL(raw.trim()) } catch { return null }
  if (u.protocol !== 'https:' || raw.length > 300) return null
  const host = u.hostname.replace(/^(www|m|music)\./, '')

  if (host === 'youtu.be' || host === 'youtube.com') {
    const id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : (u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,15})/)?.[1] ?? '')
    const list = u.searchParams.get('list')
    if (/^[\w-]{6,15}$/.test(id)) return { kind: 'youtube', videoId: id }
    if (host === 'youtube.com' && list && /^[\w-]{10,60}$/.test(list)) return { kind: 'youtube', list }
    return null
  }
  if (host === 'soundcloud.com' && u.pathname.length > 2) {
    return { kind: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + u.pathname)}&auto_play=true&visual=false&hide_related=true&show_comments=false` }
  }
  return null
}
