import { useEffect, useMemo, useState } from 'react'
import { Medal } from '../components/Medal'
import { Sheet } from '../components/ui'
import { fetchAchievements } from '../lib/mimos'
import type { AchievementRow } from '../lib/mimos'

const EVENTS: Record<string, string> = { natal: 'Natal', _: 'Em todos os eventos' }
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

// Coleção de conquistas, organizada por evento. Conquistas secretas só mostram uma medalha misteriosa até serem desbloqueadas
// (o nome e o requisito nem chegam ao navegador antes disso).
export function Achievements() {
  const [rows, setRows] = useState<AchievementRow[] | null>(null)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState<AchievementRow | null>(null)
  useEffect(() => { fetchAchievements().then(setRows).catch(() => setErr('Não consegui carregar as conquistas agora.')) }, [])

  const groups = useMemo(() => {
    const m = new Map<string, AchievementRow[]>()
    ;(rows ?? []).forEach((r) => m.set(r.event_kind ?? '_', [...(m.get(r.event_kind ?? '_') ?? []), r]))
    return [...m.entries()]
  }, [rows])
  const total = rows?.length ?? 0, got = rows?.filter((r) => r.unlocked).length ?? 0

  return (
    <section className="space-y-4">
      <div><h1 className="font-display text-3xl">Conquistas</h1><p className="text-cream/70">{rows ? `${got} de ${total} desbloqueadas` : 'Carregando…'}</p></div>
      {err && <p className="text-sm font-bold text-gold" role="alert">{err}</p>}
      {groups.map(([ev, list], gi) => {
        const unlocked = list.filter((r) => r.unlocked), progress = list.filter((r) => !r.unlocked && !r.secret), secret = list.filter((r) => !r.unlocked && r.secret)
        return (
          <details key={ev} open={gi === 0} className="card p-4">
            <summary className="cursor-pointer font-display text-xl">{EVENTS[ev] ?? ev} <span className="text-sm text-cream/60">· {unlocked.length}/{list.length}</span></summary>
            <div className="mt-3 space-y-4">
              {!!unlocked.length && (
                <div><h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-cream/60">desbloqueadas</h3>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {unlocked.map((r) => <button key={r.id} onClick={() => setPick(r)} className="flex flex-col items-center gap-1 text-center text-xs font-bold"><Medal icon={r.icon} size={52} />{r.name}</button>)}
                  </div></div>
              )}
              {!!progress.length && (
                <div><h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-cream/60">em progresso</h3>
                  <div className="space-y-2">
                    {progress.map((r) => (
                      <button key={r.id} onClick={() => setPick(r)} className="flex w-full items-center gap-3 rounded-xl bg-black/20 p-2 text-left">
                        <Medal icon={r.icon} locked size={40} />
                        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{r.name}</b>
                          <span className="meter mt-1 block"><span style={{ width: `${Math.round(((r.progress ?? 0) / (r.target ?? 1)) * 100)}%` }} /></span></span>
                        <span className="text-xs text-cream/70">{r.progress}/{r.target}</span>
                      </button>
                    ))}
                  </div></div>
              )}
              {!!secret.length && (
                <div><h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-cream/60">secretas · {secret.length}</h3>
                  <div className="flex flex-wrap gap-2">{secret.map((r) => <button key={r.id} onClick={() => setPick(r)} aria-label="Conquista secreta"><Medal icon="secret" locked size={44} /></button>)}</div></div>
              )}
            </div>
          </details>
        )
      })}
      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.name ?? 'Conquista secreta'}>
        {pick && (
          <div className="space-y-3 text-center">
            <div className="flex justify-center"><Medal icon={pick.icon} locked={!pick.unlocked} size={72} /></div>
            {pick.name === null
              ? <p className="text-cream/80">Esta conquista é secreta. Continue explorando e ela se revela quando você a desbloquear.</p>
              : <>
                  <p className="text-cream/85">{pick.description}</p>
                  {pick.unlocked ? <p className="text-sm text-gold">Desbloqueada em {pick.unlocked_at ? day(pick.unlocked_at) : ''}{pick.event_kind ? ` · ${EVENTS[pick.event_kind] ?? pick.event_kind}` : ''}</p>
                    : <p className="text-sm text-cream/70">Progresso: {pick.progress}/{pick.target}</p>}
                  {!!pick.reward_mimos && <p className="text-xs text-cream/60">Recompensa: {pick.reward_mimos} mimos</p>}
                </>}
          </div>
        )}
      </Sheet>
    </section>
  )
}
