import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Medal } from './Medal'
import { fetchPublicAchievements } from '../lib/mimos'

type Row = { id: string; name: string; icon: string; unlocked_at: string }

// Poucas conquistas em destaque no perfil (as 3 mais recentes). A coleção completa fica em /conquistas.
export function AchievementsStrip({ userId, own }: { userId: string; own?: boolean }) {
  const [list, setList] = useState<Row[] | null>(null)
  useEffect(() => {
    let alive = true
    fetchPublicAchievements(userId).then((r) => alive && setList(r)).catch(() => alive && setList([]))
    return () => { alive = false }
  }, [userId])
  if (!list) return null
  const top = list.slice(0, 3)
  if (!top.length && !own) return null
  return (
    <div className="flex items-center justify-center gap-2">
      {top.map((a) => <span key={a.id} title={a.name}><Medal icon={a.icon} size={34} /></span>)}
      {own && <Link to="/conquistas" className="text-xs font-bold text-cream/70 underline">{top.length ? 'ver coleção' : 'ver conquistas'}</Link>}
      {!own && list.length > 3 && <span className="text-xs text-cream/60">+{list.length - 3}</span>}
    </div>
  )
}
