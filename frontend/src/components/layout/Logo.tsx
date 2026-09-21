import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" aria-label="Atomos home" className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-blue-600 shadow-sm shadow-blue-600/25">
        <span className="absolute h-5 w-5 rotate-45 rounded-[5px] border-2 border-white/90" />
        <span className="relative h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="text-xl font-black tracking-[-0.055em] text-slate-950">ATOMOS</span>
    </Link>
  )
}
