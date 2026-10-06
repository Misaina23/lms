'use client'

import { useState } from 'react'
import { BellRing, Check, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, type Classe, type Notification } from '@/lib/api'

const audiences = [
  ['PROFESSEUR', 'Enseignants'],
  ['SURVEILLANT', 'Surveillants'],
  ['SECRETARIAT', 'Secrétariat'],
] as const

export function NotificationsScreen({ notifications, classes, role, onReload }: {
  notifications: Notification[]
  classes: Classe[]
  role: string
  onReload: () => void
}) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [recipientRoles, setRecipientRoles] = useState<string[]>(['PROFESSEUR'])
  const [classe, setClasse] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [reading, setReading] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  const sendAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const result = await api.post<{ sent: number }>('/notifications/broadcast/', {
        title,
        message,
        recipient_roles: recipientRoles,
        ...(classe ? { classe: Number(classe) } : {}),
      })
      setSuccess(`Alerte envoyée à ${result.sent} membre(s) du personnel.`)
      setTitle('')
      setMessage('')
      onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’envoi de l’alerte a échoué.')
    } finally {
      setSending(false)
    }
  }

  const markRead = async (notification: Notification) => {
    setReading(notification.id)
    setError('')
    try {
      await api.post(`/notifications/${notification.id}/mark_read/`, {})
      onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de marquer la notification comme lue.')
    } finally {
      setReading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Communication interne</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight">Notifications et alertes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Les alertes sont disponibles dans le portail après authentification.</p>
      </div>

      {role === 'ADMIN' && (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BellRing className="size-5 text-primary" /> Diffuser une alerte</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={sendAnnouncement} className="space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold">Titre<Input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Message<textarea required rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="rounded-xl border border-border bg-card p-3 text-sm" /></label>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold">Destinataires</legend>
                <div className="flex flex-wrap gap-4">
                  {audiences.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={recipientRoles.includes(value)}
                        onChange={(event) => setRecipientRoles((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="grid max-w-md gap-1.5 text-xs font-semibold">Limiter à une classe (enseignants affectés)
                <select value={classe} onChange={(event) => setClasse(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                  <option value="">Toutes les classes</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.nom} — {item.academic_year || item.niveau}</option>)}
                </select>
              </label>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              {success && <p className="text-sm text-emerald-700" role="status">{success}</p>}
              <Button type="submit" disabled={sending} className="gap-2"><Send className="size-4" />{sending ? 'Envoi…' : 'Envoyer l’alerte'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Boîte de réception</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {error && role !== 'ADMIN' && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {notifications.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>}
          {notifications.map((notification) => (
            <article key={notification.id} className={`rounded-xl border p-4 ${notification.is_read ? 'border-border bg-card' : 'border-primary/25 bg-primary/[.035]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.is_read && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Nouveau</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {role !== 'ADMIN' && !notification.is_read && (
                  <Button size="sm" variant="outline" disabled={reading === notification.id} onClick={() => void markRead(notification)} className="gap-1">
                    <Check className="size-3" /> Lu
                  </Button>
                )}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
