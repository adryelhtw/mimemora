import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../types'
import { Avatar, Sheet } from './ui'
import { fetchFollowCounts, fetchFollowList } from '../lib/api'

type Kind = 'following' | 'followers'

// Contadores de "seguindo" e "seguidores" de um perfil, com a lista de pessoas ao tocar.
export function FollowStats({ userId, refreshKey }: { userId: string; refreshKey?: unknown }) {
  const [counts, setCounts] = useState<{ following: number; followers: number } | null>(null)
  const [open, setOpen] = useState<Kind | null>(null)
  useEffect(() => {
    let alive = true
    fetchFollowCounts(userId).then((c) => alive && setCounts(c)).catch(() => undefined)
    return () => { alive = false }
  }, [userId, refreshKey])

  const btn = (k: Kind, n: number, label: string) => (
    <button onClick={() => setOpen(k)} className="rounded-full px-3 py-1 text-sm hover:bg-white/10"><b className="font-display text-lg text-gold">{n}</b> {label}</button>
  )
  return (
    <>
      <div className="flex justify-center gap-2">{btn('following', counts?.following ?? 0, 'seguindo')}{btn('followers', counts?.followers ?? 0, 'seguidores')}</div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open === 'followers' ? 'Seguidores' : 'Seguindo'}>
        {open && <PeopleList userId={userId} kind={open} onNavigate={() => setOpen(null)} />}
      </Sheet>
    </>
  )
}

function PeopleList({ userId, kind, onNavigate }: { userId: string; kind: Kind; onNavigate: () => void }) {
  const [list, setList] = useState<Profile[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => { fetchFollowList(userId, kind).then(setList).catch(() => setErr('Não consegui carregar a lista agora.')) }, [userId, kind])
  return (
    <div className="space-y-2">
      {!list && !err && <p className="text-cream/70">Carregando…</p>}
      {list && !list.length && <p className="card p-4 text-center text-cream/70">{kind === 'followers' ? 'Ninguém segue esse perfil ainda.' : 'Esse perfil ainda não segue ninguém.'}</p>}
      {list?.map((u) => (
        <Link key={u.id} to={`/u/${u.username}`} onClick={onNavigate} className="card flex items-center gap-3 p-3 hover:bg-white/10">
          <Avatar p={u} size={40} />
          <span className="min-w-0"><b className="block truncate">{u.name}</b><span className="text-sm text-cream/70">@{u.username}</span></span>
        </Link>
      ))}
      <p className="min-h-5 text-center text-sm font-bold text-gold" role="alert">{err}</p>
    </div>
  )
}
