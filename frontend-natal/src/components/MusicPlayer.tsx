import { useEffect, useRef } from 'react'
import { parseMusic } from '../lib/music'
import { loadSoundCloud, loadYouTube } from '../lib/players'

// Música do perfil: toca sozinha, em loop, para quem visita a árvore (e para o dono, ao ver o próprio perfil).
// Não há botão de parar: o player não recebe cliques.
// Navegadores não permitem som automático sem nenhuma interação, então o player tenta tocar com som e,
// se for bloqueado, toca mudo e liga o som no primeiro toque, clique ou tecla da pessoa.
export function MusicPlayer({ url, owner }: { url: string; owner: string }) {
  const box = useRef<HTMLDivElement>(null)
  const embed = parseMusic(url)
  const key = !embed ? '' : embed.kind === 'youtube' ? `yt:${embed.videoId ?? embed.list}` : `sc:${embed.src}`

  useEffect(() => {
    const host = box.current
    if (!embed || !host) return
    let dead = false
    let cleanup = () => {}
    const onGesture = (fn: () => void) => {
      const evs = ['pointerdown', 'keydown', 'touchstart']
      evs.forEach((e) => window.addEventListener(e, fn, { passive: true }))
      return () => evs.forEach((e) => window.removeEventListener(e, fn))
    }

    if (embed.kind === 'youtube') {
      loadYouTube().then((YT) => {
        if (dead) return
        const mount = document.createElement('div')
        host.appendChild(mount)
        const playerVars = { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, loop: 1, origin: window.location.origin, ...(embed.videoId ? { playlist: embed.videoId } : { listType: 'playlist', list: embed.list }) }
        const p = new YT.Player(mount, {
          width: '100%', height: '100%', videoId: embed.videoId, playerVars,
          events: {
            onReady: () => {
              try { p.playVideo() } catch { /* ignora */ }
              setTimeout(() => { try { if (p.getPlayerState() !== 1) { p.mute(); p.playVideo() } } catch { /* ignora */ } }, 1500)
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === 0) p.playVideo()                                              // terminou: recomeça (loop)
              if (e.data === 2 && document.visibilityState === 'visible') p.playVideo()   // pausou sozinho: retoma
            },
          },
        })
        const off = onGesture(() => { try { if (p.isMuted()) p.unMute(); p.setVolume(100); if (p.getPlayerState() !== 1) p.playVideo() } catch { /* ignora */ } })
        cleanup = () => { off(); try { p.destroy() } catch { /* ignora */ } }
      })
    } else {
      const f = document.createElement('iframe')
      f.src = embed.src
      f.allow = 'autoplay'
      f.title = `música do perfil de @${owner}`
      f.style.cssText = 'width:100%;height:100%;border:0'
      host.appendChild(f)
      loadSoundCloud().then((SC) => {
        if (dead) return
        const w = SC.Widget(f)
        w.bind(SC.Widget.Events.READY, () => {
          w.setVolume(100); w.play()
          setTimeout(() => w.isPaused((paused: boolean) => { if (paused) { w.setVolume(0); w.play() } }), 1500)
        })
        w.bind(SC.Widget.Events.FINISH, () => { w.seekTo(0); w.play() })                 // loop
        const off = onGesture(() => { w.setVolume(100); w.isPaused((paused: boolean) => { if (paused) w.play() }) })
        cleanup = () => { off(); try { w.unbind(SC.Widget.Events.FINISH) } catch { /* ignora */ } }
      })
    }
    return () => { dead = true; cleanup(); host.innerHTML = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!embed) return null
  return (
    <div className="card mx-auto w-full max-w-sm p-3 text-left">
      <p className="mb-2 text-xs text-cream/70">♪ música do perfil de @{owner}</p>
      <div ref={box} className="pointer-events-none w-full overflow-hidden rounded-xl bg-black/30" style={{ height: embed.kind === 'youtube' ? 200 : 140 }} />
    </div>
  )
}
