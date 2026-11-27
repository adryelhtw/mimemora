import { Link } from 'react-router-dom'
import { upcoming } from '../mocks/data'
import type { TreeData } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { Countdown } from '../events/natal-2026/Countdown'

export function Events({ tree }: { tree: TreeData }) {
  return (
    <section className="space-y-5">
      <h1 className="font-display text-3xl">Eventos</h1>
      <article className="card overflow-hidden p-5" style={{ background: 'linear-gradient(135deg,rgba(31,112,72,.45),rgba(201,23,47,.3))' }}>
        <span className="pill">Acontecendo agora</span>
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[140px_1fr]">
          <Tree model={tree.model} lights={tree.lights} topper={tree.topper} scene={tree.scene} base={false} className="mx-auto h-40" />
          <div className="space-y-3">
            <h2 className="font-display text-2xl">Natal 2026</h2>
            <p className="text-cream/80">Monte sua árvore, receba enfeites com mensagens secretas e abra tudo no dia 25.</p>
            <Countdown compact />
            <Link to="/" className="inline-block font-bold text-gold">Ir para minha árvore →</Link>
          </div>
        </div>
      </article>
      <h2 className="font-display text-xl">Em breve</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {upcoming.map((e) => (
          <article key={e.slug} className="rounded-3xl p-4 text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]" style={{ background: `linear-gradient(180deg, rgba(6,15,35,.25) 0%, rgba(6,15,35,.9) 55%), linear-gradient(135deg,${e.from},${e.to})` }}>
            <div className="text-3xl" aria-hidden="true">{e.emoji}</div>
            <h3 className="font-display text-lg leading-tight">{e.name}</h3>
            <p className="text-xs font-bold text-gold">{e.when}</p>
            <p className="mt-2 text-sm text-cream">{e.blurb}</p>
          </article>
        ))}
      </div>
      <Link to="/memorias" className="inline-block font-bold text-gold">Ver eventos passados nas Memórias →</Link>
    </section>
  )
}
