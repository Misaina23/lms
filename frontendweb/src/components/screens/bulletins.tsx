'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
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
import type { Etudiant, Note, Matiere, ExamPeriod } from '@/lib/api'

export function BulletinsScreen({ etudiants = [], notes = [], matieres = [], periods = [] }: {
  etudiants: Etudiant[]
  notes: Note[]
  matieres: Matiere[]
  periods: ExamPeriod[]
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriodId, setSelectedPeriodId] = useState('')

  const matiereMap = useMemo(() => {
    const map: Record<number, Matiere> = {}
    matieres.forEach(m => { map[m.id] = m })
    return map
  }, [matieres])

  const selectedPeriod = periods.find((period) => period.id === Number(selectedPeriodId))

  const filteredEtudiants = useMemo(() => {
    return etudiants.filter(etudiant => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        etudiant.first_name?.toLowerCase().includes(q) ||
        etudiant.last_name?.toLowerCase().includes(q) ||
        etudiant.matricule?.toLowerCase().includes(q)
      )
    })
  }, [etudiants, searchQuery])

  const studentNotes = useMemo(() => {
    if (!selectedStudentId || !selectedPeriodId) return []
    return notes.filter(n =>
      n.etudiant === selectedStudentId
      && n.exam_period === Number(selectedPeriodId)
      && (n.status === 'APPROVED' || n.status === 'LOCKED')
    )
  }, [notes, selectedStudentId, selectedPeriodId])

  const bulletinData = useMemo(() => {
    if (!selectedStudentId) return null
    const etudiant = etudiants.find(e => e.id === selectedStudentId)
    if (!etudiant) return null

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
      student: etudiant,
      classe: etudiant.classe,
      rows,
      generalAverage,
      totalCoefficient: rows.reduce((sum, r) => sum + parseFloat(r.coefficient), 0),
    }
  }, [selectedStudentId, etudiants, studentNotes, matiereMap])

  const handleGeneratePDF = () => {
    if (!bulletinData) return
    window.print()
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
            <p className="text-xs text-muted-foreground">Choisissez une période pour n’afficher que les notes validées.</p>
          </CardHeader>
          <CardContent>
            <label className="mb-4 grid max-w-sm gap-1.5 text-xs font-semibold">Période
              <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                <option value="">Choisir une période</option>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.label} — {period.academic_year}</option>)}
              </select>
            </label>
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
                if (!etudiant.first_name) return null
                return (
                  <button
                    key={etudiant.id}
                    onClick={() => setSelectedStudentId(etudiant.id)}
                    disabled={!selectedPeriodId || !notes.some((note) => note.etudiant === etudiant.id && note.exam_period === Number(selectedPeriodId) && (note.status === 'APPROVED' || note.status === 'LOCKED'))}
                    className="flex items-center gap-3 rounded-lg border border-border/70 p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {etudiant.first_name?.[0]}{etudiant.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{etudiant.first_name} {etudiant.last_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{etudiant.matricule}{selectedPeriodId && !notes.some((note) => note.etudiant === etudiant.id && note.exam_period === Number(selectedPeriodId) && (note.status === 'APPROVED' || note.status === 'LOCKED')) ? ' · Aucune note validée' : ''}</p>
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

          <Card className="print-bulletin border-border/70 bg-card/80 shadow-sm rounded-2xl">
            <CardHeader>
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={80} height={40} className="h-9 w-[72px] shrink-0 object-contain" />
                  <span className="font-display text-sm font-bold">Lycée Midongy Sud</span>
                </div>
                <Image src="/drapeau.jpeg" alt="Emblème LMS" width={48} height={48} className="size-12 rounded-full object-contain" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Bulletin — {bulletinData.student.first_name} {bulletinData.student.last_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {bulletinData.student.matricule} · {selectedPeriod?.label} · Année scolaire {selectedPeriod?.academic_year}
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
                <table className="mobile-card-table w-full min-w-[640px] text-left text-sm">
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
                        <td data-label="Matière" className="px-3 py-3 sm:px-6 font-medium">{row.matiere}</td>
                        <td data-label="Code" className="px-3 py-3 sm:px-4 text-muted-foreground">{row.code}</td>
                        <td data-label="Coefficient" className="px-3 py-3 sm:px-4 text-center">{row.coefficient}</td>
                        <td data-label="Note 1" className="px-3 py-3 sm:px-4 text-center">
                          {row.notes[0]?.score_1 || '—'}
                        </td>
                        <td data-label="Note 2" className="px-3 py-3 sm:px-4 text-center">
                          {row.notes[0]?.score_2 || '—'}
                        </td>
                        <td data-label="Moyenne" className="px-3 py-3 sm:px-4 text-center font-semibold">
                          {row.average.toFixed(2)}
                        </td>
                        <td data-label="Appréciation" className="px-3 py-3 sm:px-6 text-center">
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