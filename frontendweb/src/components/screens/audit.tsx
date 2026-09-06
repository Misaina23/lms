'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type { AuditLog, User as UserType } from '@/lib/api'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Création', color: 'bg-emerald-500/10 text-emerald-700' },
  UPDATE: { label: 'Modification', color: 'bg-sky-500/10 text-sky-700' },
  DELETE: { label: 'Suppression', color: 'bg-rose-500/10 text-rose-700' },
  STATUS_CHANGE: { label: 'Changement statut', color: 'bg-amber-500/10 text-amber-700' },
  LOGIN: { label: 'Connexion', color: 'bg-violet-500/10 text-violet-700' },
  EXPORT: { label: 'Export', color: 'bg-teal-500/10 text-teal-700' },
}

export function AuditScreen({ logs = [] }: { logs: AuditLog[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [entityFilter, setEntityFilter] = useState<string>('ALL')

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false
      if (entityFilter !== 'ALL' && log.entity_type !== entityFilter) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const oldStr = typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value || '')
      const newStr = typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value || '')
      return (
        log.entity_type?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        oldStr.toLowerCase().includes(q) ||
        newStr.toLowerCase().includes(q)
      )
    })
  }, [logs, actionFilter, entityFilter, searchQuery])

  const entityTypes = useMemo(() => {
    const types = new Set(logs.map(l => l.entity_type).filter(Boolean))
    return Array.from(types).sort()
  }, [logs])

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 font-serif text-sm italic text-primary">Traçabilité</p>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Audit & Logs</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Historique des actions sensibles : créations, modifications, suppressions, changements de statut.
        </p>
      </div>

      <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Journal d'audit</CardTitle>
              <p className="text-xs text-muted-foreground">{filteredLogs.length} entrée(s)</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="h-9 w-56 pl-9"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
              >
                <option value="ALL">Toutes actions</option>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
              >
                <option value="ALL">Toutes entités</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Date</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Action</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Entité</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">ID</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Ancienne valeur</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Nouvelle valeur</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Acteur</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 100).map((log, i) => {
                  const actionConfig = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' }
                  const actor = typeof log.actor === 'object' ? log.actor as any : null
                  return (
                    <tr key={i} className="border-b border-border/60 hover:bg-muted/25">
                      <td className="px-3 py-3 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3 text-muted-foreground" />
                          {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${actionConfig.color}`}>
                          {actionConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4 font-medium">{log.entity_type || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 font-mono text-xs text-muted-foreground">{log.entity_id}</td>
                      <td className="px-3 py-3 sm:px-4 max-w-[150px] truncate text-xs text-muted-foreground" title={JSON.stringify(log.old_value)}>
                        {typeof log.old_value === 'string' ? log.old_value : JSON.stringify(log.old_value)}
                      </td>
                      <td className="px-3 py-3 sm:px-4 max-w-[150px] truncate text-xs" title={JSON.stringify(log.new_value)}>
                        {typeof log.new_value === 'string' ? log.new_value : JSON.stringify(log.new_value)}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        {actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || actor.matricule || '—' : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filteredLogs.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune entrée.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}