'use client'

import { useState, useEffect, useMemo } from 'react'
import { api, type PaginatedResponse, type User, type Etudiant, type Note, type Classe, type Matiere, type Enrollment, type StudentOrientation, type ExamPeriod, type Absence, type BudgetItem, type BudgetCategory, type BudgetReport, type BudgetStats, type TimetableSlot, type AuditLog, type Notification, type StudentOfficePass } from '@/lib/api'
import { getStoredUser, isValidPortalRole } from '@/lib/auth'

export type ScreenKey =
  | 'overview'
  | 'students'
  | 'enrollments'
  | 'payments'
  | 'classes'
  | 'teachers'
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
  etudiants: Etudiant[]
  notes: Note[]
  absences: Absence[]
  enrollments: Enrollment[]
  orientations: StudentOrientation[]
  periods: ExamPeriod[]
  budgetItems: BudgetItem[]
  budgetCategories: BudgetCategory[]
  budgetReports: BudgetReport[]
  budgetStats: BudgetStats | null
  timetableSlots: TimetableSlot[]
  auditLogs: AuditLog[]
  notifications: Notification[]
  officePasses: StudentOfficePass[]
}

export function useAdminData() {
  const [data, setData] = useState<AdminData>({
    users: [], allUsers: [], classes: [], matieres: [], etudiants: [], notes: [],
    absences: [], enrollments: [], orientations: [], periods: [],
    budgetItems: [], budgetCategories: [], budgetReports: [], budgetStats: null,
    timetableSlots: [], auditLogs: [], notifications: [], officePasses: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setIsLoading(true)
    setError(null)

    const currentUser = getStoredUser()
    if (!currentUser || !isValidPortalRole(currentUser.role)) {
      setData({
        users: [], allUsers: [], classes: [], matieres: [], etudiants: [], notes: [],
        absences: [], enrollments: [], orientations: [], periods: [],
        budgetItems: [], budgetCategories: [], budgetReports: [], budgetStats: null,
        timetableSlots: [], auditLogs: [], notifications: [], officePasses: [],
      })
      setIsLoading(false)
      return
    }

    try {
      const [u, c, m, e, n, a, en, o, p, bi, bc, br, bs, ts, al, no, op] = await Promise.all([
        api.get<PaginatedResponse<User>>('/users/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Classe>>('/classes/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Matiere>>('/matieres/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Etudiant>>('/etudiants/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Note>>('/notes/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Absence>>('/absences/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Enrollment>>('/enrollments/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<StudentOrientation>>('/orientations/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<ExamPeriod>>('/exam-periods/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<BudgetItem>>('/budget/items/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<BudgetCategory>>('/budget/categories/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<BudgetReport>>('/budget/reports/').catch(() => ({ results: [] })),
        api.get<BudgetStats>('/budget/items/stats/?academic_year=2024-2025').catch(() => null),
        api.get<PaginatedResponse<TimetableSlot>>('/timetable/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<AuditLog>>('/audit/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Notification>>('/notifications/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<StudentOfficePass>>('/office-passes/').catch(() => ({ results: [] })),
      ])
      setData({
        users: u.results || [],
        allUsers: u.results || [],
        classes: c.results || [],
        matieres: m.results || [],
        etudiants: e.results || [],
        notes: n.results || [],
        absences: a.results || [],
        enrollments: en.results || [],
        orientations: o.results || [],
        periods: p.results || [],
        budgetItems: bi.results || [],
        budgetCategories: bc.results || [],
        budgetReports: br.results || [],
        budgetStats: bs,
        timetableSlots: ts.results || [],
        auditLogs: al.results || [],
        notifications: no.results || [],
        officePasses: op.results || [],
      })
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
    () =>
      etudiants.filter((etudiant) => {
        const q = query.toLowerCase()
        return (
          etudiant.first_name?.toLowerCase().includes(q) ||
          etudiant.last_name?.toLowerCase().includes(q) ||
          etudiant.matricule?.toLowerCase().includes(q)
        )
      }),
    [etudiants, query]
  )
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
