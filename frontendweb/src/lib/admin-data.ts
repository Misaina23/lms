'use client'

import { useState, useEffect, useMemo } from 'react'
import { api, type PaginatedResponse, type User, type Etudiant, type Note, type Classe, type Matiere, type Enrollment, type StudentOrientation, type ExamPeriod, type Absence, type BudgetItem, type BudgetCategory, type BudgetReport, type BudgetStats, type TimetableSlot, type AuditLog, type Notification, type StudentOfficePass, type TeacherUnavailabilityReport, type Deliberation } from '@/lib/api'
import { getStoredUser, isValidPortalRole } from '@/lib/auth'

export type ScreenKey =
  | 'overview'
  | 'students'
  | 'enrollments'
  | 'payments'
  | 'classes'
  | 'teachers'
  | 'coverage'
  | 'timetable'
  | 'attendance'
  | 'grades'
  | 'bulletins'
  | 'reports'
  | 'budget'
  | 'chat'
  | 'audit'
  | 'registrations'
  | 'matieres'
  | 'periods'
  | 'notifications'
  | 'office'

export type AdminData = {
  users: User[]
  allUsers: User[]
  classes: Classe[]
  matieres: Matiere[]
  studentStats: { total: number; actifs: number }
  notes: Note[]
  absences: Absence[]
  enrollments: Enrollment[]
  orientations: StudentOrientation[]
  periods: ExamPeriod[]
  deliberations: Deliberation[]
  budgetItems: BudgetItem[]
  budgetCategories: BudgetCategory[]
  budgetReports: BudgetReport[]
  budgetStats: BudgetStats | null
  timetableSlots: TimetableSlot[]
  auditLogs: AuditLog[]
  notifications: Notification[]
  officePasses: StudentOfficePass[]
  unavailabilityReports: TeacherUnavailabilityReport[]
}

function emptyPage<T>(): PaginatedResponse<T> {
  return { count: 0, next: null, previous: null, results: [] }
}

export function useAdminData() {
  const [data, setData] = useState<AdminData>({
    users: [], allUsers: [], classes: [], matieres: [], studentStats: { total: 0, actifs: 0 }, notes: [],
    absences: [], enrollments: [], orientations: [], periods: [], deliberations: [],
    budgetItems: [], budgetCategories: [], budgetReports: [], budgetStats: null,
    timetableSlots: [], auditLogs: [], notifications: [], officePasses: [], unavailabilityReports: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setIsLoading(true)
    setError(null)

    const currentUser = getStoredUser()
    if (!currentUser || !isValidPortalRole(currentUser.role)) {
      setData({
        users: [], allUsers: [], classes: [], matieres: [], studentStats: { total: 0, actifs: 0 }, notes: [],
        absences: [], enrollments: [], orientations: [], periods: [], deliberations: [],
        budgetItems: [], budgetCategories: [], budgetReports: [], budgetStats: null,
        timetableSlots: [], auditLogs: [], notifications: [], officePasses: [], unavailabilityReports: [],
      })
      setIsLoading(false)
      return
    }

    try {
      const loadAll = async <T,>(path: string): Promise<PaginatedResponse<T>> => {
        const results: T[] = []
        let page = 1
        let next: string | null = `${path}?page=${page}&page_size=500`
        let count = 0
        while (next) {
          const response: PaginatedResponse<T> = await api.get<PaginatedResponse<T>>(next)
          results.push(...response.results)
          count = response.count
          page += 1
          next = response.next ? `${path}?page=${page}&page_size=500` : null
        }
        return { count, next: null, previous: null, results }
      }
      const optional = async <T,>(label: string, request: Promise<T>, fallback: T): Promise<T> => {
        try { return await request } catch (loadError) {
          failures.push(`${label}: ${loadError instanceof Error ? loadError.message : 'échec du chargement'}`)
          return fallback
        }
      }
      const failures: string[] = []
      const [u, c, m, e, n, a, en, o, p, d, bi, bc, br, ts, al, no, op, ur] = await Promise.all([
        optional('Personnel', loadAll<User>('/users/'), emptyPage<User>()),
        optional('Classes', loadAll<Classe>('/classes/'), emptyPage<Classe>()),
        optional('Matières', loadAll<Matiere>('/matieres/'), emptyPage<Matiere>()),
        optional('Statistiques élèves', api.get<{ total: number; actifs: number }>('/etudiants/stats/'), { total: 0, actifs: 0 }),
        optional('Notes', loadAll<Note>('/notes/'), emptyPage<Note>()),
        optional('Absences', loadAll<Absence>('/absences/'), emptyPage<Absence>()),
        optional('Inscriptions', loadAll<Enrollment>('/enrollments/'), emptyPage<Enrollment>()),
        currentUser.role === 'ADMIN' ? optional('Orientations', loadAll<StudentOrientation>('/orientations/'), emptyPage<StudentOrientation>()) : Promise.resolve(emptyPage<StudentOrientation>()),
        optional('Périodes', loadAll<ExamPeriod>('/exam-periods/'), emptyPage<ExamPeriod>()),
        currentUser.role === 'ADMIN' ? optional('Délibérations', loadAll<Deliberation>('/deliberations/'), emptyPage<Deliberation>()) : Promise.resolve(emptyPage<Deliberation>()),
        currentUser.role === 'ADMIN' ? optional('Budget', loadAll<BudgetItem>('/budget/items/'), emptyPage<BudgetItem>()) : Promise.resolve(emptyPage<BudgetItem>()),
        currentUser.role === 'ADMIN' ? optional('Catégories budgétaires', loadAll<BudgetCategory>('/budget/categories/'), emptyPage<BudgetCategory>()) : Promise.resolve(emptyPage<BudgetCategory>()),
        currentUser.role === 'ADMIN' ? optional('Rapports budgétaires', loadAll<BudgetReport>('/budget/reports/'), emptyPage<BudgetReport>()) : Promise.resolve(emptyPage<BudgetReport>()),
        optional('Emploi du temps', loadAll<TimetableSlot>('/timetable/'), emptyPage<TimetableSlot>()),
        currentUser.role === 'ADMIN' ? optional('Journal d’audit', loadAll<AuditLog>('/audit-logs/'), emptyPage<AuditLog>()) : Promise.resolve(emptyPage<AuditLog>()),
        optional('Notifications', loadAll<Notification>('/notifications/'), emptyPage<Notification>()),
        currentUser.role === 'PROFESSEUR' ? Promise.resolve(emptyPage<StudentOfficePass>()) : optional('Convocations', loadAll<StudentOfficePass>('/office-passes/'), emptyPage<StudentOfficePass>()),
        optional('Signalements de cours', loadAll<TeacherUnavailabilityReport>('/teacher-unavailability-reports/'), emptyPage<TeacherUnavailabilityReport>()),
      ])
      const budgetYears = [...new Set(bi.results.map((item) => item.academic_year).filter(Boolean))].sort()
      const now = new Date()
      const defaultStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
      const statsYear = budgetYears[budgetYears.length - 1] || `${defaultStartYear}-${defaultStartYear + 1}`
      const bs = currentUser.role === 'ADMIN' ? await optional('Statistiques budgétaires', api.get<BudgetStats>(`/budget/items/stats/?academic_year=${encodeURIComponent(statsYear)}`), null) : null
      setData({
        users: u.results || [],
        allUsers: u.results || [],
        classes: c.results || [],
        matieres: m.results || [],
        studentStats: e,
        notes: n.results || [],
        absences: a.results || [],
        enrollments: en.results || [],
        orientations: o.results || [],
        periods: p.results || [],
        deliberations: d.results || [],
        budgetItems: bi.results || [],
        budgetCategories: bc.results || [],
        budgetReports: br.results || [],
        budgetStats: bs,
        timetableSlots: ts.results || [],
        auditLogs: al.results || [],
        notifications: no.results || [],
        officePasses: op.results || [],
        unavailabilityReports: ur.results || [],
      })
      setError(failures.length ? failures.join(' · ') : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  return { data, isLoading, error, reload, setData }
}

export function useFilteredStudents(etudiants: Etudiant[], query: string) {
  return useMemo(
    () => etudiants.filter((etudiant) => !query.trim() || matchesStudentQuery(etudiant, query)),
    [etudiants, query]
  )
}

export function useStudentSearch(classId: string | number | null | undefined, query: string, filters = '') {
  const [results, setResults] = useState<Etudiant[]>([])
  const [count, setCount] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const term = query.trim()

  useEffect(() => {
    let cancelled = false
    if (!classId || !term) {
      setResults([])
      setCount(0)
      setIsSearching(false)
      setError(null)
      return
    }

    setIsSearching(true)
    setError(null)
    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({ classe: String(classId), q: term, page_size: '8' })
      if (filters) new URLSearchParams(filters).forEach((value, key) => params.set(key, value))
      try {
        const response = await api.get<PaginatedResponse<Etudiant>>(`/etudiants/?${params.toString()}`)
        if (cancelled) return
        setResults(response.results)
        setCount(response.count)
      } catch (searchError) {
        if (cancelled) return
        setResults([])
        setCount(0)
        setError(searchError instanceof Error ? searchError.message : 'La recherche des élèves a échoué.')
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [classId, term, filters])

  return { results, count, isSearching, error }
}

export function useStudentDirectory(classId: string | number | null | undefined, query: string, page: number, pageSize = 20) {
  const [results, setResults] = useState<Etudiant[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const term = query.trim()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({ page: String(page + 1), page_size: String(pageSize) })
      if (classId) params.set('classe', String(classId))
      if (term && classId) params.set('q', term)
      try {
        const response = await api.get<PaginatedResponse<Etudiant>>(`/etudiants/?${params.toString()}`)
        if (cancelled) return
        setResults(response.results)
        setCount(response.count)
      } catch (requestError) {
        if (cancelled) return
        setResults([])
        setCount(0)
        setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les élèves.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [classId, term, page, pageSize])

  return { results, count, isLoading, error }
}

export function matchesStudentQuery(student: Pick<Etudiant, 'first_name' | 'last_name' | 'matricule'>, query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  const fields = [student.first_name, student.last_name, student.matricule, `${student.first_name} ${student.last_name}`].map(normalize)
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  return terms.length > 0 && terms.every((term) => fields.some((field) => field.includes(term)))
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function formatCurrency(value: number | string | null | undefined, devise = 'MGA') {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' ' + devise
}
