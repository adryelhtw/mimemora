import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Medal } from './Medal'
import { fetchAchievementCount, fetchPublicAchievements } from '../lib/mimos'

type Row = { id: string; name: string; icon: string; unlocked_at: string }

// No perfil: só as (até 3) conquistas que a pessoa escolheu destacar + o total, sem dizer quais são as outras.
export function AchievementsStrip({ userId, own }: { userId: string; own?: boolean }) {
  const [data, setData] = useState<{ top: Row[]; total: number } | null>(null)
  useEffect(() => {
    let alive = true
    Promise.all([fetchPublicAchievements(userId), fetchAchievementCount(userId)])
      .then(([top, total]) => alive && setData({ top, total }))
      .catch(() => alive && setData({ top: [], total: 0 }))
    return () => { alive = false }
  }, [userId])
  if (!data) return null
  if (!data.total && !own) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {data.top.map((a) => <span key={a.id} title={a.name}><Medal icon={a.icon} size={34} /></span>)}
      <span className="text-xs text-cream/65">{data.total} {data.total === 1 ? 'conquista' : 'conquistas'}</span>
      {own && <Link to="/conquistas" className="text-xs font-bold text-cream/70 underline">ver coleção</Link>}
    </div>
  )
}
