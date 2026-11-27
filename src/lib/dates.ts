// Datas comemorativas para a "data favorita" do perfil (e candidatas a futuros eventos).
export const FAV_DATES = [
  { key: 'natal', label: 'Natal', emoji: '🎄' },
  { key: 'pascoa', label: 'Páscoa', emoji: '🐣' },
  { key: 'halloween', label: 'Halloween', emoji: '🎃' },
  { key: 'namorados', label: 'Dia dos Namorados', emoji: '💘' },
  { key: 'carnaval', label: 'Carnaval', emoji: '🎭' },
  { key: 'ano-novo', label: 'Ano-novo', emoji: '🎆' },
  { key: 'festa-junina', label: 'Festa junina', emoji: '🎪' },
  { key: 'dia-das-maes', label: 'Dia das Mães', emoji: '🌷' },
  { key: 'dia-dos-pais', label: 'Dia dos Pais', emoji: '👔' },
  { key: 'dia-das-criancas', label: 'Dia das Crianças', emoji: '🧸' },
  { key: 'aniversario', label: 'Aniversário', emoji: '🎂' },
  { key: 'dia-do-amigo', label: 'Dia do Amigo', emoji: '🤝' },
] as const

export const favLabel = (key?: string) => {
  const d = FAV_DATES.find((x) => x.key === key)
  return d ? `${d.emoji} ${d.label}` : ''
}
