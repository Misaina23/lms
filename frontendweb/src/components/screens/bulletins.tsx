'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Download,
  Search,
  GraduationCap,
  Award,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import type { Etudiant, User, Note, Matiere, ExamPeriod } from '@/lib/api'

export function BulletinsScreen({ etudiants = [], users = [], notes = [], matieres = [], periods = [] }: {
  etudiants: Etudiant[]
  users: User[]
  notes: Note[]
  matieres: Matiere[]
  periods: ExamPeriod[]
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const userMap = useMemo(() => {
    const map: Record<number, User> = {}
    users.forEach(u => { map[u.id] = u })
    return map
  }, [users])

  const matiereMap = useMemo(() => {
    const map: Record<number, Matiere> = {}
    matieres.forEach(m => { map[m.id] = m })
    return map
  }, [matieres])

  const periodMap = useMemo(() => {
    const map: Record<number, ExamPeriod> = {}
    periods.forEach(p => { map[p.id] = p })
    return map
  }, [periods])

  const filteredEtudiants = useMemo(() => {
    return etudiants.filter(etudiant => {
      if (!searchQuery) return true
      const user = userMap[etudiant.user]
      if (!user) return false
      const q = searchQuery.toLowerCase()
      return (
        user.first_name?.toLowerCase().includes(q) ||
        user.last_name?.toLowerCase().includes(q) ||
        user.matricule?.toLowerCase().includes(q)
      )
    })
  }, [etudiants, users, searchQuery])

  const studentNotes = useMemo(() => {
    if (!selectedStudentId) return []
    return notes.filter(n => n.etudiant === selectedStudentId)
  }, [notes, selectedStudentId])

  const bulletinData = useMemo(() => {
    if (!selectedStudentId) return null
    const etudiant = etudiants.find(e => e.id === selectedStudentId)
    const user = userMap[etudiant?.user || 0]
    if (!etudiant || !user) return null

    const studentNotes = notes.filter(n => n.etudiant === selectedStudentId)
    const byMatiere: Record<number, Note[]> = {}
    studentNotes.forEach(n => {
      if (!byMatiere[n.matiere]) byMatiere[n.matiere] = []
      byMatiere[n.matiere].push(n)
    })

    const rows = Object.entries(byMatiere).map(([matiereId, matiereNotes]) => {
      const matiere = matiereMap[parseInt(matiereId)]
      const avg = matiereNotes.reduce((sum, n) => sum + parseFloat(n.note || '0'), 0) / matiereNotes.length
      return {
        matiere: matiere?.nom || '—',
        code: matiere?.code || '—',
        coefficient: matiereNotes[0]?.coefficient || '1',
        average: avg,
        notes: matiereNotes,
      }
    })

    const generalAverage = rows.length > 0
      ? rows.reduce((sum, r) => sum + r.average * parseFloat(r.coefficient), 0) / rows.reduce((sum, r) => sum + parseFloat(r.coefficient), 0)
      : 0

    return {
      student: user,
      classe: etudiant.classe,
      rows,
      generalAverage,
      totalCoefficient: rows.reduce((sum, r) => sum + parseFloat(r.coefficient), 0),
    }
  }, [selectedStudentId, etudiants, users, notes, matieres])

  const handleGeneratePDF = () => {
    if (!bulletinData) return
    alert(`Génération PDF du bulletin pour ${bulletinData.student.first_name} ${bulletinData.student.last_name} — moyenne générale: ${bulletinData.generalAverage.toFixed(2)}/20`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Bulletins & Appréciations</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Bulletins scolaires</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Sélectionnez un élève pour générer son bulletin avec les notes par matière et la moyenne générale.
          </p>
        </div>
      </div>

      {!selectedStudentId ? (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sélectionner un élève</CardTitle>
            <p className="text-xs text-muted-foreground">Choisissez un élève pour afficher son bulletin</p>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou matricule..."
                className="h-10 w-full pl-9"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEtudiants.map(etudiant => {
                const user = userMap[etudiant.user]
                if (!user) return null
                return (
                  <button
                    key={etudiant.id}
                    onClick={() => setSelectedStudentId(etudiant.id)}
                    className="flex items-center gap-3 rounded-lg border border-border/70 p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{user.first_name} {user.last_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.matricule}</p>
                    </div>
                    <FileText className="size-4 text-muted-foreground" />
                  </button>
                )
              })}
              {filteredEtudiants.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                  <GraduationCap className="size-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun élève trouvé</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : bulletinData ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedStudentId(null)}>
              ← Retour à la liste
            </Button>
            <Button onClick={handleGeneratePDF} className="gap-2">
              <Download className="size-4" /> Générer PDF
            </Button>
          </div>

          <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Bulletin — {bulletinData.student.first_name} {bulletinData.student.last_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {bulletinData.student.matricule} · Année scolaire 2024-2025
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  <Award className="size-4 text-primary" />
                  <span className="text-sm font-semibold">{bulletinData.generalAverage.toFixed(2)}/20</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Card className="border-border/60 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Matières</p>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{bulletinData.rows.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Moyenne générale</p>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{bulletinData.generalAverage.toFixed(2)}/20</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Total coef.</p>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{bulletinData.totalCoefficient.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3 sm:px-6 font-semibold">Matière</th>
                      <th className="px-3 py-3 sm:px-4 font-semibold">Code</th>
                      <th className="px-3 py-3 sm:px-4 font-semibold text-center">Coef.</th>
                      <th className="px-3 py-3 sm:px-4 font-semibold text-center">Note 1</th>
                      <th className="px-3 py-3 sm:px-4 font-semibold text-center">Note 2</th>
                      <th className="px-3 py-3 sm:px-4 font-semibold text-center">Moyenne</th>
                      <th className="px-3 py-3 sm:px-6 font-semibold text-center">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulletinData.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/60 hover:bg-muted/25">
                        <td className="px-3 py-3 sm:px-6 font-medium">{row.matiere}</td>
                        <td className="px-3 py-3 sm:px-4 text-muted-foreground">{row.code}</td>
                        <td className="px-3 py-3 sm:px-4 text-center">{row.coefficient}</td>
                        <td className="px-3 py-3 sm:px-4 text-center">
                          {row.notes[0]?.score_1 || '—'}
                        </td>
                        <td className="px-3 py-3 sm:px-4 text-center">
                          {row.notes[0]?.score_2 || '—'}
                        </td>
                        <td className="px-3 py-3 sm:px-4 text-center font-semibold">
                          {row.average.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 sm:px-6 text-center">
                          {row.average >= 10 ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700">Réussi</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-700">À améliorer</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">
            Sélectionnez un élève pour générer son bulletin.
          </CardContent>
        </Card>
      )}
    </div>
  )
}