'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock, UserPlus, Search, Filter, UsersRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type User } from '@/lib/api'

type StatusFilter = 'ALL' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'

export function RegistrationsScreen({ allUsers, onReload }: {
  allUsers: User[]
  onReload: () => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [processing, setProcessing] = useState<number | null>(null)

  const nonActiveUsers = allUsers.filter((u) => u.role === 'PROFESSEUR' || u.role === 'SURVEILLANT' || u.role === 'ADMIN')
  
  const filtered = nonActiveUsers.filter((u) => {
    const q = query.toLowerCase()
    const matchesQuery = (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.matricule?.toLowerCase().includes(q)
    )
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const handleApprove = async (userId: number) => {
    setProcessing(userId)
    try {
      await api.post(`/users/${userId}/approve/`, {})
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
      await api.post(`/users/${userId}/reject/`, {})
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

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    PENDING_VERIFICATION: { label: 'En attente', color: 'bg-amber-500/10 text-amber-700', icon: Clock },
    ACTIVE: { label: 'Actif', color: 'bg-emerald-500/10 text-emerald-700', icon: CheckCircle2 },
    REJECTED: { label: 'Rejeté', color: 'bg-rose-500/10 text-rose-700', icon: XCircle },
    SUSPENDED: { label: 'Suspendu', color: 'bg-rose-500/10 text-rose-700', icon: XCircle },
  }

  const pendingCount = nonActiveUsers.filter((u) => u.status === 'PENDING_VERIFICATION').length
  const rejectedCount = nonActiveUsers.filter((u) => u.status === 'REJECTED').length
  const suspendedCount = nonActiveUsers.filter((u) => u.status === 'SUSPENDED').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Gestion des comptes</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} en attente · {suspendedCount} suspendus · {rejectedCount} rejetés
          </p>
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
          >
            <option value="ALL">Tous</option>
            <option value="PENDING_VERIFICATION">En attente</option>
            <option value="ACTIVE">Actifs</option>
            <option value="SUSPENDED">Suspendus</option>
            <option value="REJECTED">Rejetés</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((user) => {
          const config = statusConfig[user.status] || statusConfig.PENDING_VERIFICATION
          const StatusIcon = config.icon
          return (
            <Card key={user.id} className="border-border/70 bg-card/80 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{user.first_name} {user.last_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{user.matricule} · {roleLabels[user.role] || user.role}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.color}`}>
                    <StatusIcon className="size-3" />
                    {config.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {user.status === 'PENDING_VERIFICATION' && (
                    <>
                      <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(user.id)} disabled={processing === user.id}>
                        <CheckCircle2 className="size-3" />Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleReject(user.id)} disabled={processing === user.id}>
                        <XCircle className="size-3" />Rejeter
                      </Button>
                    </>
                  )}
                  {user.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReject(user.id)} disabled={processing === user.id}>
                      <XCircle className="size-3" />Suspendre
                    </Button>
                  )}
                  {(user.status === 'REJECTED' || user.status === 'SUSPENDED') && (
                    <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(user.id)} disabled={processing === user.id}>
                      <CheckCircle2 className="size-3" />Réactiver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <UsersRound className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aucun compte à afficher pour ce filtre.</p>
          </div>
        )}
      </div>
    </div>
  )
}
