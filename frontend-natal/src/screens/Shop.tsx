import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { LightsKey, Profile, SceneKey, TopperKey, TreeModel } from '../types'
import { Tree } from '../events/natal-2026/Tree'
import { OrnamentIcon } from '../events/natal-2026/ornaments'
import { Avatar, Sheet } from '../components/ui'
import { ProfileFx } from '../components/ProfileFx'
import { errText } from '../lib/api'
import { useMimos } from '../lib/mimosContext'
import { buyItem, equipItem, fetchCatalog, fetchCosmetics, fetchInventory, fetchLedger, fetchReferrals, fetchRewardRules } from '../lib/mimos'
import type { CatalogItem, LedgerRow, OwnedItem, ReferralRow, RewardRule } from '../lib/mimos'

type Tab = 'loja' | 'itens' | 'extrato' | 'indicacoes'
const GROUPS: [string, string[], string][] = [
  ['árvores', ['model', 'lights', 'topper', 'scene'], 'usados ao criar a sua árvore de cada evento'],
  ['perfil', ['frame', 'effect'], 'molduras e efeitos para o seu perfil'],
  ['presentes', ['gift'], 'enviados pelo perfil de um amigo'],
]
const REASONS: Record<string, string> = {
  tree_created: 'árvore criada', five_ornaments: '5 pessoas enfeitaram a sua árvore', friend_tree: 'enfeite em árvore de amigo',
  referral_1: 'indicação concluída', referral_2: 'indicação concluída', referral_n: 'indicação concluída', roulette: 'roleta diária',
  achievement: 'conquista', purchase: 'compra na loja', gift_brilho: 'brilho mágico enviado', gift_misterioso: 'presente misterioso enviado', gift_open: 'presente aberto',
}
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function Preview({ it, me }: { it: CatalogItem; me: Profile }) {
  const k = it.key
  if (it.kind === 'model') return <Tree model={k as TreeModel} animated={false} base={false} tags={false} className="mx-auto h-24" />
  if (it.kind === 'lights') return <Tree model="classica" lights={k as LightsKey} animated={false} base={false} tags={false} className="mx-auto h-24" />
  if (it.kind === 'topper') return <Tree model="classica" topper={k as TopperKey} animated={false} base={false} tags={false} className="mx-auto h-24" />
  if (it.kind === 'scene') return <Tree model="classica" scene={k as SceneKey} backdrop animated={false} base={false} tags={false} className="mx-auto h-24" />
  if (it.kind === 'frame') return <div className="flex h-24 items-center justify-center"><Avatar p={{ ...me, frame: k }} size={56} /></div>
  if (it.kind === 'effect') return <div className="relative isolate h-24 overflow-hidden rounded-xl bg-night-2"><ProfileFx kind={k} /></div>
  return <div className="flex h-24 items-center justify-center"><OrnamentIcon type={k === 'brilho' ? 'estrela' : 'presente'} className="h-20 w-16" /></div>
}

export function Shop({ me, onNotify }: { me: Profile; onNotify: (m: string) => void }) {
  const { balance, refresh } = useMimos()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('aba') as Tab) || 'loja')
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null)
  const [inv, setInv] = useState<OwnedItem[]>([])
  const [eq, setEq] = useState<{ frame: string | null; effect: string | null }>({ frame: null, effect: null })
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null)
  const [rules, setRules] = useState<RewardRule[]>([])
  const [refs, setRefs] = useState<ReferralRow[] | null>(null)
  const [buying, setBuying] = useState<CatalogItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const myId = me.id ?? ''

  const reload = useCallback(() => {
    fetchInventory(myId).then(setInv).catch(() => undefined)
    fetchCosmetics(myId).then(setEq).catch(() => undefined)
    fetchLedger(myId).then(setLedger).catch(() => undefined)
  }, [myId])
  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => setErr('Não consegui carregar a loja agora.'))
    fetchRewardRules().then(setRules).catch(() => undefined)
    fetchReferrals().then(setRefs).catch(() => undefined)
    reload()
  }, [reload])

  const owned = new Set(inv.map((o) => o.item_id))
  const confirmBuy = async () => {
    if (!buying) return
    setBusy(true); setErr('')
    try { await buyItem(buying.id); await refresh(true); reload(); onNotify(`${buying.name} agora é seu!`); setBuying(null) }
    catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }
  const equip = async (kind: 'frame' | 'effect', key: string) => {
    try { await equipItem(kind, key); reload(); onNotify(key ? 'Item equipado! Veja no seu perfil.' : 'Item removido do perfil.') }
    catch (e) { setErr(errText(e)) }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`flex-1 rounded-full px-2 py-2 text-sm font-bold ${tab === t ? 'bg-gold text-[#3a1500]' : 'text-cream/80'}`}>{label}</button>
  )
  const dur = (it: CatalogItem) => (it.duration_days ? `dura ${it.duration_days} dias` : 'permanente')

  const card = (it: CatalogItem) => {
    const mine = owned.has(it.id), short = (balance ?? 0) < it.price
    return (
      <div key={it.id} className="card flex flex-col gap-2 p-3 text-center">
        <Preview it={it} me={me} />
        <b>{it.name}</b>
        <p className="text-xs text-cream/70">{it.description}</p>
        <p className="text-[11px] text-cream/60">{it.tier === 'exclusivo' ? 'exclusivo · ' : ''}{it.kind === 'gift' ? 'presente' : dur(it)}{it.available_until ? ` · à venda até ${day(it.available_until)}` : ''}{it.min_event_year ? ` · usável a partir do Natal ${it.min_event_year}` : ''}</p>
        {it.kind === 'gift' ? <p className="text-sm font-bold text-gold">{it.price} mimos · envie pelo perfil de um amigo</p>
          : it.tier === 'exclusivo' ? <p className="text-sm text-cream/70">só em campanhas e presentes</p>
          : mine ? <p className="text-sm font-bold text-gold">já é seu ✓</p>
          : <button className="pill justify-center disabled:opacity-60" disabled={short} onClick={() => { setErr(''); setBuying(it) }}>{short ? `faltam ${it.price - (balance ?? 0)} mimos` : `comprar · ${it.price} mimos`}</button>}
      </div>
    )
  }

  const link = `${window.location.origin}/entrar?ref=${me.username}`
  const done = refs?.filter((r) => r.completed).length ?? 0
  const amount = (code: string) => rules.find((r) => r.code === code)?.amount ?? 0
  const next = done === 0 ? amount('referral_1') : done === 1 ? amount('referral_2') : amount('referral_n')
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* sem permissão */ } }

  return (
    <section className="space-y-5">
      <div className="text-center">
        <p className="font-hand text-2xl leading-none text-gold">seus mimos</p>
        <p className="font-display text-5xl text-gold">{balance ?? '…'}</p>
        <details className="mt-1 text-sm text-cream/75">
          <summary className="cursor-pointer font-bold text-gold">como ganhar mimos</summary>
          <ul className="mx-auto mt-2 max-w-sm space-y-1 text-left">
            <li>· girar a roleta todo dia (na página inicial)</li>
            {rules.filter((r) => r.amount > 0).map((r) => <li key={r.code}>· {r.description}: <b>{r.amount}</b></li>)}
            <li>· desbloquear conquistas</li>
          </ul>
        </details>
      </div>
      <div className="flex gap-1 rounded-full border border-white/15 bg-black/25 p-1" role="group" aria-label="Seções">
        {tabBtn('loja', 'loja')}{tabBtn('itens', 'meus itens')}{tabBtn('extrato', 'extrato')}{tabBtn('indicacoes', 'indicações')}
      </div>
      {err && <p className="text-center text-sm font-bold text-gold" role="alert">{err}</p>}

      {tab === 'loja' && (
        <div className="space-y-6">
          {!catalog && !err && <p className="text-center text-cream/70">Carregando…</p>}
          {GROUPS.map(([title, kinds, sub]) => {
            const list = (catalog ?? []).filter((c) => kinds.includes(c.kind))
            return list.length ? (
              <div key={title} className="space-y-2">
                <div><h2 className="font-display text-xl">{title}</h2><p className="text-xs text-cream/60">{sub}</p></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{list.map(card)}</div>
              </div>
            ) : null
          })}
          <p className="text-center text-xs text-cream/50">Tudo o que não aparece aqui continua gratuito para todos.</p>
        </div>
      )}

      {tab === 'itens' && (
        <div className="space-y-2">
          {!inv.length && <p className="card p-6 text-center text-cream/70">Você ainda não tem itens especiais. Visite a loja ou gire a roleta!</p>}
          {inv.map((o) => {
            const it = catalog?.find((c) => c.id === o.item_id)
            if (!it) return null
            const cosmetic = it.kind === 'frame' || it.kind === 'effect'
            const on = cosmetic && eq[it.kind as 'frame' | 'effect'] === it.key
            return (
              <div key={o.item_id} className="card flex items-center gap-3 p-3">
                <div className="w-20 shrink-0"><Preview it={it} me={me} /></div>
                <div className="min-w-0 flex-1 text-left"><b className="block">{it.name}</b><span className="text-xs text-cream/65">{o.expires_at ? `até ${day(o.expires_at)}` : 'permanente'}</span></div>
                {cosmetic && <button onClick={() => equip(it.kind as 'frame' | 'effect', on ? '' : it.key)} className={on ? 'rounded-full border border-gold/60 px-3 py-1.5 text-sm font-bold text-gold' : 'pill'}>{on ? 'tirar' : 'usar'}</button>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'extrato' && (
        <ul className="space-y-1">
          {!ledger && <p className="text-center text-cream/70">Carregando…</p>}
          {ledger && !ledger.length && <p className="card p-6 text-center text-cream/70">Nenhuma movimentação ainda.</p>}
          {ledger?.map((r) => (
            <li key={r.id} className="card flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 text-left">{REASONS[r.reason] ?? r.reason}<span className="block text-xs text-cream/55">{day(r.created_at)}</span></span>
              <b className={r.amount > 0 ? 'text-gold' : 'text-cream/70'}>{r.amount > 0 ? '+' : ''}{r.amount}</b>
            </li>
          ))}
        </ul>
      )}

      {tab === 'indicacoes' && (
        <div className="space-y-3">
          <div className="card space-y-2 p-4 text-center">
            <p className="font-display text-lg">convide amigos</p>
            <p className="text-sm text-cream/75">Você ganha mimos quando um amigo se cadastra pelo seu link <b>e cria a própria árvore</b>. Próxima recompensa: <b className="text-gold">{next} mimos</b>.</p>
            <div className="flex items-center gap-2 rounded-xl bg-black/20 p-2 pl-3 text-left"><span className="min-w-0 flex-1 truncate text-sm">{link}</span><button onClick={copy} className="pill">{copied ? 'Copiado' : 'Copiar'}</button></div>
            <p className="text-xs text-cream/60">{refs?.length ?? 0} {refs?.length === 1 ? 'amigo indicado' : 'amigos indicados'} · {done} {done === 1 ? 'concluída' : 'concluídas'}</p>
          </div>
          {refs?.map((r) => (
            <div key={r.username} className="card flex items-center justify-between px-3 py-2 text-sm">
              <Link to={`/u/${r.username}`} className="hover:underline">@{r.username}</Link>
              <span className={r.completed ? 'font-bold text-gold' : 'text-cream/60'}>{r.completed ? 'árvore criada ✓' : 'ainda não criou a árvore'}</span>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!buying} onClose={() => setBuying(null)} title="Comprar item">
        {buying && (
          <div className="space-y-3 text-center">
            <Preview it={buying} me={me} />
            <p className="font-display text-xl">{buying.name}</p>
            <p className="text-sm text-cream/80">{buying.description}</p>
            <p className="text-sm">{dur(buying)} · custa <b className="text-gold">{buying.price} mimos</b></p>
            <p className="text-xs text-cream/60">Saldo depois da compra: {(balance ?? 0) - buying.price}</p>
            <button className="cta disabled:opacity-50" disabled={busy} onClick={confirmBuy}>{busy ? 'Comprando…' : 'Confirmar compra'}</button>
            <p className="min-h-5 text-sm font-bold text-gold" role="alert">{err}</p>
          </div>
        )}
      </Sheet>
    </section>
  )
}
