      {[...TIERS].reverse().map((r) => {
        const d = tierPath(r.t, r.b, r.w, p.edge), br = branches(r.t, r.b, r.w)
        return (
          <g key={r.t}>
            <path d={d} transform="translate(0 7)" fill="#000" opacity=".22" />
            <path d={d} fill={u('g')} stroke={p.trim} strokeWidth={p.trim ? 2.4 : 0} strokeLinejoin="round" />
            <path d={d} fill={u('v')} />
            <path d={br} stroke="#000" strokeOpacity=".2" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d={br} transform="translate(0 -2)" stroke="#fff" strokeOpacity=".13" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d={`M150 ${r.t}Q${150 - r.w * 0.62} ${(r.t + r.b) / 2} ${150 - r.w} ${r.b}`} stroke="#fff" strokeOpacity=".22" strokeWidth="2" fill="none" strokeLinecap="round" />
            {p.snow && <path d={snowCap(r.t, r.b, r.w)} fill="#f4f9ff" opacity=".96" />}
          </g>
        )
      })}
      {sw.map((s, ti) => (
        <g key={ti} fill="none">
          {p.trim && <path d={`M${150 - s.hw * 1.04} ${s.y0 - 15}Q150 ${s.y0 + 9} ${150 + s.hw * 1.04} ${s.y0 - 15}`} stroke={p.trim} strokeWidth="3.2" strokeDasharray="0 7" strokeLinecap="round" opacity=".95" />}
          <path d={`M${150 - s.hw} ${s.y0}Q150 ${s.y0 + 26} ${150 + s.hw} ${s.y0}`} stroke="#1c1c1c" strokeOpacity=".55" />
        </g>
      ))}
      <g>{bulbs.map((b) => <circle key={b.k} cx={b.x} cy={b.y} r="6" fill={b.c} opacity=".3" />)}</g>
      {bulbs.map((b) => (
        <g key={b.k} className={tw} style={b.d}><circle cx={b.x} cy={b.y} r="2.7" fill={b.c} /><circle cx={b.x - 0.7} cy={b.y - 0.8} r="1" fill="#fff" /></g>
      ))}
      <circle cx="150" cy="44" r="28" fill={u('o')} className={animated ? 'pulse' : undefined} />
      <TopperArt kind={topper} glow={p.glow} starFill={u('s')} animated={animated} />
      {animated && SPARKLES.map(([x, y, k], i) => (
        <path key={i} d="M0-7 1.8-1.8 7 0 1.8 1.8 0 7-1.8 1.8-7 0-1.8-1.8Z" transform={`translate(${x} ${y}) scale(${k})`} fill="#fff8d6" className="twinkle" style={{ animationDelay: `${-i * 0.9}s` }} />
      ))}
      {base && <Gifts scene={scene} />}
      {side === 'frente' && boxes.map((g, i) => {
        const act = onGift ? () => onGift(g) : undefined
        const sender = g.from ? `@${g.from}` : '@oculto'
        const shortSender = sender.length > 7 ? `${sender.slice(0, 6)}…` : sender
        return (
          <g key={g.id} transform={`translate(${BOX_X[i] - 15} 364)`} style={{ cursor: act ? 'pointer' : undefined }} role={act ? 'button' : undefined} tabIndex={act ? 0 : undefined}
            aria-label={`Presente misterioso de ${g.from ? '@' + g.from : 'alguém'}`} onClick={act} onKeyDown={act ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } } : undefined}>
            <rect width="30" height="24" rx="2" fill={BOX_COLORS[i % BOX_COLORS.length]} stroke="#fff" strokeOpacity=".35" />
            <rect x="12" width="6" height="24" fill="#f2c46d" /><rect y="9" width="30" height="5" fill="#f2c46d" opacity=".9" />
            <g transform="translate(15 12)">
              <rect x="-13.5" y="-4.5" width="27" height="9" rx="3" fill="#0a1a33" fillOpacity=".82" stroke="#f2c46d" strokeOpacity=".65" strokeWidth=".5" />
              <text x="0" y="1.8" textAnchor="middle" fontSize="5.2" fontWeight="700" fill="#fff3b0" fontFamily="Nunito, system-ui, sans-serif">{shortSender}</text>
            </g>
            <path d="M15 0c-7-8-13-1-6 0zM15 0c7-8 13-1 6 0z" fill="none" stroke="#f2c46d" strokeWidth="2" />
          </g>
        )
      })}
      {tags && glows.slice(0, 3).map((g, i) => {
        const label = `✦ ${g.from ? '@' + g.from : 'oculto'}`, w = label.length * 4.8 + 10
        return (
          <g key={g.id} transform={`translate(${296 - w} ${22 + i * 18})`} style={{ cursor: onGift ? 'pointer' : undefined }} onClick={onGift ? () => onGift(g) : undefined}>
            <rect width={w} height="14" rx="7" fill="#0a1a33" fillOpacity=".9" stroke="#f2c46d" strokeOpacity=".7" strokeWidth=".8" />
            <text x={w / 2} y="10" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff3b0" fontFamily="Nunito, system-ui, sans-serif">{label}</text>
          </g>
        )
      })}
      {slots?.free.map((n) => {
        const [x, y] = SLOTS[n], pickSlot = () => slots.onPick(n)
        return (
          <g key={'s' + n} role="button" tabIndex={0} aria-label={`Posição livre ${n + 1}`} style={{ cursor: 'pointer' }} onClick={pickSlot}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickSlot() } }}>
            <circle cx={x} cy={y} r="27" fill="transparent" />
            <circle cx={x} cy={y} r="17" fill="rgba(255,255,255,.12)" stroke="#f2c46d" strokeWidth="1.6" strokeDasharray="3.5 3.5" className={animated ? 'slot' : undefined} />
            <path d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} stroke="#f2c46d" strokeWidth="2" strokeLinecap="round" />
          </g>
        )
      })}
      {ornaments.filter((o) => o.side === side).map((o) => {
        const [x, y] = SLOTS[o.slot] ?? SLOTS[0], s = 0.95
        const label = o.from ? `@${o.from.length > 12 ? o.from.slice(0, 11) + '…' : o.from}` : 'oculto', w = label.length * 4.8 + 9
        const act = onPick ? () => onPick(o) : undefined
        return (
          <g key={o.id}>
            <circle cx={x} cy={y} r="25" fill={u('og')} />
            <g transform={`translate(${x - 20 * s} ${y - 26 * s}) scale(${s})`}>
              <g
                className={animated ? 'sway' : undefined}
                style={{ animationDelay: `${-(o.slot % 7) * 0.6}s`, cursor: act ? 'pointer' : undefined }}
                role={act ? 'button' : undefined}
                tabIndex={act ? 0 : undefined}
                aria-label={act ? `Enfeite de @${o.from}` : undefined}
                onClick={act}
                onKeyDown={act ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } } : undefined}
              >
                <OrnamentArt type={o.type} />
                {sealed && (
                  <g transform="translate(29 36)">
                    <circle r="4.8" fill="#a3142f" stroke="#f5d98a" strokeWidth=".9" />
                    <path d="M-2.3-1.2 0 .9 2.3-1.2" stroke="#fff" strokeWidth=".9" fill="none" strokeLinecap="round" />
                  </g>
                )}
              </g>
            </g>
            {tags && (
              <g transform={`translate(${x} ${y - 26 * s - 2})`} onClick={act} style={{ cursor: act ? 'pointer' : undefined }}>
                <rect x={-w / 2} y="-7" width={w} height="14" rx="7" fill="#0a1a33" fillOpacity=".9" stroke="#f2c46d" strokeOpacity=".6" strokeWidth=".8" />
                <text textAnchor="middle" y="3.2" fontSize="8.6" fontWeight="700" fill="#fbf3e4" fontFamily="Nunito, system-ui, sans-serif">{label}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
