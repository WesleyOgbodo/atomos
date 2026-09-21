import { FormEvent, useState } from 'react'
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useProduct } from '@/hooks/useProducts'

const quickReplies = [
  'Is this item still available?',
  'Is the price negotiable?',
  'Can you confirm the condition?',
  'Are all the features working?',
  'Can I see more photos of the item?',
  'Where can we arrange delivery or pickup?',
]

export function Chat() {
  const { productId } = useParams()
  const { product, loading } = useProduct(productId)
  const [messages, setMessages] = useState<{id:string; from:'buyer'; text:string}[]>([])
  const [draft, setDraft] = useState('')

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-20 text-center text-sm font-semibold text-slate-500">Loading listing…</main>

  if (!product) return <main className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-3xl font-black">Conversation not found</h1><Link className="mt-4 inline-block text-blue-600 underline" to="/featured">Back to shop</Link></main>

  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message) return
    setMessages(current => [...current, { id: `buyer-${Date.now()}`, from: 'buyer', text: message }])
    setDraft('')
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <Link to={`/products/${product.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600"><ArrowLeft size={16}/> Back to listing</Link>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Atomos messages</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-2xl font-black text-slate-950">Chat with seller</h1><p className="mt-1 text-sm text-slate-500">{product.name} · {product.location}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">Seller</span>
          </div>
        </header>
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 sm:px-7"><div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={19}/><div><p className="text-sm font-black text-amber-950">Stay protected: keep every transaction inside Atomos.</p><p className="mt-1 text-xs leading-5 text-amber-900">Do not send money, card details, OTPs or payment links outside Atomos. Attempts to move a transaction off-platform may result in account restrictions or a permanent ban.</p></div></div></div>
        <section className="border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
          <p className="text-sm font-black text-slate-950">Suggested quick replies</p>
          <div className="mt-3 flex flex-wrap gap-2">{quickReplies.map(reply => <button key={reply} type="button" onClick={() => setDraft(reply)} className="rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{reply}</button>)}</div>
        </section>
        <section className="min-h-[260px] space-y-4 bg-slate-50 px-5 py-6 sm:px-7" aria-label="Conversation">
          {messages.length === 0 ? <div className="flex min-h-[220px] items-center justify-center text-center"><p className="text-sm text-slate-500">See messages with sellers here</p></div> : messages.map(message => <div key={message.id} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white">{message.text}</div></div>)}
        </section>
        <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 bg-white p-4 sm:p-5"><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Message the seller..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" aria-label="Message seller" /><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><Send size={16}/> Send</button></form>
      </div>
    </main>
  )
}
