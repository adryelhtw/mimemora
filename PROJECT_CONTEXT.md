# PROJECT_CONTEXT
Plataforma social multi-evento (nome pendente → APP_NAME em src/config/app.ts).
Primeiro evento: Natal 2026 (árvore digital + enfeites com mensagens secretas).

## Decisões
- Stack: React + Vite + TypeScript + Tailwind v4 + Supabase + Vercel (+ Vercel Functions só para OG).
- Login obrigatório para deixar enfeite (Google OAuth principal + e-mail).
- 1 enfeite por pessoa por árvore por edição (constraint no banco).
- Username de quem enfeitou é visível; a mensagem só abre em 25/12/2026 00:00 Brasília = 2026-12-25T03:00:00Z.
- Segredo imposto por RLS com relógio do servidor, nunca pelo front.
- Mensagens em tabela separada; view pública nunca as inclui.
- Links: /u/:username = evento atual; /u/:username/natal-2026 = histórico.
- OG dinâmico: Vercel Function em /u/:username + imagem via @vercel/og.
- Árvores/enfeites = SVG com slots fixos por modelo.
- Núcleo genérico; cada evento é módulo em src/events/<slug>/ registrado em src/events/registry.ts.

## Modelo de dados (Etapa 1)
profiles · events · participations · contributions (único: participação+remetente) · contribution_messages

## Etapas
- [x] 0 Base (gerada; validar com npm run dev)
- [ ] 1 Banco + RLS + evento Natal 2026
- [ ] 2 Contas, perfil, username
- [ ] 3 Árvore SVG, modelos, slots
- [ ] 4 Página pública, enfeite, mensagem, limite
- [ ] 5 Compartilhamento + OG + imagem para download
- [ ] 6 Contagem regressiva + revelação
- [ ] 7 Home, busca, histórico, eventos
- [ ] 8 Polimento, segurança, lançamento

## Notas
- Supabase free pausa por inatividade; e-mail embutido tem limite baixo → SMTP próprio (ex.: Resend).
- Vercel Hobby: uso não comercial.
- Instagram: sem publicação direta pela web. Discord: só copiar link.

## Encerramento do Natal 2026 (patch 20261129)
- Datas só no banco (events): opens_at = 25/12 00:00 (fim de árvores, enfeites, Presente Misterioso); ends_at = 01/01/2027 00:00 (fim do Brilho Mágico e do evento).
- Depois de ends_at: Home vira EndedHome (sem contagem/PhaseBar/participação), /memorias lista as memórias, /u/:username = só perfil, /u/:username/natal-2026 = memória (privacidade por memory_public).
- Permitido depois do fim: ler memórias, open_letter (só leitura), open_gift pendente, set_memory_visibility. Tudo conferido por RPC/RLS, não só no front.
- Memórias: seções "Presentes recebidos" (memory_gifts) e "Quem iluminou esta árvore?" (memory_glow_givers), dados reais de public.gifts.
- Não existe evento 2027 no banco; EVENT_SLUG segue fixo em natal-2026.
