'use client'

import { useState, useEffect, useMemo } from 'react'
import { api, type PaginatedResponse, type User, type Etudiant, type Note, type Classe, type Matiere, type Enrollment, type StudentOrientation, type ExamPeriod, type Absence } from '@/lib/api'

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
  | 'chat'
  | 'audit'

export type AdminData = {
  users: User[]
  classes: Classe[]
  matieres: Matiere[]
  etudiants: Etudiant[]
  notes: Note[]
  absences: Absence[]
  enrollments: Enrollment[]
  orientations: StudentOrientation[]
  periods: ExamPeriod[]
}

export function useAdminData() {
  const [data, setData] = useState<AdminData>({
    users: [], classes: [], matieres: [], etudiants: [], notes: [],
    absences: [], enrollments: [], orientations: [], periods: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [u, c, m, e, n, a, en, o, p] = await Promise.all([
        api.get<PaginatedResponse<User>>('/users/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Classe>>('/classes/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Matiere>>('/matieres/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Etudiant>>('/etudiants/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Note>>('/notes/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Absence>>('/absences/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<Enrollment>>('/enrollments/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<StudentOrientation>>('/orientations/').catch(() => ({ results: [] })),
        api.get<PaginatedResponse<ExamPeriod>>('/exam-periods/').catch(() => ({ results: [] })),
      ])
      setData({
        users: u.results || [],
        classes: c.results || [],
        matieres: m.results || [],
        etudiants: e.results || [],
        notes: n.results || [],
        absences: a.results || [],
        enrollments: en.results || [],
        orientations: o.results || [],
        periods: p.results || [],
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

export function useFilteredStudents(etudiants: Etudiant[], users: User[], query: string) {
  return useMemo(
    () =>
      etudiants.filter((etudiant) => {
        const user = users.find((u) => u.id === etudiant.user)
        if (!user) return false
        const q = query.toLowerCase()
        return (
          user.first_name?.toLowerCase().includes(q) ||
          user.last_name?.toLowerCase().includes(q) ||
          user.matricule?.toLowerCase().includes(q) ||
          user.email?.toLowerCase().includes(q)
        )
      }),
    [etudiants, users, query]
  )
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function formatCurrency(value: number | null | undefined, devise = 'XOF') {
  if (value == null) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' ' + devise
}
