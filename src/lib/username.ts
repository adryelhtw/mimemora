// Regras do username. O limite curto existe porque o nome aparece em etiquetas sobre os enfeites.
// A validação real fica no banco (trigger em supabase/migrations/003_*.sql); esta função só dá feedback imediato.
export const USERNAME_MIN = 3
export const USERNAME_MAX = 10
const RE = new RegExp(`^[a-z0-9_]{${USERNAME_MIN},${USERNAME_MAX}}$`)

export const normalizeUsername = (v: string) => v.trim().toLowerCase().replace(/^@/, '')
export const isValidUsername = (v: string) => RE.test(v)
export const usernameError = (v: string) =>
  isValidUsername(v) ? '' : `Use de ${USERNAME_MIN} a ${USERNAME_MAX} caracteres: letras minúsculas, números ou _.`
