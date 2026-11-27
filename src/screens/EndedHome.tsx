import { Link } from 'react-router-dom'

// Home depois do encerramento do Natal 2026. Não mostra contagem, fases nem botões de participação,
// e não revela nada sobre o próximo evento: só uma caixa lacrada com luz pela fresta.
const STARS: [number, number, number, number][] = [[28, 40, 2.2, 0], [168, 30, 1.8, .7], [150, 92, 2.4, 1.3], [40, 110, 1.6, 2], [100, 14, 2, 1], [184, 120, 1.5, 1.8], [14, 78, 1.8, .4]]

function SealedBox() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Uma caixa de presente lacrada, com luz saindo pela fresta">
      <defs>
        <linearGradient id="eh-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#f2d89a" stopOpacity=".85" /><stop offset="1" stopColor="#f2d89a" stopOpacity="0" /></linearGradient>
        <linearGradient id="eh-box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8a3a48" /><stop offset="1" stopColor="#4a1d27" /></linearGradient>
      </defs>
      {STARS.map(([x, y, r, d], i) => <circle key={i} cx={x} cy={y} r={r} fill="#f2d89a" className="twinkle" style={{ animation: `twinkle ${2.4 + (i % 3) * .6}s ease-in-out ${d}s infinite` }} />)}
      <polygon points="78,128 122,128 150,18 50,18" fill="url(#eh-beam)" className="ended-beam" />
      <ellipse cx="100" cy="176" rx="62" ry="7" fill="#000" opacity=".25" />
      <rect x="52" y="128" width="96" height="46" rx="4" fill="url(#eh-box)" stroke="#cdb98f" strokeOpacity=".5" />
      <rect x="94" y="128" width="12" height="46" fill="#cdb98f" />
      <g className="ended-lid">
        <rect x="46" y="110" width="108" height="16" rx="4" fill="#8a3a48" stroke="#cdb98f" strokeOpacity=".6" />
        <rect x="94" y="110" width="12" height="16" fill="#e3d2a6" />
        <path d="M100 110 C84 92 70 100 78 108 C84 114 96 112 100 110 Z M100 110 C116 92 130 100 122 108 C116 114 104 112 100 110 Z" fill="none" stroke="#e3d2a6" strokeWidth="3" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function EndedHome({ loggedIn, hasUsername, hasTree }: { loggedIn: boolean; hasUsername: boolean; hasTree: boolean }) {
  return (
    <section className="relative mx-auto flex max-w-md flex-col items-center gap-5 py-8 text-center">
      <div className="relative h-56 w-56">
        <div className="glow" />
        <div className="relative h-full w-full"><SealedBox /></div>
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">Uma nova experiência está sendo preparada...</h1>
        <p className="text-cream/85">O Natal 2026 chegou ao fim, mas essa história não termina aqui. Estamos preparando uma nova experiência. Ainda não podemos revelar o que vem por aí. Fique de olho!</p>
        <p className="font-hand text-2xl leading-tight text-gold">Enquanto isso, você pode revisitar as lembranças que ficaram.</p>
      </div>
      {loggedIn && hasUsername && !hasTree && (
        <p className="card p-3 text-sm text-cream/80" role="status">Você não montou uma árvore no Natal 2026, então ainda não há memórias suas por aqui. A criação de árvores fechou em 25/12 e o evento terminou em 1º de janeiro.</p>
      )}
      <Link to="/memorias" className="cta">REVIVER NATAL 2026</Link>
      {!loggedIn && <Link to="/entrar" className="text-sm font-bold text-gold underline">Entrar na minha conta</Link>}
    </section>
  )
}

// Entre 25/12 e 31/12 quem não criou árvore não pode mais criar: explicação em vez de mandar para uma tela que o banco recusaria.
export function TreeClosed() {
  return (
    <section className="mx-auto max-w-md space-y-3 py-16 text-center">
      <h1 className="font-display text-3xl">As árvores deste Natal já fecharam</h1>
      <p className="text-cream/80">A criação de árvores terminou em 25/12. Você ainda pode visitar a árvore de amigos e enviar um Brilho Mágico até 31/12.</p>
      <Link to="/eventos" className="inline-block font-bold text-gold">Ver eventos →</Link>
    </section>
  )
}
