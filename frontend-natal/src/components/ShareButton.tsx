import { Icon } from './Icons'

export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="cta share-cta" onClick={onClick}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#3a1500]/15"><Icon name="share" className="h-6 w-6" /></span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold">Compartilhar minha árvore</span>
        <span className="block text-sm font-semibold opacity-80">Chame seus amigos para enfeitar 🎁</span>
      </span>
    </button>
  )
}
