'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Printer,
} from 'lucide-react'
import { api, type Deliberation, type Etudiant, type ExamPeriod, type Matiere, type Note, type PaginatedResponse, type Classe } from '@/lib/api'
import { useStudentSearch } from '@/lib/admin-data'

type BulletinRow = {
  matiere: string
  code: string
  coefficient: number
  average: number
  notes: Note[]
}

type BulletinData = {
  student: Etudiant
  rows: BulletinRow[]
  generalAverage: number
  totalCoefficient: number
  rank: number | null
  rankTotal: number
  termAverages: Array<{ period: ExamPeriod; average: number; weight: number }>
  annualAverage: number | null
  deliberation: Deliberation | null
  annualDecision: 'ADMITTED' | 'REPEATER' | null
}

function approvedNotesForPeriod(notes: Note[], studentId: number, periodId: number) {
  return notes.filter((note) =>
    note.etudiant === studentId
    && note.exam_period === periodId
    && (note.status === 'APPROVED' || note.status === 'LOCKED')
  )
}

function getPeriodAverage(notes: Note[], studentId: number, periodId: number) {
  const subjectTotals = new Map<number, { total: number; count: number; coefficient: number }>()
  for (const note of approvedNotesForPeriod(notes, studentId, periodId)) {
    const subject = subjectTotals.get(note.matiere) ?? { total: 0, count: 0, coefficient: Number(note.coefficient) || 1 }
    subject.total += Number(note.note) || 0
    subject.count += 1
    subjectTotals.set(note.matiere, subject)
  }

  let weightedTotal = 0
  let totalCoefficient = 0
  for (const subject of subjectTotals.values()) {
    const coefficient = Number.isFinite(subject.coefficient) && subject.coefficient > 0 ? subject.coefficient : 1
    weightedTotal += subject.total / subject.count * coefficient
    totalCoefficient += coefficient
  }
  return totalCoefficient > 0 ? weightedTotal / totalCoefficient : null
}

function buildBulletinData(
  student: Etudiant,
  period: ExamPeriod,
  notes: Note[],
  matieres: Record<number, Matiere>,
  periods: ExamPeriod[],
  deliberations: Deliberation[],
  rankedStudents: Array<{ studentId: number; average: number }>,
): BulletinData {
  const periodNotes = approvedNotesForPeriod(notes, student.id, period.id)
  const byMatiere = new Map<number, Note[]>()
  for (const note of periodNotes) {
    const subjectNotes = byMatiere.get(note.matiere) ?? []
    subjectNotes.push(note)
    byMatiere.set(note.matiere, subjectNotes)
  }

  const rows = Array.from(byMatiere.entries()).map(([matiereId, matiereNotes]) => {
    const coefficient = Number(matiereNotes[0]?.coefficient) || 1
    const average = matiereNotes.reduce((sum, note) => sum + (Number(note.note) || 0), 0) / matiereNotes.length
    const matiere = matieres[matiereId]
    return {
      matiere: matiere?.nom || '—',
      code: matiere?.code || '—',
      coefficient,
      average,
      notes: matiereNotes,
    }
  })
  const totalCoefficient = rows.reduce((sum, row) => sum + row.coefficient, 0)
  const generalAverage = totalCoefficient > 0
    ? rows.reduce((sum, row) => sum + row.average * row.coefficient, 0) / totalCoefficient
    : 0
  const studentAverage = rankedStudents.find((entry) => entry.studentId === student.id)?.average
  const studentRank = studentAverage === undefined
    ? null
    : 1 + rankedStudents.filter((entry) => entry.average > studentAverage).length
  const isThirdTrimester = period.period_type === 'T3'
  const termAverages = isThirdTrimester
    ? periods
      .filter((item) =>
        item.academic_year === period.academic_year
        && ['T1', 'T2', 'T3'].includes(item.period_type)
        && item.period_type <= period.period_type
      )
      .sort((left, right) => left.period_type.localeCompare(right.period_type))
      .flatMap((item) => {
        const average = getPeriodAverage(notes, student.id, item.id)
        return average === null ? [] : [{
          period: item,
          average,
          weight: Number(item.bulletin_weight) > 0 ? Number(item.bulletin_weight) : 1,
        }]
      })
    : []
  const termWeightTotal = termAverages.reduce((sum, item) => sum + item.weight, 0)
  const annualAverage = termWeightTotal > 0
    ? Number((termAverages.reduce((sum, item) => sum + item.average * item.weight, 0) / termWeightTotal).toFixed(2))
    : null
  const deliberation = isThirdTrimester
    ? deliberations.find((item) => item.student === student.id && item.exam_period === period.id) ?? null
    : null
  const threshold = Number(deliberation?.admission_threshold)

  return {
    student,
    rows,
    generalAverage,
    totalCoefficient,
    rank: studentRank,
    rankTotal: rankedStudents.length,
    termAverages,
    annualAverage,
    deliberation,
    annualDecision: annualAverage !== null && deliberation && annualAverage >= threshold ? 'ADMITTED'
      : annualAverage !== null && deliberation ? 'REPEATER'
        : null,
  }
}

async function fetchClassStudents(classId: string) {
  const students: Etudiant[] = []
  let page = 1
  let hasNextPage = true
  while (hasNextPage) {
    const params = new URLSearchParams({
      classe: classId,
      actif: 'true',
      statut: 'ENROLLED',
      page: String(page),
      page_size: '500',
    })
    const response = await api.get<PaginatedResponse<Etudiant>>(`/etudiants/?${params.toString()}`)
    students.push(...response.results)
    hasNextPage = Boolean(response.next)
    page += 1
  }
  return students
}

function BulletinDocument({ data, period, isBatch = false }: { data: BulletinData; period: ExamPeriod; isBatch?: boolean }) {
  return (
    <Card className={`print-bulletin border-border/70 bg-card/80 shadow-sm rounded-2xl${isBatch ? ' print-bulletin-page' : ''}`}>
      <CardHeader>
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={80} height={40} className="h-9 w-[72px] shrink-0 object-contain" />
            <span className="font-display text-sm font-bold">Lycée Midongy Sud</span>
          </div>
          <Image src="/drapeau.jpeg" alt="Emblème LMS" width={48} height={48} className="size-12 rounded-full object-contain" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Bulletin — {data.student.first_name} {data.student.last_name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.student.matricule} · {period.label} · Année scolaire {period.academic_year}
            </p>
            <p className="mt-1 text-xs font-semibold">Rang : {data.rank ? `${data.rank} / ${data.rankTotal}` : '—'}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
            <Award className="size-4 text-primary" />
            <span className="text-sm font-semibold">{data.generalAverage.toFixed(2)}/20</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mobile-stat-grid mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Matières</p>
              </div>
              <p className="mt-1 text-xl font-semibold">{data.rows.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Moyenne générale</p>
              </div>
              <p className="mt-1 text-xl font-semibold">{data.generalAverage.toFixed(2)}/20</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total coef.</p>
              </div>
              <p className="mt-1 text-xl font-semibold">{data.totalCoefficient.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {data.annualAverage !== null && (
          <section className="mb-6 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Bilan de fin d’année</h3>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {data.termAverages.map(({ period: term, average, weight }) => (
                <p key={term.id}>{term.label} : <strong>{average.toFixed(2)}/20</strong> <span className="text-muted-foreground">(coef. {weight})</span></p>
              ))}
              <p>Moyenne générale annuelle : <strong>{data.annualAverage.toFixed(2)}/20</strong></p>
            </div>
            <p className="mt-3 text-sm font-semibold">
              Décision : {data.annualDecision === 'ADMITTED'
                ? 'Admis'
                : data.annualDecision === 'REPEATER'
                  ? 'Redoublant'
                  : 'En attente de délibération'}
              {data.deliberation && <span className="font-normal text-muted-foreground"> · seuil de délibération : {data.deliberation.admission_threshold}/20</span>}
            </p>
          </section>
        )}

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
              {data.rows.map((row, index) => (
                <tr key={`${row.code}-${index}`} className="border-b border-border/60 hover:bg-muted/25">
                  <td data-label="Matière" className="px-3 py-3 sm:px-6 font-medium">{row.matiere}</td>
                  <td data-label="Code" className="px-3 py-3 sm:px-4 text-muted-foreground">{row.code}</td>
                  <td data-label="Coefficient" className="px-3 py-3 sm:px-4 text-center">{row.coefficient}</td>
                  <td data-label="Note 1" className="px-3 py-3 sm:px-4 text-center">{row.notes[0]?.score_1 || '—'}</td>
                  <td data-label="Note 2" className="px-3 py-3 sm:px-4 text-center">{row.notes[0]?.score_2 || '—'}</td>
                  <td data-label="Moyenne" className="px-3 py-3 sm:px-4 text-center font-semibold">{row.average.toFixed(2)}</td>
                  <td data-label="Appréciation" className="px-3 py-3 sm:px-6 text-center">
                    {row.average >= 10
                      ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700">Réussi</span>
                      : <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-700">À améliorer</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function BulletinsScreen({ notes = [], matieres = [], periods = [], classes = [], deliberations = [] }: {
  notes: Note[]
  matieres: Matiere[]
  periods: ExamPeriod[]
  classes: Classe[]
  deliberations: Deliberation[]
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeriodId, setSelectedPeriodId] = useState('')
  const [classStudents, setClassStudents] = useState<Etudiant[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState('')
  const [printError, setPrintError] = useState('')
  const [batchStudents, setBatchStudents] = useState<Etudiant[]>([])
  const [isBatchPrinting, setIsBatchPrinting] = useState(false)

  const matiereMap = useMemo(() => {
    const map: Record<number, Matiere> = {}
    matieres.forEach((matiere) => { map[matiere.id] = matiere })
    return map
  }, [matieres])
  const selectedPeriod = periods.find((period) => period.id === Number(selectedPeriodId))
  const { results: searchResults, count: searchCount, isSearching, error: searchError } = useStudentSearch(
    selectedClassId,
    searchQuery,
    'actif=true&statut=ENROLLED',
  )
  const visibleStudents = searchQuery.trim() ? searchResults : classStudents

  useEffect(() => {
    let cancelled = false
    if (!selectedClassId) {
      setClassStudents([])
      setRosterError('')
      setRosterLoading(false)
      return
    }
    setRosterLoading(true)
    setRosterError('')
    fetchClassStudents(selectedClassId)
      .then((students) => {
        if (!cancelled) setClassStudents(students)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setClassStudents([])
          setRosterError(error instanceof Error ? error.message : 'Impossible de charger les élèves de la classe.')
        }
      })
      .finally(() => {
        if (!cancelled) setRosterLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedClassId])

  useEffect(() => {
    if (!isBatchPrinting) return
    const timer = window.setTimeout(() => window.print(), 250)
    const afterPrint = () => {
      setIsBatchPrinting(false)
      setBatchStudents([])
    }
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [isBatchPrinting])

  const classRankings = useMemo(() => {
    if (!selectedPeriod) return []
    return classStudents.flatMap((student) => {
      const average = getPeriodAverage(notes, student.id, selectedPeriod.id)
      return average === null ? [] : [{ studentId: student.id, average }]
    })
  }, [classStudents, notes, selectedPeriod])

  const bulletinData = useMemo(() => {
    if (!selectedStudentId || !selectedPeriod) return null
    const student = classStudents.find((item) => item.id === selectedStudentId)
      ?? searchResults.find((item) => item.id === selectedStudentId)
    if (!student) return null
    return buildBulletinData(student, selectedPeriod, notes, matiereMap, periods, deliberations, classRankings)
  }, [selectedStudentId, selectedPeriod, classStudents, searchResults, notes, matiereMap, periods, deliberations, classRankings])

  const batchBulletins = useMemo(() => {
    if (!selectedPeriod) return []
    return batchStudents.flatMap((student) => {
      if (getPeriodAverage(notes, student.id, selectedPeriod.id) === null) return []
      return [buildBulletinData(student, selectedPeriod, notes, matiereMap, periods, deliberations, classRankings)]
    })
  }, [batchStudents, selectedPeriod, notes, matiereMap, periods, deliberations, classRankings])

  const printClassBulletins = () => {
    setPrintError('')
    if (!selectedClassId || !selectedPeriod) {
      setPrintError('Sélectionnez une classe et une période avant l’impression.')
      return
    }
    if (rosterLoading) return
    if (rosterError) {
      setPrintError(rosterError)
      return
    }
    const studentsWithGrades = classStudents.filter((student) =>
      getPeriodAverage(notes, student.id, selectedPeriod.id) !== null
    )
    if (studentsWithGrades.length === 0) {
      setPrintError('Aucun bulletin avec des notes validées pour cette classe et cette période.')
      return
    }
    setBatchStudents(studentsWithGrades)
    setIsBatchPrinting(true)
  }

  const handleGeneratePDF = () => {
    if (bulletinData) window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Bulletins & Appréciations</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Bulletins scolaires</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Sélectionnez une classe, une période et un élève pour générer son bulletin ou imprimer ceux de toute la classe.
          </p>
        </div>
      </div>

      {!selectedStudentId ? (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Sélectionner un élève</CardTitle>
            <p className="text-xs text-muted-foreground">Seules les notes validées sont prises en compte.</p>
          </CardHeader>
          <CardContent>
            <label className="mb-4 grid max-w-sm gap-1.5 text-xs font-semibold">Classe
              <select required value={selectedClassId} onChange={(event) => {
                setSelectedClassId(event.target.value)
                setSelectedStudentId(null)
                setSearchQuery('')
                setPrintError('')
              }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                <option value="">Choisir une classe</option>
                {classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}
              </select>
            </label>
            <label className="mb-4 grid max-w-sm gap-1.5 text-xs font-semibold">Période
              <select value={selectedPeriodId} onChange={(event) => setSelectedPeriodId(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                <option value="">Choisir une période</option>
                {periods.map((period) => <option key={period.id} value={period.id}>{period.label} — {period.academic_year}</option>)}
              </select>
            </label>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  disabled={!selectedClassId}
                  placeholder="Rechercher par nom ou matricule..."
                  className="h-10 w-full pl-9"
                />
              </div>
              <Button onClick={printClassBulletins} disabled={!selectedClassId || !selectedPeriodId || rosterLoading} className="gap-2">
                <Printer className="size-4" />
                {rosterLoading ? 'Chargement de la classe…' : 'Imprimer les bulletins de la classe'}
              </Button>
            </div>
            {printError && <p className="mb-3 text-sm text-destructive" role="alert">{printError}</p>}
            {rosterError && <p className="mb-3 text-sm text-destructive" role="alert">{rosterError}</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStudents.map((etudiant) => {
                if (!etudiant.first_name) return null
                const hasApprovedGrades = selectedPeriodId && notes.some((note) =>
                  note.etudiant === etudiant.id
                  && note.exam_period === Number(selectedPeriodId)
                  && (note.status === 'APPROVED' || note.status === 'LOCKED')
                )
                return (
                  <button
                    key={etudiant.id}
                    onClick={() => setSelectedStudentId(etudiant.id)}
                    disabled={!hasApprovedGrades}
                    className="flex items-center gap-3 rounded-lg border border-border/70 p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {etudiant.first_name[0]}{etudiant.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{etudiant.first_name} {etudiant.last_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {etudiant.matricule}{selectedPeriodId && !hasApprovedGrades ? ' · Aucune note validée' : ''}
                      </p>
                    </div>
                    <FileText className="size-4 text-muted-foreground" />
                  </button>
                )
              })}
              {rosterLoading && !searchQuery.trim() && <p className="col-span-full text-sm text-muted-foreground">Chargement des élèves…</p>}
              {isSearching && <p className="col-span-full text-sm text-muted-foreground">Recherche en cours…</p>}
              {searchError && <p className="col-span-full text-sm text-destructive" role="alert">{searchError}</p>}
              {searchQuery.trim() && searchCount > searchResults.length && <p className="mb-3 text-xs text-muted-foreground">{searchCount} résultat(s) : précisez la recherche.</p>}
              {selectedClassId && !rosterLoading && !searchQuery.trim() && classStudents.length === 0 && !rosterError && (
                <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Aucun élève inscrit dans cette classe.</p>
              )}
              {searchQuery.trim() && !isSearching && !searchError && searchCount === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                  <GraduationCap className="mb-2 size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Aucun élève trouvé</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : bulletinData && selectedPeriod ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedStudentId(null)}>← Retour à la liste</Button>
            <Button onClick={handleGeneratePDF} className="gap-2"><Download className="size-4" /> Imprimer le bulletin</Button>
          </div>
          <BulletinDocument data={bulletinData} period={selectedPeriod} />
        </div>
      ) : (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardContent className="p-8 text-center text-muted-foreground">Sélectionnez un élève pour générer son bulletin.</CardContent>
        </Card>
      )}

      {isBatchPrinting && selectedPeriod && (
        <div className="print-bulletin-batch" aria-label="Bulletins de toute la classe">
          {batchBulletins.map((bulletin) => (
            <BulletinDocument key={bulletin.student.id} data={bulletin} period={selectedPeriod} isBatch />
          ))}
        </div>
      )}
    </div>
  )
}
