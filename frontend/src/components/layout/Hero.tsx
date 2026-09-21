import { motion } from 'framer-motion'
import { ArrowUpRight, ShieldCheck, Smartphone, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Hero() {
  return <section className="overflow-hidden bg-white">
    <div className="mx-auto grid min-h-[590px] max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
      <div>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600"/> TECH • FASHION • EVERYDAY</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[.9] tracking-[-.065em] text-slate-950 sm:text-7xl lg:text-8xl">YOUR TECH.<br/><span className="text-blue-600">YOUR STYLE.</span></h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Phones, laptops, accessories and everyday fashion — from Apple, Samsung, Xiaomi, Infinix and OPPO, with the condition clearly stated.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link to="/phones" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">Shop tech <ArrowUpRight size={18}/></Link><Link to="/search" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-900 transition hover:border-blue-200 hover:bg-blue-50">Search products</Link></div>
        <div className="mt-10 grid max-w-xl grid-cols-3 gap-3"><div className="rounded-2xl border border-slate-200 p-4"><Smartphone className="text-blue-600" size={20}/><p className="mt-3 text-xs font-bold text-slate-700">Phones first</p></div><div className="rounded-2xl border border-slate-200 p-4"><ShieldCheck className="text-blue-600" size={20}/><p className="mt-3 text-xs font-bold text-slate-700">Condition clear</p></div><div className="rounded-2xl border border-slate-200 p-4"><Zap className="text-blue-600" size={20}/><p className="mt-3 text-xs font-bold text-slate-700">Campus-ready</p></div></div>
      </div>
      <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-slate-950 p-5 shadow-2xl shadow-blue-900/10 sm:p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl"/><div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl"/>
        <div className="relative grid h-full place-items-center"><motion.div initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:.7}} className="relative w-full max-w-md overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur"><img src="https://images.unsplash.com/photo-1592286927505-2fd0f4f4c6b8?auto=format&fit=crop&w=1000&q=85" alt="Featured smartphone" className="h-[420px] w-full object-cover"/><div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/55 p-4 text-white backdrop-blur"><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Featured tech</p><p className="mt-1 text-lg font-black">Flagship devices. Honest listings.</p></div></motion.div></div>
      </div>
    </div>
    <div className="overflow-hidden border-y border-slate-200 bg-slate-50 py-4"><div className="marquee whitespace-nowrap text-sm font-black uppercase tracking-[0.22em] text-slate-700">ATOMOS / TECH • FASHION • ACCESSORIES • NEW & USED&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;ATOMOS / TECH • FASHION • ACCESSORIES • NEW & USED&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;</div></div>
  </section>
}
