'use client'

import { useEffect, useState, useMemo } from 'react'
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
  WandSparkles,
} from 'lucide-react'
import type { TimetableSlot, Classe, Matiere, User } from '@/lib/api'
import { api } from '@/lib/api'

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function overlaps(a: { start_hour: string; end_hour: string }, b: { start_hour: string; end_hour: string }) {
  return timeToMinutes(a.start_hour) < timeToMinutes(b.end_hour) && timeToMinutes(b.start_hour) < timeToMinutes(a.end_hour)
}

type GenerationAssignment = {
  class_id: number
  class_name: string
  subject_id: number
  subject_name: string
  teacher_id: number
  teacher_name: string
}

type GeneratedSlot = Omit<TimetableSlot, 'id' | 'created_at' | 'updated_at'>

export function TimetableScreen({ slots = [], classes = [], matieres = [], users = [], canGenerate = false, onReload }: {
  slots: TimetableSlot[]
  classes: Classe[]
  matieres: Matiere[]
  users: User[]
  canGenerate?: boolean
  onReload: () => void
}) {
  const [dayFilter, setDayFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [generationOpen, setGenerationOpen] = useState(false)
  const academicYears = useMemo(
    () => [...new Set(classes.map((classe) => classe.academic_year).filter((year): year is string => !!year))].sort().reverse(),
    [classes],
  )
  const [academicYear, setAcademicYear] = useState('')
  const [generationAssignments, setGenerationAssignments] = useState<GenerationAssignment[]>([])
  const [weeklySessions, setWeeklySessions] = useState<Record<string, string>>({})
  const [draftSlots, setDraftSlots] = useState<GeneratedSlot[]>([])
  const [generationError, setGenerationError] = useState('')
  const [generationLoading, setGenerationLoading] = useState(false)
  const [applyingPlan, setApplyingPlan] = useState(false)
  const [generationSuccess, setGenerationSuccess] = useState('')

  useEffect(() => {
    if (academicYears.length && !academicYears.includes(academicYear)) {
      setAcademicYear(academicYears[0])
    }
  }, [academicYears, academicYear])

  const assignmentPairs = useMemo(() => {
    const pairs = new Map<string, GenerationAssignment>()
    for (const assignment of generationAssignments) {
      pairs.set(`${assignment.class_id}-${assignment.subject_id}`, assignment)
    }
    return [...pairs.values()]
  }, [generationAssignments])

  const loadGenerationOptions = async () => {
    if (!academicYear) return
    setGenerationError('')
    setGenerationSuccess('')
    setGenerationLoading(true)
    setDraftSlots([])
    try {
      const response = await api.get<{ assignments: GenerationAssignment[] }>(
        `/timetable/generation-options/?academic_year=${encodeURIComponent(academicYear)}`,
      )
      setGenerationAssignments(response.assignments)
      setWeeklySessions({})
      setGenerationOpen(true)
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Impossible de charger les affectations de cette année.')
    } finally {
      setGenerationLoading(false)
    }
  }

  const changeGenerationYear = async (year: string) => {
    setAcademicYear(year)
    setDraftSlots([])
    setGenerationError('')
    setGenerationLoading(true)
    try {
      const response = await api.get<{ assignments: GenerationAssignment[] }>(
        `/timetable/generation-options/?academic_year=${encodeURIComponent(year)}`,
      )
      setGenerationAssignments(response.assignments)
      setWeeklySessions({})
    } catch (error) {
      setGenerationAssignments([])
      setGenerationError(error instanceof Error ? error.message : 'Impossible de charger les affectations de cette année.')
    } finally {
      setGenerationLoading(false)
    }
  }

  const generatePlan = async () => {
    setGenerationError('')
    setGenerationSuccess('')
    const sessions = assignmentPairs.flatMap((assignment) => {
      const count = Number(weeklySessions[`${assignment.class_id}-${assignment.subject_id}`] || 0)
      return Number.isInteger(count) && count > 0
        ? [{ class_id: assignment.class_id, subject_id: assignment.subject_id, weekly_sessions: count }]
        : []
    })
    if (!sessions.length) {
      setGenerationError('Indiquez au moins un volume hebdomadaire supérieur à zéro.')
      return
    }
    setGenerationLoading(true)
    try {
      const response = await api.post<{ slots: GeneratedSlot[] }>('/timetable/generate/', {
        academic_year: academicYear,
        sessions,
      })
      setDraftSlots(response.slots)
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'La génération du planning a échoué.')
    } finally {
      setGenerationLoading(false)
    }
  }

  const applyPlan = async () => {
    setGenerationError('')
    setGenerationSuccess('')
    setApplyingPlan(true)
    try {
      await api.post('/timetable/generate/apply/', {
        academic_year: academicYear,
        slots: draftSlots,
      })
      setGenerationSuccess(`${draftSlots.length} créneau(x) ajouté(s) à l’emploi du temps.`)
      setDraftSlots([])
      setGenerationOpen(false)
      onReload()
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Le planning n’a pas pu être appliqué.')
    } finally {
      setApplyingPlan(false)
    }
  }

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
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]
        const b = slots[j]
        const sameClass = a.classe === b.classe
        const sameTeacher = a.professeur !== null && a.professeur === b.professeur
        const sameRoom = !!a.room.trim() && a.room.trim().toLocaleLowerCase() === b.room.trim().toLocaleLowerCase()
        if (
          a.day_of_week === b.day_of_week &&
          a.academic_year === b.academic_year &&
          (sameClass || sameTeacher || sameRoom) &&
          overlaps(a, b)
        ) {
          const key = [a.day_of_week, a.academic_year].join('-')
          if (!conflictMap[key]) conflictMap[key] = []
          if (!conflictMap[key].find(c => c.id === a.id)) conflictMap[key].push(a)
          if (!conflictMap[key].find(c => c.id === b.id)) conflictMap[key].push(b)
        }
      }
    }
    return conflictMap
  }, [slots])

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
          {canGenerate && (
            <Button variant="outline" className="h-10 w-full gap-2 border-border px-4 sm:w-auto" onClick={() => void loadGenerationOptions()} disabled={generationLoading || !academicYears.length}>
              <WandSparkles className="size-4" /> Générer un planning
            </Button>
          )}
          <Button variant="outline" className="h-10 w-full gap-2 border-border px-4 sm:w-auto">
            <Search className="size-4" /> Rechercher
          </Button>
        </div>
      </div>

      {generationSuccess && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{generationSuccess}</p>}
      {generationError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{generationError}</p>}
      {generationOpen && (
        <Card className="rounded-2xl border-primary/30">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
              Génération assistée
              <select value={academicYear} onChange={(event) => void changeGenerationYear(event.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm" disabled={generationLoading || draftSlots.length > 0}>
                {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Saisissez les heures hebdomadaires prévues pour chaque matière. Le moteur répartit des séances de 60 minutes du lundi au samedi, de 08 h à 12 h et de 13 h à 17 h, en tenant compte des affectations et des créneaux déjà occupés. Les salles restent à renseigner.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!draftSlots.length && (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {assignmentPairs.map((assignment) => {
                  const key = `${assignment.class_id}-${assignment.subject_id}`
                  const teacherNames = [...new Set(generationAssignments
                    .filter((item) => item.class_id === assignment.class_id && item.subject_id === assignment.subject_id)
                    .map((item) => item.teacher_name))]
                  return (
                    <label key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                      <span className="min-w-52 flex-1 font-medium">{assignment.class_name} · {assignment.subject_name}
                        <span className="block text-xs font-normal text-muted-foreground">Enseignant(s) : {teacherNames.join(', ')}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">Séances/semaine (0–6)</span>
                      <Input type="number" min="0" max="6" step="1" value={weeklySessions[key] || ''} onChange={(event) => setWeeklySessions((current) => ({ ...current, [key]: event.target.value }))} className="w-24" aria-label={`Séances par semaine ${assignment.class_name} ${assignment.subject_name}`} />
                    </label>
                  )
                })}
                {!assignmentPairs.length && <p className="py-4 text-sm text-muted-foreground">Aucune affectation d’enseignant active n’est configurée pour cette année.</p>}
              </div>
            )}
            {draftSlots.length > 0 && (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {draftSlots.map((slot, index) => {
                  const classe = classes.find((item) => item.id === slot.classe)
                  const matiere = matieres.find((item) => item.id === slot.matiere)
                  const key = `${slot.classe}-${slot.matiere}`
                  const eligibleTeachers = [...new Map(generationAssignments
                    .filter((item) => item.class_id === slot.classe && item.subject_id === slot.matiere)
                    .map((item) => [item.teacher_id, item])).values()]
                  return (
                    <div key={`${key}-${index}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_120px_130px_180px_140px] sm:items-center">
                      <span className="font-medium">{classe?.nom || 'Classe'} · {matiere?.nom || 'Matière'}</span>
                      <select value={slot.day_of_week} onChange={(event) => setDraftSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, day_of_week: Number(event.target.value) } : item))} className="h-9 rounded-lg border border-border bg-card px-2 text-sm" aria-label="Jour du cours">
                        {DAY_NAMES.map((day, dayIndex) => <option key={dayIndex} value={dayIndex}>{day}</option>)}
                      </select>
                      <Input type="time" step="3600" value={slot.start_hour} onChange={(event) => {
                        const [hour, minute] = event.target.value.split(':').map(Number)
                        const end = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                        setDraftSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, start_hour: event.target.value, end_hour: end } : item))
                      }} aria-label="Heure de début" />
                      <select value={slot.professeur || ''} onChange={(event) => setDraftSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, professeur: Number(event.target.value) } : item))} className="h-9 rounded-lg border border-border bg-card px-2 text-sm" aria-label="Enseignant">
                        {eligibleTeachers.map((teacher) => <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.teacher_name}</option>)}
                      </select>
                      <Input value={slot.room} maxLength={50} placeholder="Salle (facultatif)" onChange={(event) => setDraftSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, room: event.target.value } : item))} aria-label="Salle" />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!draftSlots.length
                ? <Button type="button" onClick={() => void generatePlan()} disabled={generationLoading || !assignmentPairs.length}>{generationLoading ? 'Génération…' : 'Générer l’aperçu'}</Button>
                : <>
                    <Button type="button" onClick={() => void applyPlan()} disabled={applyingPlan}>{applyingPlan ? 'Application…' : 'Valider le planning'}</Button>
                    <Button type="button" variant="outline" onClick={() => setDraftSlots([])} disabled={applyingPlan}>Modifier les volumes</Button>
                  </>}
              <Button type="button" variant="ghost" onClick={() => { setGenerationOpen(false); setDraftSlots([]); setGenerationError('') }} disabled={applyingPlan}>Fermer</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <p className="text-xs text-muted-foreground">Créneaux superposés partageant une classe, un professeur ou une salle.</p>
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
            <table className="mobile-card-table w-full min-w-[900px] text-left text-sm">
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
                      <td data-label="Jour" className="px-3 py-3 sm:px-6 font-semibold">{DAY_NAMES[slot.day_of_week]}</td>
                      <td data-label="Classe" className="px-3 py-3 sm:px-4">{classeMap[slot.classe]?.nom || '—'}</td>
                      <td data-label="Matière" className="px-3 py-3 sm:px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{matiereMap[slot.matiere]?.nom || '—'}</span>
                          <span className="text-[11px] text-muted-foreground">{matiereMap[slot.matiere]?.code}</span>
                        </div>
                      </td>
                      <td data-label="Professeur" className="px-3 py-3 sm:px-4">
                        {slot.professeur ? `${userMap[slot.professeur]?.first_name || ''} ${userMap[slot.professeur]?.last_name || ''}` : '—'}
                      </td>
                      <td data-label="Horaire" className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          {slot.start_hour}–{slot.end_hour}
                        </div>
                      </td>
                      <td data-label="Salle" className="px-3 py-3 sm:px-4">
                        {slot.room ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {slot.room}
                          </div>
                        ) : '—'}
                      </td>
                      <td data-label="Année" className="px-3 py-3 sm:px-4">{slot.academic_year}</td>
                      <td data-label="Statut" className="px-3 py-3 sm:px-6">
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