import { useEffect, useRef } from 'react'

// Anúncios da Adsterra. Só aparecem no site publicado (npm run build), nunca no npm run dev.
const NATIVE_ID = 'container-4f3ed2001c81a58d4d915ac14c506e59'
const NATIVE_SRC = 'https://bauval.org/21/4f3ed2001c81a58d4d915ac14c506e59'
const SMARTLINK = 'https://araplhn.org/4/f1a247ab7066ccef55b3d3cbbea31e40'

export function AdSlot() {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !box.current) return
    const el = box.current
    let script: HTMLScriptElement | undefined
    // Só carrega o anúncio quando ele está perto de aparecer na tela (site mais leve).
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      script = document.createElement('script')
      script.async = true
      script.setAttribute('data-cfasync', 'false')
      script.src = NATIVE_SRC
      document.body.appendChild(script)
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => { io.disconnect(); script?.remove() }
  }, [])

  if (!import.meta.env.PROD) return null
  return (
    <aside aria-label="Publicidade" className="relative z-10 mx-auto mt-6 max-w-md px-4 text-center">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-cream/35">Publicidade</p>
      <div ref={box} id={NATIVE_ID} className="min-h-[100px]" />
      <a href={SMARTLINK} target="_blank" rel="sponsored noopener noreferrer" className="mt-2 inline-block text-[11px] text-cream/40 underline">
        Link patrocinado
      </a>
    </aside>
  )
}
