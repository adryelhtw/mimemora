const P = {
  tree: 'M12 3 7 10h3l-4 6h12l-4-6h3zM12 16v5',
  gift: 'M4 10h16v4H4zM5 14h14v7H5zM12 10v11M12 10C9 10 8 6 10 6s2 4 2 4zM12 10c3 0 4-4 2-4s-2 4-2 4z',
  heart: 'M12 20C5 15 3 11 5 8s6-2 7 1c1-3 5-4 7-1s0 7-7 12z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
  close: 'M6 6l12 12M18 6 6 18',
  flip: 'M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5',
  check: 'M5 12l5 5 9-10',
} as const
export type IconName = keyof typeof P

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}
