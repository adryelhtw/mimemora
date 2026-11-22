// Só o RASCUNHO da criação fica no navegador (para continuar depois). A árvore definitiva mora no banco.
import type { Look } from '../types'
import { LIGHTS, MODELS, TOPPERS } from '../events/natal-2026/Tree'
import { SCENES } from '../events/natal-2026/scenes'

export const DEFAULT_LOOK: Look = { model: 'classica', lights: 'douradas', topper: 'estrela', scene: 'neve' }
const key = (uid: string) => `rascunho-arvore:natal-2026:${uid}`

export const loadDraft = (uid: string): Look | null => {
  try {
    const v = JSON.parse(localStorage.getItem(key(uid)) ?? 'null')
    if (!v || !(v.model in MODELS) || !(v.lights in LIGHTS) || !TOPPERS.some((t) => t.key === v.topper) || !(v.scene in SCENES)) return null
    return { model: v.model, lights: v.lights, topper: v.topper, scene: v.scene }
  } catch { return null }
}
export const saveDraft = (uid: string, l: Look) => { try { localStorage.setItem(key(uid), JSON.stringify(l)) } catch { /* sem armazenamento */ } }
export const clearDraft = (uid: string) => { try { localStorage.removeItem(key(uid)) } catch { /* ok */ } }
