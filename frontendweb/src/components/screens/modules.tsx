'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { User, Etudiant, Note, Matiere, ExamPeriod } from '@/lib/api'
import { initials } from '@/lib/admin-data'

export function TeachersScreen({ users, etudiants, notes, matieres, periods }: {
  users: User[]
  etudiants: Etudiant[]
  notes: Note[]
  matieres: Matiere[]
  periods: ExamPeriod[]
}) {
  const [query, setQuery] = useState('')
  const teachers = users.filter((u) => u.role === 'PROFESSEUR')
  const filtered = teachers.filter((t) => {
    const q = query.toLowerCase()
    return t.first_name.toLowerCase().includes(q) || t.last_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
  })

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      PENDING_VERIFICATION: 'bg-amber-500/10 text-amber-700',
      REJECTED: 'bg-rose-500/10 text-rose-700',
      SUSPENDED: 'bg-rose-500/10 text-rose-700',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === 'ACTIVE') return <CheckCircle2 className="size-3" />
    if (s === 'REJECTED' || s === 'SUSPENDED') return <XCircle className="size-3" />
    return <Clock className="size-3" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Enseignants</h2>
          <p className="text-sm text-muted-foreground">{teachers.length} enseignants · {teachers.filter((t) => t.status === 'ACTIVE').length} actifs · {teachers.filter((t) => t.status === 'PENDING_VERIFICATION').length} en attente</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="h-10 w-56 pl-9" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((teacher) => {
          const notesCount = notes.filter((n) => n.professeur === teacher.id).length
          return (
            <Card key={teacher.id} className="border-border/70 bg-card/80">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials(`${teacher.first_name} ${teacher.last_name}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{teacher.first_name} {teacher.last_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{teacher.matricule} · {teacher.teacher_type || '—'}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(teacher.status)}`}>
                    <StatusIcon s={teacher.status} />{teacher.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{notesCount} notes saisies</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">Aucun enseignant.</p>}
      </div>
    </div>
  )
}

export function ClassesScreen({ classes, etudiants }: { classes: any[]; etudiants: Etudiant[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Classes & Matières</h2>
        <p className="text-sm text-muted-foreground">{classes.length} classes · {etudiants.filter((e) => e.actif).length} élèves actifs</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((classe: any) => {
          const effectif = etudiants.filter((e) => e.classe === classe.id && e.actif).length
          const fillRate = classe.capacite ? Math.round((effectif / classe.capacite) * 100) : 0
          return (
            <Card key={classe.id} className="border-border/70 bg-card/80">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{classe.nom}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{classe.niveau}{classe.stream ? ` · ${classe.stream}` : ''}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{classe.academic_year}</span>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Effectif</span>
                    <span className="font-semibold">{effectif} / {classe.capacite}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, fillRate)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function GradesScreen({ notes, users, etudiants, matieres, periods }: {
  notes: Note[]
  users: User[]
  etudiants: Etudiant[]
  matieres: Matiere[]
  periods: ExamPeriod[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notes & Évaluations</h2>
        <p className="text-sm text-muted-foreground">{notes.length} notes · {periods.length} périodes d'examen configurées</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Moyenne générale</p><p className="mt-1 text-2xl font-semibold">{notes.length ? (notes.reduce((s, n) => s + Number(n.note), 0) / notes.length).toFixed(2) : '—'}/20</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Notes verrouillées</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'LOCKED').length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En brouillon</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'DRAFT').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dernières notes</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Élève</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Matière</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Période</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Note</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Coef.</th>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {notes.slice(0, 30).map((n) => {
                  const et = etudiants.find((e) => e.id === n.etudiant)
                  const user = et && users.find((u) => u.id === et.user)
                  const mat = matieres.find((m) => m.id === n.matiere)
                  const per = periods.find((p) => p.id === n.exam_period)
                  return (
                    <tr key={n.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">{user ? `${user.first_name} ${user.last_name}` : '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">{mat?.code || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">{per?.label || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4 font-semibold">{n.note}/20</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">{n.coefficient}</td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4"><span className={`text-[11px] font-semibold ${n.status === 'LOCKED' ? 'text-rose-600' : 'text-amber-600'}`}>{n.status}</span></td>
                    </tr>
                  )
                })}
                {notes.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune note.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AttendanceScreen({ absences, users, etudiants }: { absences: any[]; users: User[]; etudiants: Etudiant[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const today_abs = absences.filter((a) => a.date_absence === today)
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pointage & Assiduité</h2>
        <p className="text-sm text-muted-foreground">{absences.length} pointages · {today_abs.length} aujourd'hui</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Présents</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{absences.filter((a) => a.statut === 'PRESENT').length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En retard</p><p className="mt-1 text-2xl font-semibold text-amber-600">{absences.filter((a) => a.statut === 'LATE').length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Absents</p><p className="mt-1 text-2xl font-semibold text-rose-600">{absences.filter((a) => a.statut === 'ABSENT').length}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pointages récents</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr><th className="px-6 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Élève</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 font-semibold">Créneau</th><th className="px-6 py-3 font-semibold">Source</th></tr>
              </thead>
              <tbody>
                {absences.slice(0, 30).map((a) => {
                  const et = etudiants.find((e) => e.id === a.etudiant)
                  const user = et && users.find((u) => u.id === et.user)
                  return (
                    <tr key={a.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td className="px-6 py-3">{a.date_absence}</td>
                      <td className="px-4 py-3">{user ? `${user.first_name} ${user.last_name}` : '—'}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] font-semibold ${a.statut === 'PRESENT' ? 'text-emerald-600' : a.statut === 'LATE' ? 'text-amber-600' : 'text-rose-600'}`}>{a.statut}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{a.heure_debut}–{a.heure_fin}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{a.sync_source}</td>
                    </tr>
                  )
                })}
                {absences.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun pointage.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function BulletinsScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Bulletins & Appréciations</h2>
      <p className="text-sm text-muted-foreground">Génération PDF et appréciations assistées par IA.</p>
      <Card><CardContent className="p-8 text-center text-muted-foreground">Sélectionnez un élève dans l'onglet "Élèves" pour générer son bulletin.</CardContent></Card>
    </div>
  )
}

export function TimetableScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Emploi du temps</h2>
      <p className="text-sm text-muted-foreground">Matrice semaine par classe / professeur.</p>
      <Card><CardContent className="p-8 text-center text-muted-foreground">Module en cours de configuration côté backend.</CardContent></Card>
    </div>
  )
}

export function ReportsScreen({ users, etudiants, classes, matieres, notes }: { users: User[]; etudiants: Etudiant[]; classes: any[]; matieres: Matiere[]; notes: Note[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Rapports & Pilotage</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Élèves</p><p className="mt-1 text-2xl font-semibold">{etudiants.filter((e) => e.actif).length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Enseignants actifs</p><p className="mt-1 text-2xl font-semibold">{users.filter((u) => u.role === 'PROFESSEUR' && u.status === 'ACTIVE').length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Classes</p><p className="mt-1 text-2xl font-semibold">{classes.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Matières</p><p className="mt-1 text-2xl font-semibold">{matieres.length}</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-8 text-center text-muted-foreground">Exports PDF / Excel disponibles dans une prochaine version.</CardContent></Card>
    </div>
  )
}

export function AuditScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Journal d'audit</h2>
      <p className="text-sm text-muted-foreground">Traçabilité des actions sensibles (notes, paiements, statuts).</p>
      <Card><CardContent className="p-8 text-center text-muted-foreground">Module visible côté Admin uniquement.</CardContent></Card>
    </div>
  )
}

export function ChatScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">Messagerie</h2>
      <p className="text-sm text-muted-foreground">Chat inter-enseignants (groupes de matière, classes, annonces Admin).</p>
      <Card><CardContent className="p-8 text-center text-muted-foreground">Module mobile prioritaire — voir l'application Expo.</CardContent></Card>
    </div>
  )
}
