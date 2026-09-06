'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from 'lucide-react'
import type { TimetableSlot, Classe, Matiere, User } from '@/lib/api'

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function overlaps(a: { start_hour: string; end_hour: string }, b: { start_hour: string; end_hour: string }) {
  return timeToMinutes(a.start_hour) < timeToMinutes(b.end_hour) && timeToMinutes(b.start_hour) < timeToMinutes(a.end_hour)
}

export function TimetableScreen({ slots = [], classes = [], matieres = [], users = [] }: {
  slots: TimetableSlot[]
  classes: Classe[]
  matieres: Matiere[]
  users: User[]
}) {
  const [dayFilter, setDayFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const classeMap = useMemo(() => {
    const map: Record<number, Classe> = {}
    classes.forEach(c => { map[c.id] = c })
    return map
  }, [classes])

  const matiereMap = useMemo(() => {
    const map: Record<number, Matiere> = {}
    matieres.forEach(m => { map[m.id] = m })
    return map
  }, [matieres])

  const userMap = useMemo(() => {
    const map: Record<number, User> = {}
    users.forEach(u => { map[u.id] = u })
    return map
  }, [users])

  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      if (dayFilter !== 'ALL' && slot.day_of_week !== parseInt(dayFilter)) return false
      if (classFilter !== 'ALL' && slot.classe !== parseInt(classFilter)) return false
      if (teacherFilter !== 'ALL' && slot.professeur !== parseInt(teacherFilter)) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const classe = classeMap[slot.classe]
      const matiere = matiereMap[slot.matiere]
      const prof = userMap[slot.professeur || 0]
      return (
        classe?.nom?.toLowerCase().includes(q) ||
        matiere?.nom?.toLowerCase().includes(q) ||
        matiere?.code?.toLowerCase().includes(q) ||
        prof?.first_name?.toLowerCase().includes(q) ||
        prof?.last_name?.toLowerCase().includes(q) ||
        slot.room?.toLowerCase().includes(q)
      )
    })
  }, [slots, dayFilter, classFilter, teacherFilter, searchQuery, classeMap, matiereMap, userMap])

  const conflicts = useMemo(() => {
    const conflictMap: Record<string, TimetableSlot[]> = {}
    for (let i = 0; i < filteredSlots.length; i++) {
      for (let j = i + 1; j < filteredSlots.length; j++) {
        const a = filteredSlots[i]
        const b = filteredSlots[j]
        if (a.day_of_week === b.day_of_week && a.academic_year === b.academic_year && overlaps(a, b)) {
          const key = [a.day_of_week, a.academic_year].join('-')
          if (!conflictMap[key]) conflictMap[key] = []
          if (!conflictMap[key].find(c => c.id === a.id)) conflictMap[key].push(a)
          if (!conflictMap[key].find(c => c.id === b.id)) conflictMap[key].push(b)
        }
      }
    }
    return conflictMap
  }, [filteredSlots])

  const conflictIds = useMemo(() => {
    const ids = new Set<string>()
    Object.values(conflicts).forEach(arr => arr.forEach(s => ids.add(s.id)))
    return ids
  }, [conflicts])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Organisation</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Emploi du temps</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Matrice semaine par classe / professeur. Détection automatique des conflits.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" className="h-10 w-full gap-2 border-border px-4 sm:w-auto">
            <Search className="size-4" /> Rechercher
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {[
            { key: 'ALL', label: 'Tous' },
            ...DAY_NAMES.map((d, i) => ({ key: String(i), label: d })),
          ].map(day => (
            <Button
              key={day.key}
              size={dayFilter === day.key ? 'default' : 'sm'}
              variant={dayFilter === day.key ? 'default' : 'outline'}
              onClick={() => setDayFilter(day.key)}
              className="border-border"
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
        >
          <option value="ALL">Toutes les classes</option>
          {classes.map(c => (
            <option key={c.id} value={String(c.id)}>{c.nom} — {c.niveau}</option>
          ))}
        </select>
        <select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
        >
          <option value="ALL">Tous les enseignants</option>
          {users.filter(u => u.role === 'PROFESSEUR').map(u => (
            <option key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</option>
          ))}
        </select>
      </div>

      {Object.keys(conflicts).length > 0 && (
        <Card className="border-rose-500/70 bg-rose-500/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base text-rose-700 dark:text-rose-300">Conflits détectés</CardTitle>
            <p className="text-xs text-muted-foreground">Créneaux qui se superposent pour la même classe/professeur.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(conflicts).map(([key, conflictSlots]) => (
              <div key={key} className="flex flex-wrap gap-2">
                {conflictSlots.map(slot => (
                  <div key={slot.id} className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs">
                    <span className="font-semibold">{DAY_NAMES[slot.day_of_week]}</span>
                    {' '}
                    <span>{classeMap[slot.classe]?.nom}</span>
                    {' · '}
                    <span>{matiereMap[slot.matiere]?.code}</span>
                    {' · '}
                    <span>{slot.start_hour}-{slot.end_hour}</span>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Grille hebdomadaire</CardTitle>
          <p className="text-xs text-muted-foreground">{filteredSlots.length} créneau(x) affiché(s)</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-semibold">Jour</th>
                  <th className="px-3 py-3 font-semibold">Classe</th>
                  <th className="px-3 py-3 font-semibold">Matière</th>
                  <th className="px-3 py-3 font-semibold">Professeur</th>
                  <th className="px-3 py-3 font-semibold">Horaire</th>
                  <th className="px-3 py-3 font-semibold">Salle</th>
                  <th className="px-3 py-3 font-semibold">Année</th>
                  <th className="px-3 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map(slot => {
                  const isConflict = conflictIds.has(slot.id)
                  return (
                    <tr key={slot.id} className={`border-b border-border/60 hover:bg-muted/25 ${isConflict ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-3 py-3 sm:px-6 font-semibold">{DAY_NAMES[slot.day_of_week]}</td>
                      <td className="px-3 py-3 sm:px-4">{classeMap[slot.classe]?.nom || '—'}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{matiereMap[slot.matiere]?.nom || '—'}</span>
                          <span className="text-[11px] text-muted-foreground">{matiereMap[slot.matiere]?.code}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        {slot.professeur ? `${userMap[slot.professeur]?.first_name || ''} ${userMap[slot.professeur]?.last_name || ''}` : '—'}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          {slot.start_hour}–{slot.end_hour}
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        {slot.room ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {slot.room}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 sm:px-4">{slot.academic_year}</td>
                      <td className="px-3 py-3 sm:px-6">
                        {isConflict ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-rose-500/10 text-rose-700">Conflit</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredSlots.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun créneau.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}