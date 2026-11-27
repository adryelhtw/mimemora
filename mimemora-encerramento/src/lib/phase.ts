import { nowMs } from './clock'

// Fases do evento, sempre a partir das datas do banco (events.opens_at e events.ends_at) e do relógio do servidor.
//  live   : antes de opens_at (25/12 00:00)  -> criar árvore, enfeitar, presentes e Brilho Mágico
//  reveal : de opens_at até ends_at (01/01)  -> sem árvore/enfeite/presente misterioso novos; Brilho Mágico e abertura de cartas/presentes
//  ended  : a partir de ends_at              -> evento encerrado; só memórias
// O servidor é quem decide de verdade (RLS e RPCs); aqui só escolhemos o que mostrar.
export type Phase = 'live' | 'reveal' | 'ended'

export function phaseOf(e: { opens_at: string; ends_at: string }, t: number = nowMs()): Phase {
  if (t >= new Date(e.ends_at).getTime()) return 'ended'
  if (t >= new Date(e.opens_at).getTime()) return 'reveal'
  return 'live'
}
