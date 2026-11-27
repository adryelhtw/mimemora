// Prévia de link (Open Graph) para /u/:username. Só os "robôs" de WhatsApp, X/Twitter, Facebook, Telegram, Discord etc.
// chegam aqui (ver vercel.json): eles não executam JavaScript, então os metadados precisam vir prontos no HTML.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default async function handler(req, res) {
  const username = String(req.query.username || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
  const base = (process.env.VITE_SUPABASE_URL || '').trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1.*$/, '')
  const key = (process.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']+|["']+$/g, '')
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`

  let p = null
  try {
    const r = await fetch(`${base}/rest/v1/profiles?username=eq.${username}&select=username,display_name,avatar_url,card_url&limit=1`, { headers: { apikey: key } })
    if (r.ok) p = (await r.json())[0] ?? null
  } catch { /* sem perfil: usa a prévia genérica */ }

  // Datas do evento vêm do banco (com as datas oficiais como reserva): a prévia muda sozinha em 25/12 e em 01/01.
  let opensAt = Date.parse('2026-12-25T03:00:00Z'), endsAt = Date.parse('2027-01-01T03:00:00Z')
  try {
    const r = await fetch(`${base}/rest/v1/events?slug=eq.natal-2026&select=opens_at,ends_at&limit=1`, { headers: { apikey: key } })
    const e = r.ok ? (await r.json())[0] : null
    if (e) { opensAt = Date.parse(e.opens_at) || opensAt; endsAt = Date.parse(e.ends_at) || endsAt }
  } catch { /* usa as datas de reserva */ }
  const now = Date.now()
  const phase = now >= endsAt ? 'ended' : now >= opensAt ? 'reveal' : 'live'

  const url = `${origin}/u/${username}`
  const title = !p ? 'mimemora' : phase === 'ended' ? `@${p.username} · mimemora` : `árvore de natal de @${p.username} · mimemora`
  const desc = !p ? 'mimos e memórias para os dias especiais'
    : phase === 'live' ? `Deixe um enfeite na árvore de natal de @${p.username}. As mensagens secretas abrem em 25/12.`
    : phase === 'reveal' ? `Veja a árvore de natal de @${p.username} no mimemora.`
    : `Veja o perfil de @${p.username} no mimemora.`
  // A imagem de convite ("Deixe um enfeite") só vale enquanto dá para enfeitar; depois, só a foto do perfil.
  const avatar = p?.avatar_url?.startsWith('https://') ? p.avatar_url : ''
  const image = phase === 'live' ? (p?.card_url || avatar) : avatar

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="mimemora">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
</head><body><p><a href="${esc(url)}?app=1">${esc(title)}</a></p>
<script>if(!/bot|crawl|spider|preview|facebookexternalhit|whatsapp|embedly|slurp/i.test(navigator.userAgent))location.replace(${JSON.stringify(`/u/${username}?app=1`)})</script></body></html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
