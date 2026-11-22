import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LIGHTS, MODELS, TOPPERS, TopperArt, Tree } from '../events/natal-2026/Tree'
import { SCENES } from '../events/natal-2026/scenes'
import type { LightsKey, Look, Profile, SceneKey, TopperKey, TreeModel } from '../types'
import { DEFAULT_LOOK, loadDraft, saveDraft } from '../lib/treeStore'
import { Sheet } from '../components/ui'

type Props = { me: Profile; confirmed: Look | null; justCreated: boolean; onConfirm: (l: Look) => Promise<string | null>; onFinish: () => void }

const Group = ({ title, hint, children }: { title: string; hint: string; children: ReactNode }) => (
  <div className="card p-4"><h2 className="font-display text-lg">{title}</h2><p className="mb-3 text-xs text-cream/60">{hint}</p>{children}</div>
)
const opt = (on: boolean) => `rounded-2xl border p-2 text-center text-xs font-bold ${on ? 'border-gold bg-gold/15 ring-2 ring-gold' : 'border-white/10 bg-white/5 hover:bg-white/10'}`

export function CreateTree({ me, confirmed, justCreated, onConfirm, onFinish }: Props) {
  const key = me.id ?? me.username
  const [restored] = useState(() => loadDraft(key))
  const [look, setLook] = useState<Look>(restored ?? DEFAULT_LOOK)
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (!confirmed) saveDraft(key, look) }, [look, confirmed, key])
  const confirm = async () => {
    setBusy(true); setErr('')
    const e = await onConfirm(look)
    setBusy(false)
    if (e) setErr(e); else setAsk(false)
  }

  if (confirmed && justCreated) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative w-64">
          <div className="glow" />
          <Tree model={confirmed.model} lights={confirmed.lights} topper={confirmed.topper} scene={confirmed.scene} backdrop className="pop relative w-full" />
        </div>
        <p className="font-hand text-3xl text-gold">Pronto, @{me.username}!</p>
        <h1 className="font-display text-3xl leading-tight">Sua árvore de Natal 2026 foi criada</h1>
        <p className="text-cream/80">Ela é a sua árvore oficial neste Natal e não poderá ser alterada. Agora é só chamar os amigos para enfeitar.</p>
        <button className="cta" onClick={onFinish}>Ver minha árvore</button>
      </section>
    )
  }

  const set = (p: Partial<Look>) => setLook((l) => ({ ...l, ...p }))
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-32 pt-4">
      <header className="mb-4 text-center lg:text-left">
        <p className="font-hand text-2xl leading-none text-gold">Natal 2026 · @{me.username}</p>
        <h1 className="font-display text-3xl">Monte a sua árvore de Natal</h1>
        <p className="text-sm text-cream/70">Escolha com carinho: depois de criada, ela não poderá ser trocada.{restored && ' Continuamos de onde você parou.'}</p>
      </header>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_1.1fr]">
        <div className="sticky top-2 z-20 rounded-3xl border border-white/10 bg-night-2 p-2 lg:top-6 lg:self-start">
          <div className="relative">
            <div className="glow" style={{ background: `radial-gradient(closest-side, ${MODELS[look.model].glow}55, transparent 70%)` }} />
            <Tree model={look.model} lights={look.lights} topper={look.topper} scene={look.scene} backdrop className="relative mx-auto max-h-[34dvh] w-full lg:max-h-[68dvh] lg:max-w-[420px]" />
          </div>
        </div>
        <div className="space-y-4">
          <Group title="Modelo" hint="Forma e cores da árvore">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MODELS) as TreeModel[]).map((m) => (
                <button key={m} onClick={() => set({ model: m })} aria-pressed={look.model === m} className={opt(look.model === m)}>
                  <Tree model={m} animated={false} base={false} className="mx-auto h-24" />{MODELS[m].name}
                </button>
              ))}
            </div>
          </Group>
          <Group title="Luzes" hint="A cor do pisca-pisca">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(LIGHTS) as LightsKey[]).map((k) => (
                <button key={k} onClick={() => set({ lights: k })} aria-pressed={look.lights === k} className={opt(look.lights === k)}>
                  <span className="mb-1 flex justify-center gap-1">{LIGHTS[k].colors.map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}</span>{LIGHTS[k].name}
                </button>
              ))}
            </div>
          </Group>
          <Group title="Enfeite do topo" hint="O que fica na ponta da árvore">
            <div className="grid grid-cols-3 gap-2">
              {TOPPERS.map((t) => (
                <button key={t.key} onClick={() => set({ topper: t.key as TopperKey })} aria-pressed={look.topper === t.key} className={opt(look.topper === t.key)}>
                  <svg viewBox="105 0 90 75" className="mx-auto h-14" aria-hidden="true"><TopperArt kind={t.key} glow="#ffcf6a" starFill="#f4b93a" /></svg>{t.name}
                </button>
              ))}
            </div>
          </Group>
          <Group title="Cenário" hint="O fundo, o chão e os presentes ao redor da árvore">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(SCENES) as SceneKey[]).map((k) => (
                <button key={k} onClick={() => set({ scene: k })} aria-pressed={look.scene === k} className={opt(look.scene === k)}>
                  <Tree model={look.model} lights={look.lights} topper={look.topper} scene={k} backdrop animated={false} className="mx-auto mb-1 h-28" />{SCENES[k].name}
                </button>
              ))}
            </div>
          </Group>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night-2 p-3">
        <div className="mx-auto max-w-md"><button className="cta" onClick={() => setAsk(true)}>Criar minha árvore</button></div>
      </div>
      <Sheet open={ask} onClose={() => setAsk(false)} title="Criar a sua árvore?">
        <div className="space-y-4 text-center">
          <Tree model={look.model} lights={look.lights} topper={look.topper} scene={look.scene} backdrop animated={false} className="mx-auto h-48" />
          <p className="text-cream/80">Depois de criada, a árvore fica definida para o Natal 2026 e <b>não poderá ser alterada</b>.</p>
          <button className="cta disabled:opacity-50" disabled={busy} onClick={confirm}>{busy ? 'Criando…' : 'Criar minha árvore'}</button>
          <p className="min-h-5 text-sm font-bold text-gold" role="alert">{err}</p>
          <button className="font-bold text-gold" onClick={() => setAsk(false)}>Voltar e ajustar</button>
        </div>
      </Sheet>
    </div>
  )
}
