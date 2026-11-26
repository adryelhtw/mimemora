const PATHS: Record<string, string> = {
  tree: 'M12 3 7 10h3l-4 6h12l-4-6h3zM12 16v5',
  ornament: 'M12 3v3M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  heart: 'M12 20C5 15 3 11 5 8s6-2 7 1c1-3 5-4 7-1s0 7-7 12z',
  gift: 'M4 10h16v4H4zM5 14h14v7H5zM12 10v11M12 10C9 10 8 6 10 6s2 4 2 4zM12 10c3 0 4-4 2-4s-2 4-2 4z',
  moon: 'M20 14A8 8 0 1 1 10 4a6.500 6.500 0 0 0 10 10z',
  sparkle: 'M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 3v3M20.500 4.500h-3',
}

// Medalha de conquista. "secret" = medalha misteriosa (conquista secreta ainda não desbloqueada).
export function Medal({ icon, locked, size = 44 }: { icon: string; locked?: boolean; size?: number }) {
  const secret = icon === 'secret'
  return (
    <span className="grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: locked ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#ffe9a8,#e0a82e)', border: locked ? '1px dashed rgba(255,255,255,.3)' : '1px solid #fff3c4', boxShadow: locked ? 'none' : '0 0 10px rgba(242,196,109,.45)' }}>
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke={locked ? 'rgba(255,255,255,.45)' : '#5a3a00'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {secret ? <path d="M9.500 9a2.500 2.500 0 1 1 3.500 2.300c-.7.4-1 1-1 1.700M12 17h.01" /> : <path d={PATHS[icon] ?? PATHS.star} />}
      </svg>
    </span>
  )
}
