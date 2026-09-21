import { MessageCircle, ShieldCheck } from 'lucide-react'

const quickReplies = [
  'Is this item still available?',
  'Is the price negotiable?',
  'Can you confirm the condition?',
  'Are all the features working?',
  'Can I see more photos of the item?',
  'Where can we arrange delivery or pickup?',
]

export function Messages() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Atomos</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Messages</h1>
        <p className="mt-2 text-sm text-slate-500">Start a conversation with a seller from any product listing.</p>
      </div>
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={19}/>
          <div>
            <p className="text-sm font-black text-blue-950">Keep transactions inside Atomos.</p>
            <p className="mt-1 text-xs leading-5 text-blue-900">Never send payment, OTPs or card details outside the app. Trying to move a transaction off-platform may result in account restrictions or a permanent ban.</p>
          </div>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><MessageCircle size={20}/></div>
          <div><h2 className="font-black text-slate-950">Your conversations</h2><p className="text-sm text-slate-500">See messages with sellers here</p></div>
        </div>
        <div className="border-b border-slate-100 p-5">
          <p className="text-sm font-black text-slate-950">Quick replies</p>
          <p className="mt-1 text-sm text-slate-500">Use one of these when you open a seller chat.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {quickReplies.map(reply => <button key={reply} type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{reply}</button>)}
          </div>
        </div>
        <div className="p-8 text-center text-sm text-slate-500">See messages with sellers here</div>
      </section>
    </main>
  )
}
