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

export type Gift = { id: string; kind: 'brilho' | 'misterioso'; from: string; createdAt: string; expiresAt: string | null; openedAt: string | null }
export type Profile = { id?: string; username: string; name: string; hue: number; photo?: string; music?: string; frame?: string; effect?: string; about?: string; favoriteDate?: string }
// A mensagem nunca vem junto com o enfeite: ela só é buscada, carta por carta, pelas funções open_letter / read_letter (o servidor confere a permissão).
export type Side = 'frente' | 'verso'
export type Ornament = { id: string; type: OrnamentType; side: Side; slot: number; from: string; message?: string }
export type TreeData = { gifts?: Gift[]; id?: string; revealedAt?: string | null; memoryPublic?: boolean; owner: Profile; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
export type Memory = { participationId: string; eventSlug: string; isPublic: boolean; eventName?: string; year: number; model: TreeModel; lights?: LightsKey; topper?: TopperKey; scene?: SceneKey; ornaments: Ornament[] }
export type FutureEvent = { slug: string; name: string; when: string; emoji: string; from: string; to: string; blurb: string }
