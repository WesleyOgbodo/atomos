import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, type Notification as AppNotification } from '@/services/notifications'

export function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setNotifications(await getMyNotifications())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function read(id: string) {
    try {
      await markNotificationRead(id)
      setNotifications(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update notification.')
    }
  }

  async function readAll() {
    setMarkingAll(true)
    setError('')
    try {
      await markAllNotificationsRead()
      const now = new Date().toISOString()
      setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at ?? now })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update notifications.')
    } finally {
      setMarkingAll(false)
    }
  }

  const unread = notifications.filter(item => !item.read_at).length

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Atomos</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">Order and account updates appear here.</p>
        </div>
        <button type="button" onClick={() => void readAll()} disabled={!unread || markingAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><CheckCheck size={16} /> Mark all read</button>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {loading && <p className="mt-10 text-sm font-semibold text-slate-500">Loading notifications…</p>}
      {!loading && !error && !notifications.length && <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center"><Bell className="mx-auto text-slate-400" size={32} /><h2 className="mt-4 text-xl font-black">No notifications</h2><p className="mt-2 text-sm text-slate-500">Important order updates will appear here.</p></div>}

      <div className="mt-8 space-y-3">
        {notifications.map(notification => (
          <article key={notification.id} className={`rounded-2xl border p-5 ${notification.read_at ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'}`}>
            <button type="button" onClick={() => void read(notification.id)} disabled={Boolean(notification.read_at)} className="block w-full text-left disabled:cursor-default">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Bell size={18} /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">{notification.title}</h2>{!notification.read_at && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white">New</span>}</div><p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p><p className="mt-2 text-xs font-semibold text-slate-400">{new Date(notification.created_at).toLocaleString('en-NG')}</p></div>
              </div>
            </button>
          </article>
        ))}
      </div>
    </main>
  )
}
