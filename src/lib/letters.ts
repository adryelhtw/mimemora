import { useCallback, useEffect, useState } from 'react'
import type { Ornament } from '../types'
import { fetchOpenedIds, openLetter } from './mimos'

export type LetterData = { body: string; first: boolean }

// Ordem de navegação entre os enfeites: frente (por posição) e depois verso.
export const orderOrnaments = (os: Ornament[]) => [...os].sort((a, b) => (a.side === b.side ? a.slot - b.slot : a.side === 'frente' ? -1 : 1))

// Cartas do DONO: cada abertura é registrada no servidor (open_letter), que também grava a primeira revelação.
export function useOwnerLetters(eventId: string, onRevealed?: (iso: string) => void) {
  const [opened, setOpened] = useState<Set<string>>(new Set())
  useEffect(() => {
    let alive = true
    fetchOpenedIds(eventId).then((s) => alive && setOpened(s)).catch(() => undefined)
    return () => { alive = false }
  }, [eventId])
  const load = useCallback(async (o: Ornament): Promise<LetterData> => {
    const r = await openLetter(o.id)
    setOpened((s) => (s.has(o.id) ? s : new Set(s).add(o.id)))
    if (r.revealed_at) onRevealed?.(r.revealed_at)
    return { body: r.body, first: !!r.first_time }
  }, [onRevealed])
  return { opened, load }
}
