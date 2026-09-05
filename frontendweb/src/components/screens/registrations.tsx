'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, UserPlus, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { User } from '@/lib/api'

export function RegistrationsScreen({ pendingUsers, users, onReload }: {
  pendingUsers: User[]
  users: User[]
  onReload: () => void
}) {
  const [query, setQuery] = useState('')
  const [processing, setProcessing] = useState<number | null>(null)

  const filtered = pendingUsers.filter((u) => {
    const q = query.toLowerCase()
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.matricule?.toLowerCase().includes(q)
    )
  })

  const handleApprove = async (userId: number) => {
    setProcessing(userId)
    try {
      await api.post(`/users/${userId}/approve/`)
      onReload()
    } catch (e) {
      console.error('Approve failed', e)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (userId: number) => {
    setProcessing(userId)
    try {
      await api.post(`/users/${userId}/reject/`)
      onReload()
    } catch (e) {
      console.error('Reject failed', e)
    } finally {
      setProcessing(null)
    }
  }

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    PROFESSEUR: 'Professeur',
    ELEVE: 'Élève',
    PARENT: 'Parent',
    SURVEILLANT: 'Surveillant',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inscriptions en attente</h2>
          <p className="text-sm text-muted-foreground">{pendingUsers.length} demande{pendingUsers.length !== 1 ? 's' : ''} en attente de validation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="h-10 w-56 pl-9"
            />
          </div>
        </div>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Demandes d'inscription</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {pendingUsers.length === 0 ? 'Aucune demande en attente.' : 'Aucun résultat.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((user) => (
                <Card key={user.id} className="border-border/60 bg-muted/20">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email} · {user.matricule}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {roleLabels[user.role] || user.role}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            <Clock className="size-3" />
                            En attente
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApprove(user.id)}
                        disabled={processing === user.id}
                      >
                        <CheckCircle2 className="size-4" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(user.id)}
                        disabled={processing === user.id}
                      >
                        <XCircle className="size-4" />
                        Rejeter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
