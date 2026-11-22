export type TreeModel = 'classica' | 'nevada' | 'elegante' | 'rosa' | 'meia-noite' | 'dourada' | 'violeta' | 'aurora' | 'solar'
export type OrnamentType =
  | 'bola-rubi' | 'bola-ouro' | 'bola-gelo' | 'estrela' | 'sino'
  | 'meia' | 'presente' | 'bengala' | 'boneco' | 'coracao'
  | 'biscoito' | 'rena' | 'pinguim' | 'anjo' | 'floco' | 'pinha'
  | 'vela' | 'carta' | 'caneca' | 'lua'

export type LightsKey = 'douradas' | 'brancas' | 'coloridas' | 'geladas'
export type TopperKey = 'estrela' | 'laco' | 'floco' | 'anjo' | 'lua' | 'coroa'
// Aparência definitiva da árvore (escolhida uma única vez na criação)
export type SceneKey = 'neve' | 'lareira' | 'floresta' | 'aurora' | 'praia' | 'doces'
export type Look = { model: TreeModel; lights: LightsKey; topper: TopperKey; scene: SceneKey }

export type Profile = { id?: string; username: string; name: string; hue: number; photo?: string }
// `message` só existe nos dados de Memórias (já reveladas). Na árvore atual a mensagem nunca vem para o front.
export type Side = 'frente' | 'verso'
export type Ornament = { id: string; type: OrnamentType; side: Side; slot: number; from: string; message?: string }
export type TreeData = { id?: string; owner: Profile; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
export type Memory = { eventName?: string; year: number; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
export type FutureEvent = { slug: string; name: string; when: string; emoji: string; from: string; to: string; blurb: string }
