/* eslint-disable @typescript-eslint/no-explicit-any */
// Carrega as APIs oficiais do YouTube e do SoundCloud para controlar o player (loop, volume, retomar).
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; SC?: any }
}

let yt: Promise<any> | null = null
export const loadYouTube = () => (yt ??= new Promise<any>((res) => {
  if (window.YT?.Player) { res(window.YT); return }
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT) }
  const s = document.createElement('script')
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(s)
}))

let sc: Promise<any> | null = null
export const loadSoundCloud = () => (sc ??= new Promise<any>((res) => {
  if (window.SC?.Widget) { res(window.SC); return }
  const s = document.createElement('script')
  s.src = 'https://w.soundcloud.com/player/api.js'
  s.onload = () => res(window.SC)
  document.head.appendChild(s)
}))
