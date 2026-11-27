export type EventModule = {
  slug: string
  name: string
  opensAt: string
}

export const events: EventModule[] = [
  { slug: 'natal-2026', name: 'Natal 2026', opensAt: '2026-12-25T03:00:00Z' },
]

export const getEvent = (slug: string) => events.find((e) => e.slug === slug)
