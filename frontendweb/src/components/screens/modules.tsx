'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, Plus, Pencil, Trash2, UserPlus, ChevronRight, BookOpen, GraduationCap, UsersRound, FileText, Camera, CameraOff, ScanLine, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type User, type Classe, type Matiere, type MatiereCoefficient, type Note, type ExamPeriod, type SchoolConfig, type PaginatedResponse, type AttendanceRiskAlert, type TeacherAssignment, type TeacherUnavailabilityReport } from '@/lib/api'
import { initials, matchesStudentQuery, useStudentSearch } from '@/lib/admin-data'

export function TeachersScreen({ users, notes, matieres, periods, onReload }: {
  users: User[]
  notes: any[]
  matieres: Matiere[]
  periods: any[]
  onReload: () => void
}) {
  type StaffRole = 'PROFESSEUR' | 'SURVEILLANT' | 'SECRETARIAT'
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', matricule: '', role: 'PROFESSEUR' as StaffRole, teacher_type: 'FONCTIONNAIRE' as 'FONCTIONNAIRE' | 'SUPPLEANT', matiere: '', surveillant_type: 'GENERAL', phone: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const personnel = users.filter((u) => ['PROFESSEUR', 'SURVEILLANT', 'SECRETARIAT'].includes(u.role))
  const filtered = personnel.filter((t) => {
    const q = query.toLowerCase()
    return t.first_name.toLowerCase().includes(q) || t.last_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ first_name: '', last_name: '', email: '', matricule: '', role: 'PROFESSEUR', teacher_type: 'FONCTIONNAIRE', matiere: '', surveillant_type: 'GENERAL', phone: '', password: '' })
    setFormError('')
    setEditingTeacher(null)
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (teacher: User) => {
    setEditingTeacher(teacher)
    setForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      matricule: teacher.matricule,
      role: teacher.role as StaffRole,
      teacher_type: (teacher.teacher_type as 'FONCTIONNAIRE' | 'SUPPLEANT') || 'FONCTIONNAIRE',
      matiere: '',
      surveillant_type: teacher.surveillant_type || 'GENERAL',
      phone: teacher.phone || '',
      password: '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setFormError('')
    try {
      const { password, ...fields } = form
      const payload: Record<string, unknown> = { ...fields, ...(password ? { password } : {}) }
      if (form.role !== 'PROFESSEUR') {
        delete payload.matiere
      }
      if (editingTeacher) {
        await api.patch(`/users/${editingTeacher.id}/`, payload)
      } else {
        await api.post('/users/', { ...payload, username: form.email, status: 'PENDING_VERIFICATION' })
      }
      onReload()
      resetForm()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer ce compte.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Supprimer ce compte du personnel ?')) return
    try {
      await api.delete(`/users/${userId}/`)
      onReload()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const handleStatusChange = async (userId: number, status: string) => {
    try {
      if (status === 'ACTIVE') {
        await api.post(`/users/${userId}/approve/`, {})
      } else if (status === 'SUSPENDED') {
        await api.post(`/users/${userId}/suspend/`, {})
      } else if (status === 'REJECTED') {
        await api.post(`/users/${userId}/reject/`, {})
      }
      onReload()
    } catch (e) {
      console.error('Status change failed', e)
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      PENDING_VERIFICATION: 'bg-amber-500/10 text-amber-700',
      REJECTED: 'bg-rose-500/10 text-rose-700',
      SUSPENDED: 'bg-rose-500/10 text-rose-700',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Personnel</h2>
          <p className="text-sm text-muted-foreground">{personnel.length} comptes · {personnel.filter((t) => t.status === 'ACTIVE').length} actifs · {personnel.filter((t) => t.status === 'PENDING_VERIFICATION').length} en attente</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="h-10 w-56 pl-9" />
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1"><Plus className="size-4" />Ajouter</Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editingTeacher ? 'Modifier un compte' : 'Créer un compte du personnel'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><XCircle className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Dupont" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Prénom *</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Jean" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jean@lycee.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Matricule *</label>
                <Input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} placeholder="ENS001" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+261 34 00 000 00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Rôle</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                  <option value="PROFESSEUR">Enseignant</option>
                  <option value="SURVEILLANT">Surveillant</option>
                  <option value="SECRETARIAT">Secrétariat</option>
                </select>
              </div>
              {form.role === 'PROFESSEUR' && <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.teacher_type} onChange={(e) => setForm({ ...form, teacher_type: e.target.value as any })}>
                    <option value="FONCTIONNAIRE">Fonctionnaire</option>
                    <option value="SUPPLEANT">Suppléant</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Matière *</label>
                  <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })}>
                    <option value="">Choisir une matière</option>
                    {matieres.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom} ({m.code})</option>
                    ))}
                  </select>
                </div>
              </>}
              {form.role === 'SURVEILLANT' && <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type de surveillant</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.surveillant_type} onChange={(e) => setForm({ ...form, surveillant_type: e.target.value })}>
                  <option value="GENERAL">Surveillant général</option>
                  <option value="ETAGE">Surveillant d’étage</option>
                  <option value="PORTE">Surveillant de porte</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>}
              {!editingTeacher && <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mot de passe initial</label>
                <Input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>}
              {formError && <p className="sm:col-span-2 text-sm text-destructive" role="alert">{formError}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((teacher) => {
          const notesCount = teacher.role === 'PROFESSEUR' ? notes.filter((n) => n.professeur === teacher.id).length : 0
          return (
            <Card key={teacher.id} className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {initials(`${teacher.first_name} ${teacher.last_name}`)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{teacher.first_name} {teacher.last_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{teacher.matricule} · {teacher.role === 'PROFESSEUR' ? teacher.teacher_type || 'Enseignant' : teacher.role === 'SURVEILLANT' ? teacher.surveillant_type || 'Surveillant' : 'Secrétariat'}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(teacher.status)}`}>
                    {teacher.status}
                  </span>
                  {teacher.role === 'PROFESSEUR' && <span className="text-xs text-muted-foreground">{notesCount} notes</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {teacher.status === 'PENDING_VERIFICATION' && (
                    <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange(teacher.id, 'ACTIVE')}><CheckCircle2 className="size-3" />Approuver</Button>
                  )}
                  {teacher.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleStatusChange(teacher.id, 'SUSPENDED')}><XCircle className="size-3" />Suspendre</Button>
                  )}
                  {(teacher.status === 'REJECTED' || teacher.status === 'SUSPENDED') && (
                    <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange(teacher.id, 'ACTIVE')}><CheckCircle2 className="size-3" />Réactiver</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(teacher)}><Pencil className="size-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(teacher.id)}><Trash2 className="size-3" /></Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <UsersRound className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aucun membre du personnel trouvé.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ClassesScreen({ classes, onReload }: { classes: Classe[]; onReload: () => void }) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)
  const [form, setForm] = useState({ nom: '', niveau: 'SECONDAIRE_GENERAL', stream: '', academic_year: '', capacite: 30 })
  const [saving, setSaving] = useState(false)

  const filtered = classes.filter((c) => {
    const q = query.toLowerCase()
    return c.nom.toLowerCase().includes(q) || c.niveau.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ nom: '', niveau: 'SECONDAIRE_GENERAL', stream: '', academic_year: '', capacite: 30 })
    setEditingClass(null)
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (classe: any) => {
    setEditingClass(classe)
    setForm({ nom: classe.nom, niveau: classe.niveau, stream: classe.stream || '', academic_year: classe.academic_year || '', capacite: classe.capacite })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, stream: form.stream || null, academic_year: form.academic_year || null }
      if (editingClass) {
        await api.patch(`/classes/${editingClass.id}/`, payload)
      } else {
        await api.post('/classes/', payload)
      }
      onReload()
      resetForm()
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (classId: number) => {
    if (!confirm('Supprimer cette classe ?')) return
    try {
      await api.delete(`/classes/${classId}/`)
      onReload()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Classes & Matières</h2>
          <p className="text-sm text-muted-foreground">{classes.length} classes · {classes.reduce((total, classe) => total + (classe.effectif || 0), 0)} élèves actifs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="h-10 w-56 pl-9" />
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1"><Plus className="size-4" />Ajouter</Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editingClass ? 'Modifier classe' : 'Nouvelle classe'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><XCircle className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="6ème A" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Niveau *</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
                  <option value="PRIMAIRE">Primaire</option>
                  <option value="SECONDAIRE_GENERAL">Secondaire Général</option>
                  <option value="SECONDAIRE_TECHNIQUE">Secondaire Technique</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Filière</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                  <option value="">—</option>
                  <option value="S">Scientifique (S)</option>
                  <option value="L">Littéraire (L)</option>
                  <option value="OSE">Socio-Économique (OSE)</option>
                  <option value="TC">Technique Commercial</option>
                  <option value="TI">Technique Industriel</option>
                  <option value="G">Générale</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Année scolaire</label>
                <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2024-2025" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Capacité</label>
                <Input type="number" value={form.capacite.toString()} onChange={(e) => setForm({ ...form, capacite: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((classe: any) => {
          const effectif = classe.effectif || 0
          const fillRate = classe.capacite ? Math.round((effectif / classe.capacite) * 100) : 0
          return (
            <Card key={classe.id} className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
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
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(classe)}><Pencil className="size-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(classe.id)}><Trash2 className="size-3" /></Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aucune classe trouvée.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function MatieresScreen({ matieres, classes, onReload }: { matieres: Matiere[]; classes: Classe[]; onReload: () => void }) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null)
  const [form, setForm] = useState({ nom: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [coefficients, setCoefficients] = useState<MatiereCoefficient[]>([])
  const [coefficientsLoading, setCoefficientsLoading] = useState(true)
  const [coefficientForm, setCoefficientForm] = useState({ matiere: '', classe: '', coefficient: '1' })
  const [editingCoefficient, setEditingCoefficient] = useState<number | null>(null)
  const [coefficientError, setCoefficientError] = useState('')
  const [coefficientSaving, setCoefficientSaving] = useState(false)

  const refreshCoefficients = async () => {
    setCoefficientsLoading(true)
    setCoefficientError('')
    try {
      const response = await api.get<PaginatedResponse<MatiereCoefficient>>('/matiere-coefficients/')
      setCoefficients(response.results)
    } catch (error) {
      setCoefficientError(error instanceof Error ? error.message : 'Impossible de charger les coefficients par classe.')
    } finally {
      setCoefficientsLoading(false)
    }
  }

  useEffect(() => {
    void refreshCoefficients()
  }, [])

  const filtered = matieres.filter((m) => {
    const q = query.toLowerCase()
    return m.nom.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ nom: '', code: '' })
    setEditingMatiere(null)
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (matiere: Matiere) => {
    setEditingMatiere(matiere)
    setForm({ nom: matiere.nom, code: matiere.code })
    setShowForm(true)
  }

  const resetCoefficientForm = () => {
    setCoefficientForm({ matiere: '', classe: '', coefficient: '1' })
    setEditingCoefficient(null)
    setCoefficientError('')
  }

  const openCoefficientEdit = (coefficient: MatiereCoefficient) => {
    if (!coefficient.classe) return
    setCoefficientForm({
      matiere: String(coefficient.matiere),
      classe: String(coefficient.classe),
      coefficient: coefficient.coefficient,
    })
    setEditingCoefficient(coefficient.id)
    setCoefficientError('')
  }

  const saveCoefficient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!coefficientForm.matiere || !coefficientForm.classe) return
    setCoefficientSaving(true)
    setCoefficientError('')
    try {
      const payload = {
        matiere: Number(coefficientForm.matiere),
        classe: Number(coefficientForm.classe),
        coefficient: coefficientForm.coefficient,
      }
      if (editingCoefficient) {
        await api.patch(`/matiere-coefficients/${editingCoefficient}/`, payload)
      } else {
        await api.post('/matiere-coefficients/', payload)
      }
      await refreshCoefficients()
      resetCoefficientForm()
    } catch (error) {
      setCoefficientError(error instanceof Error ? error.message : 'Impossible d’enregistrer ce coefficient.')
    } finally {
      setCoefficientSaving(false)
    }
  }

  const deleteCoefficient = async (coefficient: MatiereCoefficient) => {
    if (!confirm('Supprimer ce coefficient personnalisé ?')) return
    setCoefficientError('')
    try {
      await api.delete(`/matiere-coefficients/${coefficient.id}/`)
      await refreshCoefficients()
    } catch (error) {
      setCoefficientError(error instanceof Error ? error.message : 'Impossible de supprimer ce coefficient.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingMatiere) {
        await api.patch(`/matieres/${editingMatiere.id}/`, form)
      } else {
        await api.post('/matieres/', form)
      }
      onReload()
      resetForm()
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (matiereId: number) => {
    if (!confirm('Supprimer cette matière ?')) return
    try {
      await api.delete(`/matieres/${matiereId}/`)
      onReload()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Matières</h2>
          <p className="text-sm text-muted-foreground">{matieres.length} matières enregistrées</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="h-10 w-56 pl-9" />
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1"><Plus className="size-4" />Ajouter</Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{editingMatiere ? 'Modifier matière' : 'Nouvelle matière'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><XCircle className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nom *</label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Mathématiques" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Code *</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MATH" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Coefficients par matière et par classe</CardTitle>
          <p className="text-xs text-muted-foreground">Configurez ici le coefficient applicable à chaque classe.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={saveCoefficient} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_auto]">
            <label className="grid gap-1.5 text-xs font-semibold">Matière
              <select required value={coefficientForm.matiere} onChange={(event) => {
                const selectedSubject = event.target.value
                const existing = coefficients.find((item) => item.matiere === Number(selectedSubject) && item.classe === Number(coefficientForm.classe))
                setCoefficientForm({
                  ...coefficientForm,
                  matiere: selectedSubject,
                  coefficient: existing?.coefficient || coefficientForm.coefficient,
                })
                setEditingCoefficient(existing?.id ?? null)
              }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal">
                <option value="">Choisir une matière</option>
                {matieres.map((matiere) => <option key={matiere.id} value={matiere.id}>{matiere.code} — {matiere.nom}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Classe
              <select required value={coefficientForm.classe} onChange={(event) => {
                const selectedClass = event.target.value
                const existing = coefficients.find((item) => item.matiere === Number(coefficientForm.matiere) && item.classe === Number(selectedClass))
                setCoefficientForm({
                  ...coefficientForm,
                  classe: selectedClass,
                  coefficient: existing?.coefficient || coefficientForm.coefficient,
                })
                setEditingCoefficient(existing?.id ?? null)
              }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal">
                <option value="">Choisir une classe</option>
                {classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom} — {classe.stream || classe.niveau}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Coefficient
              <Input required type="number" min="0.01" step="0.01" value={coefficientForm.coefficient} onChange={(event) => setCoefficientForm({ ...coefficientForm, coefficient: event.target.value })} />
            </label>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={coefficientSaving || !matieres.length || !classes.length} className="w-full">
                {coefficientSaving ? 'Enregistrement…' : editingCoefficient ? 'Modifier' : 'Configurer'}
              </Button>
              {editingCoefficient && <Button type="button" variant="outline" onClick={resetCoefficientForm}>Annuler</Button>}
            </div>
          </form>
          {coefficientError && <p className="text-sm text-destructive" role="alert">{coefficientError}</p>}
          {coefficientsLoading ? <p className="text-sm text-muted-foreground">Chargement des coefficients…</p> : (
            <div className="space-y-2">
              {coefficients.filter((item) => item.classe).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{item.matiere_detail.code} — {item.matiere_detail.nom}</span>
                    <span className="text-muted-foreground"> · {item.classe_detail?.nom || classes.find((classe) => classe.id === item.classe)?.nom} · Coef. {item.coefficient}</span>
                  </p>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => openCoefficientEdit(item)} aria-label={`Modifier le coefficient ${item.matiere_detail.nom} - ${item.classe_detail?.nom || ''}`}><Pencil className="size-3" /></Button>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteCoefficient(item)} aria-label={`Supprimer le coefficient ${item.matiere_detail.nom}`}><Trash2 className="size-3" /></Button>
                  </div>
                </div>
              ))}
              {coefficients.filter((item) => item.classe).length === 0 && <p className="text-sm text-muted-foreground">Aucun coefficient personnalisé par classe.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((matiere) => (
          <Card key={matiere.id} className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{matiere.nom}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{matiere.code}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(matiere)}><Pencil className="size-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(matiere.id)}><Trash2 className="size-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aucune matière trouvée.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function CoverageScreen({ classes, matieres, users }: { classes: any[]; matieres: Matiere[]; users: User[] }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigningId, setAssigningId] = useState<number | null>(null)

  const loadCoverage = async () => {
    try {
      setLoading(true)
      const response = await api.get<{ count: number; missing_subjects: any[] }>('/classes/coverage/')
      setItems(response.missing_subjects || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les couverures pédagogiques.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCoverage()
  }, [])

  const assignTeacher = async (coverageItem: any, teacher: any) => {
    setAssigningId(teacher.id)
    try {
      await api.post('/teacher-assignments/', {
        professeur: teacher.id,
        classe: coverageItem.classe.id,
        matiere: coverageItem.matiere.id,
        academic_year: coverageItem.academic_year || '2024-2025',
        is_main_teacher: false,
        is_substitute: true,
        coverage_reason: teacher.is_primary_match
          ? 'Matière principale compatible / couverture pédagogique prioritaire'
          : 'Aide enseignante / manque de prof sur la matière',
      })
      await loadCoverage()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’affecter ce professeur.')
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Couverture pédagogique</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">Matières non couvertes</h2>
        </div>
        <Button variant="outline" onClick={() => void loadCoverage()} disabled={loading}>Actualiser</Button>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}

      {loading ? (
        <Card className="rounded-2xl"><CardContent className="p-8 text-center text-sm text-muted-foreground">Recherche des matières non couvertes…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl"><CardContent className="p-8 text-center text-sm text-muted-foreground">Aucune matière non couverte pour l’instant.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={`${item.classe.id}-${item.matiere.id}`} className="rounded-2xl border-border/70 bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold">{item.classe.nom}</p>
                    <p className="text-sm text-muted-foreground">{item.classe.niveau}{item.classe.stream ? ` · ${item.classe.stream}` : ''} · {item.matiere.nom} ({item.matiere.code})</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700">{item.academic_year}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {item.suggested_teachers?.length ? item.suggested_teachers.map((teacher: any, index: number) => {
                    const score = Math.min(100, Math.max(0, Number(teacher.priority_score ?? 50)))
                    const isTopRecommendation = index === 0
                    return (
                      <div key={teacher.id} className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{teacher.first_name} {teacher.last_name}</p>
                            {isTopRecommendation && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Meilleur match</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{teacher.matricule} · {teacher.email}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                              Spécialité exacte · {Number(teacher.weekly_scheduled_hours || 0)} h/sem. au planning
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Score {score}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                          </div>
                        </div>
                        <Button size="sm" onClick={() => void assignTeacher(item, teacher)} disabled={assigningId === teacher.id}>
                          {assigningId === teacher.id ? 'Affectation…' : 'Affecter'}
                        </Button>
                      </div>
                    )
                  }) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Aucun enseignant disponible détecté pour cette matière.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function GradesScreen({ notes, users, classes, matieres, periods, role, userId, onReload }: {
  notes: Note[]
  users: User[]
  classes: Classe[]
  matieres: Matiere[]
  periods: ExamPeriod[]
  role: string
  userId: number | null
  onReload: () => void
}) {
  const [actionError, setActionError] = useState('')
  const [processingNote, setProcessingNote] = useState<number | null>(null)
  const [notesClassFilter, setNotesClassFilter] = useState('')
  const [notesSearch, setNotesSearch] = useState('')
  const [notePage, setNotePage] = useState(0)
  const [assignments, setAssignments] = useState<Array<{ classe: number; matiere: number; academic_year: string; professeur: number }>>([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [studentId, setStudentId] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingGrade, setSavingGrade] = useState(false)
  const [gradeMessage, setGradeMessage] = useState('')
  const [gradeError, setGradeError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadAssignments = async () => {
      try {
        const rows: Array<{ classe: number; matiere: number; academic_year: string; professeur: number }> = []
        let page = 1
        let next = true
        while (next) {
          const response = await api.get<PaginatedResponse<(typeof rows)[number]>>(`/teacher-assignments/?page=${page}&page_size=500${role === 'PROFESSEUR' && userId ? `&professeur=${userId}` : ''}`)
          rows.push(...response.results)
          next = Boolean(response.next)
          page += 1
        }
        if (!cancelled) setAssignments(rows)
      } catch (error) {
        if (!cancelled) setGradeError(error instanceof Error ? error.message : 'Impossible de charger vos classes affectées.')
      }
    }
    void loadAssignments()
    return () => { cancelled = true }
  }, [role, userId])

  const availableAssignments = assignments.filter((item) => item.classe === Number(classId) && (!periodId || item.academic_year === periods.find((period) => period.id === Number(periodId))?.academic_year))
  const availableSubjects = [...new Set(availableAssignments.map((item) => item.matiere))]
  const { results: matchingStudents, count: matchingStudentCount, isSearching: isSearchingStudent, error: studentSearchError } = useStudentSearch(classId, studentQuery, 'actif=true&statut=ENROLLED')
  const filteredNotes = notes.filter((note) => {
    const student = note.etudiant_detail
    return Boolean(notesClassFilter && student.classe === Number(notesClassFilter) && (!notesSearch.trim() || matchesStudentQuery(student, notesSearch)))
  })
  const notePageCount = Math.max(1, Math.ceil(filteredNotes.length / 30))
  const visibleNotes = filteredNotes.slice(notePage * 30, notePage * 30 + 30)

  const saveGrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentId || !classId || !subjectId || !periodId) return
    setSavingGrade(true)
    setGradeError('')
    setGradeMessage('')
    try {
      const existing = notes.find((note) => note.etudiant === Number(studentId) && note.matiere === Number(subjectId) && note.exam_period === Number(periodId))
      const payload = { etudiant: Number(studentId), matiere: Number(subjectId), exam_period: Number(periodId), score_1: score1, score_2: score2 || null, date_evaluation: evaluationDate }
      if (existing && !['DRAFT', 'REJECTED'].includes(existing.status)) throw new Error('Une note déjà transmise existe pour cet élève, cette matière et cette période.')
      if (existing) await api.patch(`/notes/${existing.id}/`, payload)
      else await api.post('/notes/', payload)
      setGradeMessage(existing ? 'Brouillon de note mis à jour.' : 'Note enregistrée en brouillon.')
      setScore1('')
      setScore2('')
      setStudentId('')
      setStudentQuery('')
      onReload()
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : 'Impossible d’enregistrer la note.')
    } finally {
      setSavingGrade(false)
    }
  }
  const actOnNote = async (note: Note, action: 'submit' | 'approve' | 'reject') => {
    setProcessingNote(note.id)
    setActionError('')
    try {
      const commentaire = action === 'reject'
        ? window.prompt('Indiquez les corrections attendues :', note.commentaire || '')
        : undefined
      if (action === 'reject' && commentaire === null) return
      await api.post(`/notes/${note.id}/${action}/`, commentaire === undefined ? {} : { commentaire })
      onReload()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'La mise à jour de la note a échoué.')
    } finally {
      setProcessingNote(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Notes & Évaluations</h2>
        <p className="text-sm text-muted-foreground">{notes.length} notes · {periods.length} périodes d'examen configurées</p>
      </div>

      <div className="mobile-stat-grid grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Moyenne générale</p><p className="mt-1 text-2xl font-semibold">{notes.length ? (notes.reduce((s, n) => s + Number(n.note), 0) / notes.length).toFixed(2) : '—'}/20</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Notes verrouillées</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'LOCKED').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En brouillon</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'DRAFT').length}</p></CardContent></Card>
      </div>

      {role === 'PROFESSEUR' && <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Saisir une note</CardTitle><p className="text-xs text-muted-foreground">Choisissez la classe avant de rechercher l’élève par nom ou matricule.</p></CardHeader>
        <CardContent>
          <form onSubmit={saveGrade} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold">Classe
              <select required value={classId} onChange={(event) => { setClassId(event.target.value); setSubjectId(''); setPeriodId(''); setStudentId(''); setStudentQuery('') }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal">
                <option value="">Choisir une classe</option>{classes.filter((classe) => assignments.some((item) => item.classe === classe.id)).map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Matière
              <select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} disabled={!classId} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="">Choisir une matière</option>{matieres.filter((item) => availableSubjects.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Période
              <select required value={periodId} onChange={(event) => { setPeriodId(event.target.value); setSubjectId('') }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="">Choisir une période</option>{periods.filter((period) => !period.is_locked && (!classId || period.academic_year === classes.find((classe) => classe.id === Number(classId))?.academic_year)).map((period) => <option key={period.id} value={period.id}>{period.label} · {period.academic_year}</option>)}</select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Rechercher un élève par nom ou matricule
              <Input required disabled={!classId} value={studentQuery} onChange={(event) => { setStudentQuery(event.target.value); setStudentId('') }} placeholder="Nom, prénom ou matricule" />
            </label>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-border">
              {matchingStudents.map((student) => <button type="button" key={student.id} onClick={() => setStudentId(String(student.id))} className={`flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted ${studentId === String(student.id) ? 'bg-primary/10' : ''}`}><span>{student.first_name} {student.last_name}</span><span className="text-muted-foreground">{student.matricule}</span></button>)}
              {isSearchingStudent && <p className="px-3 py-2 text-sm text-muted-foreground">Recherche en cours…</p>}
              {studentSearchError && <p className="px-3 py-2 text-sm text-destructive" role="alert">{studentSearchError}</p>}
              {classId && studentQuery.trim() && !isSearchingStudent && !studentSearchError && matchingStudents.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucun élève correspondant dans cette classe.</p>}
              {matchingStudentCount > matchingStudents.length && <p className="px-3 py-2 text-xs text-muted-foreground">{matchingStudentCount} résultat(s) : affinez la recherche.</p>}
              {!studentQuery.trim() && <p className="px-3 py-2 text-sm text-muted-foreground">Saisissez un nom ou un matricule après avoir choisi la classe.</p>}
            </div>
            <label className="grid gap-1.5 text-xs font-semibold">Note 1 / 20<Input required type="number" min="0" max="20" step="0.01" value={score1} onChange={(event) => setScore1(event.target.value)} /></label>
            {periods.find((period) => period.id === Number(periodId))?.number_of_notes === 2 && <label className="grid gap-1.5 text-xs font-semibold">Note 2 / 20<Input type="number" min="0" max="20" step="0.01" value={score2} onChange={(event) => setScore2(event.target.value)} /></label>}
            <label className="grid gap-1.5 text-xs font-semibold">Date d’évaluation<Input required type="date" value={evaluationDate} onChange={(event) => setEvaluationDate(event.target.value)} /></label>
            {gradeError && <p className="text-sm text-destructive sm:col-span-2" role="alert">{gradeError}</p>}
            {gradeMessage && <p className="text-sm text-emerald-700 sm:col-span-2" role="status">{gradeMessage}</p>}
            <div className="flex items-end"><Button type="submit" disabled={savingGrade || !studentId || !subjectId || !periodId}>{savingGrade ? 'Enregistrement…' : 'Enregistrer le brouillon'}</Button></div>
          </form>
        </CardContent>
      </Card>}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Notes à saisir et à valider</CardTitle></CardHeader>
        {actionError && <p className="mx-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{actionError}</p>}
        <CardContent className="px-0">
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">Classe<select value={notesClassFilter} onChange={(event) => { setNotesClassFilter(event.target.value); setNotesSearch(''); setNotePage(0) }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="">Choisir une classe</option>{classes.filter((classe) => role !== 'PROFESSEUR' || assignments.some((item) => item.classe === classe.id)).map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold">Rechercher un élève par nom ou matricule<Input disabled={!notesClassFilter} value={notesSearch} onChange={(event) => { setNotesSearch(event.target.value); setNotePage(0) }} placeholder="Nom, prénom ou matricule" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="mobile-card-table w-full min-w-[640px] text-left text-sm">
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
                {visibleNotes.map((n) => {
                  const mat = matieres.find((m) => m.id === n.matiere)
                  const per = periods.find((p) => p.id === n.exam_period)
                  return (
                    <tr key={n.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td data-label="Élève" className="px-3 py-3 sm:px-6 sm:py-4">{n.etudiant_detail.first_name} {n.etudiant_detail.last_name}</td>
                      <td data-label="Matière" className="px-3 py-3 sm:px-4 sm:py-4">{mat?.code || '—'}</td>
                      <td data-label="Période" className="px-3 py-3 sm:px-4 sm:py-4">{per?.label || '—'}</td>
                      <td data-label="Note" className="px-3 py-3 sm:px-4 sm:py-4 font-semibold">{n.note}/20</td>
                      <td data-label="Coefficient" className="px-3 py-3 sm:px-4 sm:py-4">{n.coefficient}</td>
                      <td data-label="Statut et actions" className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${n.status === 'APPROVED' || n.status === 'LOCKED' ? 'bg-emerald-500/10 text-emerald-700' : n.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-700'}`}>{n.status}</span>
                          {role === 'PROFESSEUR' && (n.status === 'DRAFT' || n.status === 'REJECTED') && (
                            <Button size="sm" disabled={processingNote === n.id} onClick={() => void actOnNote(n, 'submit')}>Transmettre</Button>
                          )}
                          {role === 'ADMIN' && n.status === 'SUBMITTED' && (
                            <>
                              <Button size="sm" disabled={processingNote === n.id} onClick={() => void actOnNote(n, 'approve')}>Valider</Button>
                              <Button size="sm" variant="outline" disabled={processingNote === n.id} onClick={() => void actOnNote(n, 'reject')}>À corriger</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {visibleNotes.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">{notesClassFilter ? 'Aucune note correspondante.' : 'Choisissez une classe pour consulter les notes.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {filteredNotes.length > 30 && <div className="flex items-center justify-between px-4 py-3"><p className="text-xs text-muted-foreground">{filteredNotes.length} notes · page {notePage + 1} / {notePageCount}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={notePage === 0} onClick={() => setNotePage((page) => Math.max(0, page - 1))}>Précédent</Button><Button size="sm" variant="outline" disabled={notePage >= notePageCount - 1} onClick={() => setNotePage((page) => Math.min(notePageCount - 1, page + 1))}>Suivant</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  )
}

export function ExamPeriodsScreen({ periods, onReload }: { periods: ExamPeriod[]; onReload: () => void }) {
  const currentYear = new Date().getFullYear()
  const [form, setForm] = useState({
    academic_year: `${currentYear}-${currentYear + 1}`,
    period_type: 'T1',
    start_date: '',
    end_date: '',
    number_of_notes: '2',
    weight_note_1: '0.5',
    weight_note_2: '0.5',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [evaluationPeriodType, setEvaluationPeriodType] = useState<SchoolConfig['evaluation_period_type']>('TRIMESTRE')
  const [schoolConfigId, setSchoolConfigId] = useState<number | null>(null)
  const [configError, setConfigError] = useState('')
  const [configSaving, setConfigSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setConfigError('')
    api.get<PaginatedResponse<SchoolConfig>>(`/school-config/?academic_year=${encodeURIComponent(form.academic_year)}`)
      .then((response) => {
        if (cancelled) return
        const config = response.results.find((item) => item.academic_year === form.academic_year)
        setSchoolConfigId(config?.id ?? null)
        setEvaluationPeriodType(config?.evaluation_period_type ?? 'TRIMESTRE')
      })
      .catch((loadError) => {
        if (!cancelled) setConfigError(loadError instanceof Error ? loadError.message : 'Impossible de charger la configuration de l’année.')
      })
    return () => { cancelled = true }
  }, [form.academic_year])

  const periodOptions = evaluationPeriodType === 'BIMESTRE'
    ? ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']
    : ['T1', 'T2', 'T3']

  useEffect(() => {
    if (!periodOptions.includes(form.period_type)) {
      setForm((current) => ({ ...current, period_type: periodOptions[0] }))
    }
  }, [evaluationPeriodType, form.period_type])

  const saveEvaluationConfig = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setConfigSaving(true)
    setConfigError('')
    try {
      const payload = {
        academic_year: form.academic_year,
        evaluation_period_type: evaluationPeriodType,
      }
      const config = schoolConfigId
        ? await api.patch<SchoolConfig>(`/school-config/${schoolConfigId}/`, payload)
        : await api.post<SchoolConfig>('/school-config/', payload)
      setSchoolConfigId(config.id)
      onReload()
    } catch (saveError) {
      setConfigError(saveError instanceof Error ? saveError.message : 'Impossible d’enregistrer la configuration.')
    } finally {
      setConfigSaving(false)
    }
  }

  const savePeriod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const code = `${form.academic_year.slice(2, 4)}${form.period_type}`
      await api.post('/exam-periods/', {
        ...form,
        code,
        label: `${form.period_type.startsWith('B') ? 'Bimestre' : 'Trimestre'} ${form.period_type.slice(1)}`,
        number_of_notes: Number(form.number_of_notes),
        weight_note_1: form.number_of_notes === '1' ? '1' : form.weight_note_1,
        weight_note_2: form.number_of_notes === '1' ? '0' : form.weight_note_2,
      })
      onReload()
      setForm((current) => ({ ...current, start_date: '', end_date: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la période.')
    } finally {
      setSaving(false)
    }
  }

  const toggleLock = async (period: ExamPeriod) => {
    setError('')
    try {
      await api.patch(`/exam-periods/${period.id}/`, { is_locked: !period.is_locked })
      onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de modifier le verrouillage.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Configuration pédagogique</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">Années et périodes d’évaluation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choisissez l’organisation en bimestres ou trimestres pour chaque année scolaire, puis configurez les périodes et leur pondération.</p>
      </div>

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader><CardTitle className="text-base">Organisation de l’année scolaire</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveEvaluationConfig} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="grid gap-1.5 text-xs font-semibold">Année scolaire
              <Input required maxLength={9} pattern="\d{4}-\d{4}" value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} placeholder="2026-2027" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Organisation des évaluations
              <select value={evaluationPeriodType} onChange={(event) => setEvaluationPeriodType(event.target.value as SchoolConfig['evaluation_period_type'])} className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal">
                <option value="BIMESTRE">Bimestres</option>
                <option value="TRIMESTRE">Trimestres</option>
              </select>
            </label>
            <Button type="submit" disabled={configSaving}>{configSaving ? 'Enregistrement…' : 'Enregistrer la configuration'}</Button>
          </form>
          {configError && <p className="mt-3 text-sm text-destructive" role="alert">{configError}</p>}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader><CardTitle className="text-base">Ajouter une période</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePeriod} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold">Année scolaire
              <Input required maxLength={9} pattern="\d{4}-\d{4}" value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} placeholder="2026-2027" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Type de période
              <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal" value={form.period_type} onChange={(event) => setForm({ ...form, period_type: event.target.value })}>
                {periodOptions.map((code) => <option key={code} value={code}>{evaluationPeriodType === 'BIMESTRE' ? 'Bimestre' : 'Trimestre'} {code.slice(1)}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Nombre de notes
              <select className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-normal" value={form.number_of_notes} onChange={(event) => setForm({ ...form, number_of_notes: event.target.value })}>
                <option value="1">Une note</option>
                <option value="2">Deux notes pondérées</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Début de période
              <Input required type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Fin de période
              <Input required type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
            </label>
            {form.number_of_notes === '2' && (
              <>
                <label className="grid gap-1.5 text-xs font-semibold">Pondération note 1
                  <Input required type="number" min="0" max="1" step="0.01" value={form.weight_note_1} onChange={(event) => setForm({ ...form, weight_note_1: event.target.value })} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Pondération note 2
                  <Input required type="number" min="0" max="1" step="0.01" value={form.weight_note_2} onChange={(event) => setForm({ ...form, weight_note_2: event.target.value })} />
                </label>
              </>
            )}
            {error && <p className="text-sm text-destructive sm:col-span-2 lg:col-span-3" role="alert">{error}</p>}
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter la période'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader><CardTitle className="text-base">Périodes configurées</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {periods.map((period) => (
            <div key={period.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{period.label} <span className="font-normal text-muted-foreground">· {period.academic_year}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{period.start_date} — {period.end_date} · {period.number_of_notes === 1 ? '1 note' : '2 notes'} · coefficients {period.weight_note_1}/{period.weight_note_2}</p>
              </div>
              <Button type="button" size="sm" variant={period.is_locked ? 'outline' : 'secondary'} onClick={() => toggleLock(period)}>
                {period.is_locked ? 'Déverrouiller' : 'Verrouiller'}
              </Button>
            </div>
          ))}
          {periods.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune période configurée pour le moment.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

type ScannerControls = { stop: () => void }

export function AttendanceScreen({ absences, users, classes, role, userId, reports, onReload, canScan = false }: {
  absences: any[]
  users: User[]
  classes: Classe[]
  role: string | null
  userId: number | null
  reports: TeacherUnavailabilityReport[]
  onReload: () => void
  canScan?: boolean
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo' }).format(new Date())
  const today_abs = absences.filter((a) => a.date_absence === today)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<ScannerControls | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [scanClass, setScanClass] = useState('')
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [manualStudentQuery, setManualStudentQuery] = useState('')
  const [manualStudentId, setManualStudentId] = useState('')
  const [manualStatus, setManualStatus] = useState<'ABSENT' | 'LATE'>('ABSENT')
  const [manualAttendanceError, setManualAttendanceError] = useState('')
  const [manualAttendanceSaving, setManualAttendanceSaving] = useState(false)
  const [scanDate, setScanDate] = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('10:00')
  const [cameraActive, setCameraActive] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanMessage, setScanMessage] = useState('')
  const [riskAlerts, setRiskAlerts] = useState<AttendanceRiskAlert[]>([])
  const [riskAlertsError, setRiskAlertsError] = useState('')
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [reportError, setReportError] = useState('')
  const [reportSuccess, setReportSuccess] = useState('')
  const [reportSaving, setReportSaving] = useState(false)
  const [reportAssignment, setReportAssignment] = useState('')
  const [reportDate, setReportDate] = useState(today)
  const [reportStart, setReportStart] = useState('08:00')
  const [reportEnd, setReportEnd] = useState('10:00')
  const [reportReason, setReportReason] = useState('')
  const [adminResponses, setAdminResponses] = useState<Record<number, string>>({})
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null)
  const filteredAbsences = scanClass ? absences.filter((absence) => {
    const student = absence.etudiant_detail
    if (!student || student.classe !== Number(scanClass)) return false
    return !attendanceSearch.trim() || matchesStudentQuery(student, attendanceSearch)
  }) : []
  const [attendancePage, setAttendancePage] = useState(0)
  const attendancePageCount = Math.max(1, Math.ceil(filteredAbsences.length / 30))
  const visibleAbsences = filteredAbsences.slice(attendancePage * 30, attendancePage * 30 + 30)
  const { results: manualCandidates, count: manualCandidateCount, isSearching: isSearchingManual, error: manualSearchError } = useStudentSearch(scanClass, manualStudentQuery, 'actif=true&statut=ENROLLED')

  const registerManualAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!manualStudentId || !scanClass) return
    setManualAttendanceSaving(true)
    setManualAttendanceError('')
    try {
      await api.post('/absences/', { etudiant: Number(manualStudentId), date_absence: scanDate, heure_debut: startTime, heure_fin: endTime, statut: manualStatus })
      setManualStudentId('')
      setManualStudentQuery('')
      onReload()
    } catch (error) {
      setManualAttendanceError(error instanceof Error ? error.message : 'Impossible d’enregistrer ce pointage.')
    } finally {
      setManualAttendanceSaving(false)
    }
  }

  const loadRiskAlerts = useCallback(async () => {
    setRiskAlertsError('')
    try {
      const response = await api.get<{ results: AttendanceRiskAlert[] }>('/absences/risk-alerts/')
      setRiskAlerts(response.results)
    } catch (error) {
      setRiskAlertsError(error instanceof Error ? error.message : 'Impossible de charger les alertes d’assiduité.')
    }
  }, [])

  useEffect(() => {
    void loadRiskAlerts()
  }, [loadRiskAlerts])

  useEffect(() => {
    if (role !== 'PROFESSEUR') return
    let cancelled = false
    api.get<PaginatedResponse<TeacherAssignment>>(`/teacher-assignments/?professeur=${userId}&page_size=500`)
      .then((response) => {
        if (!cancelled) setAssignments(response.results)
      })
      .catch((error) => {
        if (!cancelled) setReportError(error instanceof Error ? error.message : 'Impossible de charger vos affectations.')
      })
    return () => { cancelled = true }
  }, [role, userId])

  const submitUnavailabilityReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReportError('')
    setReportSuccess('')
    setReportSaving(true)
    try {
      await api.post('/teacher-unavailability-reports/', {
        assignment: Number(reportAssignment),
        date: reportDate,
        start_time: reportStart,
        end_time: reportEnd,
        reason: reportReason.trim(),
      })
      setReportReason('')
      setReportSuccess('Votre signalement a été transmis directement à l’administration.')
      onReload()
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Impossible de transmettre le signalement.')
    } finally {
      setReportSaving(false)
    }
  }

  const updateUnavailabilityReport = async (report: TeacherUnavailabilityReport, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setReportError('')
    try {
      setUpdatingReportId(report.id)
      await api.post(`/teacher-unavailability-reports/${report.id}/update-status/`, {
        status,
        admin_response: (adminResponses[report.id] || '').trim(),
      })
      onReload()
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Impossible de mettre à jour le signalement.')
    } finally {
      setUpdatingReportId(null)
    }
  }

  const stopCamera = () => {
    scannerRef.current?.stop()
    scannerRef.current = null
    setCameraActive(false)
  }

  useEffect(() => () => {
    scannerRef.current?.stop()
  }, [])

  const registerScan = async (code: string) => {
    setScanError('')
    setScanMessage('')
    if (!scanClass) {
      setScanError('Choisissez une classe avant le pointage.')
      return
    }
    try {
      const record = await api.post<{ etudiant: number; etudiant_detail: { first_name: string; last_name: string } }>('/absences/scan/', {
        matricule: code.trim(),
        classe: Number(scanClass),
        date_absence: scanDate,
        heure_debut: startTime,
        heure_fin: endTime,
      })
      const student = record.etudiant_detail
      setScanMessage(`${student ? `${student.first_name} ${student.last_name}` : code} : présence enregistrée.`)
      setManualCode('')
      onReload()
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Le pointage a échoué.')
    }
  }

  const startCamera = async () => {
    setScanError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('La caméra nécessite un navigateur compatible et une connexion HTTPS.')
      return
    }
    if (!videoRef.current) return
    try {
      setCameraActive(true)
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _error, control) => {
        const code = result?.getText().trim()
        if (!code) return
        control.stop()
        scannerRef.current = null
        setCameraActive(false)
        setManualCode(code)
        void registerScan(code)
      })
      scannerRef.current = controls
    } catch (error) {
      stopCamera()
      setScanError(error instanceof Error ? error.message : 'Impossible de démarrer la caméra.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Pointage & Assiduité</h2>
        <p className="text-sm text-muted-foreground">{absences.length} pointages · {today_abs.length} aujourd'hui</p>
      </div>
      {(role === 'PROFESSEUR' || role === 'ADMIN') && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Indisponibilité pour un cours</CardTitle>
            <p className="text-sm text-muted-foreground">Les signalements sont transmis directement à l’administration, qui organise le suivi du cours.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {role === 'PROFESSEUR' && (
              <form onSubmit={submitUnavailabilityReport} className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold">Cours concerné
                  <select required value={reportAssignment} onChange={(event) => setReportAssignment(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                    <option value="">Choisir une classe et une matière</option>
                    {assignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.classe_detail.nom} · {assignment.matiere_detail.nom} · {assignment.academic_year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">Date du cours<Input required type="date" min={today} value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></label>
                <label className="grid gap-1.5 text-xs font-semibold">Heure de début<Input required type="time" value={reportStart} onChange={(event) => setReportStart(event.target.value)} /></label>
                <label className="grid gap-1.5 text-xs font-semibold">Heure de fin<Input required type="time" value={reportEnd} onChange={(event) => setReportEnd(event.target.value)} /></label>
                <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Motif<textarea required maxLength={2000} rows={3} value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="rounded-xl border border-border bg-card p-3 text-sm" /></label>
                {reportError && <p className="text-sm text-destructive sm:col-span-2" role="alert">{reportError}</p>}
                {reportSuccess && <p className="text-sm text-emerald-700 sm:col-span-2" role="status">{reportSuccess}</p>}
                <div className="sm:col-span-2"><Button type="submit" disabled={reportSaving || assignments.length === 0}>{reportSaving ? 'Transmission…' : 'Avertir l’administration'}</Button></div>
              </form>
            )}
            {role === 'ADMIN' && reportError && <p className="text-sm text-destructive" role="alert">{reportError}</p>}
            {reports.length === 0
              ? <p className="text-sm text-muted-foreground">{role === 'ADMIN' ? 'Aucun signalement reçu.' : 'Vous n’avez pas encore signalé de cours.'}</p>
              : <div className="space-y-3">
                {reports.map((report) => (
                  <article key={report.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{report.assignment_detail.class_name} · {report.assignment_detail.subject_name}</p>
                        <p className="text-sm text-muted-foreground">{report.teacher_name} · {report.date} · {report.start_time.slice(0, 5)}–{report.end_time.slice(0, 5)}</p>
                        <p className="mt-2 text-sm">{report.reason}</p>
                        {report.admin_response && <p className="mt-2 text-sm text-muted-foreground">Réponse : {report.admin_response}</p>}
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                        {report.status === 'PENDING' ? 'En attente' : report.status === 'ACKNOWLEDGED' ? 'Pris en compte' : 'Traité'}
                      </span>
                    </div>
                    {role === 'ADMIN' && report.status !== 'RESOLVED' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Input aria-label="Réponse à l’enseignant" placeholder="Réponse (facultative)" value={adminResponses[report.id] || ''} onChange={(event) => setAdminResponses((current) => ({ ...current, [report.id]: event.target.value }))} />
                        <Button size="sm" variant="outline" disabled={updatingReportId === report.id} onClick={() => void updateUnavailabilityReport(report, 'ACKNOWLEDGED')}>Pris en compte</Button>
                        <Button size="sm" disabled={updatingReportId === report.id} onClick={() => void updateUnavailabilityReport(report, 'RESOLVED')}>Marquer traité</Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>}
          </CardContent>
        </Card>
      )}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TriangleAlert className="size-5 text-amber-600" />
            Alertes d’absences répétées
            <span className="ml-auto rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700">{riskAlerts.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {riskAlertsError && <p className="text-sm text-destructive" role="alert">{riskAlertsError}</p>}
          {!riskAlertsError && riskAlerts.length === 0 && <p className="text-sm text-muted-foreground">Aucune alerte : aucun élève n’a atteint le seuil de 3 jours d’absence non justifiée sur les 30 derniers jours.</p>}
          {riskAlerts.map((alert) => (
            <article key={alert.student_id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${alert.severity === 'HIGH' ? 'border-rose-300 bg-rose-50/70' : 'border-amber-300 bg-amber-50/70'}`}>
              <div>
                <p className="font-semibold">{alert.student_name} <span className="font-normal text-muted-foreground">· {alert.matricule}</span></p>
                <p className="text-sm text-muted-foreground">{alert.class_name} · {alert.absence_days} jours non justifiés · dernière absence : {alert.latest_absence}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${alert.severity === 'HIGH' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                {alert.severity === 'HIGH' ? 'Prioritaire' : 'À suivre'}
              </span>
            </article>
          ))}
        </CardContent>
      </Card>
      {canScan && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ScanLine className="size-5 text-primary" /> Pointer un élève par QR code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="grid max-w-sm gap-1 text-xs font-medium text-muted-foreground">Classe à pointer<select required value={scanClass} onChange={(event) => { setScanClass(event.target.value); setManualCode('') }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"><option value="">Choisir une classe</option>{classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Date du cours<Input type="date" value={scanDate} onChange={(event) => setScanDate(event.target.value)} /></label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Début<Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">Fin<Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
            </div>
            <video ref={videoRef} muted playsInline className={cameraActive ? 'mx-auto aspect-video w-full max-w-lg rounded-xl bg-black object-cover' : 'hidden'} aria-label="Caméra QR" />
            <div className="flex flex-wrap gap-2">
              {!cameraActive
                ? <Button type="button" onClick={startCamera} className="gap-2"><Camera className="size-4" /> Ouvrir la caméra</Button>
                : <Button type="button" variant="outline" onClick={stopCamera} className="gap-2"><CameraOff className="size-4" /> Arrêter</Button>}
              <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); if (manualCode.trim()) void registerScan(manualCode) }}>
                <Input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Matricule (secours caméra)" aria-label="Matricule de l’élève" />
                <Button type="submit" variant="outline" disabled={!manualCode.trim()}>Pointer</Button>
              </form>
            </div>
            <form onSubmit={registerManualAttendance} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_180px_auto]">
              <div className="grid gap-2">
                <label className="grid gap-1 text-xs font-semibold">Rechercher un eleve de la classe par nom ou matricule
                  <Input value={manualStudentQuery} onChange={(event) => { setManualStudentQuery(event.target.value); setManualStudentId('') }} disabled={!scanClass} placeholder="Nom, prenom ou matricule" />
                </label>
                {manualStudentQuery.trim() && <div className="max-h-32 overflow-y-auto rounded-lg border border-border">
                  {manualCandidates.map((student) => <button key={student.id} type="button" onClick={() => setManualStudentId(String(student.id))} className={`flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted ${manualStudentId === String(student.id) ? 'bg-primary/10' : ''}`}><span>{student.first_name} {student.last_name}</span><span className="text-muted-foreground">{student.matricule}</span></button>)}
                  {isSearchingManual && <p className="px-3 py-2 text-sm text-muted-foreground">Recherche en cours…</p>}
                  {manualSearchError && <p className="px-3 py-2 text-sm text-destructive" role="alert">{manualSearchError}</p>}
                  {!isSearchingManual && !manualSearchError && manualCandidates.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucun eleve trouve dans cette classe.</p>}
                  {manualCandidateCount > manualCandidates.length && <p className="px-3 py-2 text-xs text-muted-foreground">{manualCandidateCount} résultat(s) : affinez la recherche.</p>}
                </div>}
                {manualStudentId && <p className="text-xs text-muted-foreground">Eleve choisi : {manualCandidates.find((student) => student.id === Number(manualStudentId))?.full_name || manualCandidates.find((student) => student.id === Number(manualStudentId))?.matricule}</p>}
              </div>
              <label className="grid content-start gap-1 text-xs font-semibold">Statut<select value={manualStatus} onChange={(event) => setManualStatus(event.target.value as 'ABSENT' | 'LATE')} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="ABSENT">Absent</option><option value="LATE">En retard</option></select></label>
              <div className="flex items-end"><Button type="submit" disabled={!manualStudentId || manualAttendanceSaving}>{manualAttendanceSaving ? 'Enregistrement?' : 'Enregistrer'}</Button></div>
              {manualAttendanceError && <p className="text-sm text-destructive sm:col-span-3" role="alert">{manualAttendanceError}</p>}
            </form>
            {scanMessage && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{scanMessage}</p>}
            {scanError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{scanError}</p>}
            <p className="text-xs text-muted-foreground">La caméra est utilisée uniquement pour décoder le QR dans ce navigateur. Le serveur vérifie votre rôle et l’affectation de classe avant d’enregistrer la présence.</p>
          </CardContent>
        </Card>
      )}
      <div className="mobile-stat-grid grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Présents</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{absences.filter((a) => a.statut === 'PRESENT').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En retard</p><p className="mt-1 text-2xl font-semibold text-amber-600">{absences.filter((a) => a.statut === 'LATE').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Absents</p><p className="mt-1 text-2xl font-semibold text-rose-600">{absences.filter((a) => a.statut === 'ABSENT').length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Pointages par classe</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Classe<select value={scanClass} onChange={(event) => { setScanClass(event.target.value); setAttendancePage(0) }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"><option value="">Choisir une classe</option>{classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">Rechercher par nom ou matricule<Input disabled={!scanClass} value={attendanceSearch} onChange={(event) => { setAttendanceSearch(event.target.value); setAttendancePage(0) }} placeholder="Nom, prénom ou matricule" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="mobile-card-table w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr><th className="px-6 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Élève</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 font-semibold">Créneau</th><th className="px-6 py-3 font-semibold">Source</th></tr>
              </thead>
              <tbody>
                {visibleAbsences.map((a) => {
                  return (
                    <tr key={a.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td data-label="Date" className="px-6 py-3">{a.date_absence}</td>
                      <td data-label="Élève" className="px-4 py-3">{a.etudiant_detail ? `${a.etudiant_detail.first_name} ${a.etudiant_detail.last_name}` : '—'}</td>
                      <td data-label="Statut" className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.statut === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-700' : a.statut === 'LATE' ? 'bg-amber-500/10 text-amber-700' : 'bg-rose-500/10 text-rose-700'}`}>
                          {a.statut}
                        </span>
                      </td>
                      <td data-label="Créneau" className="px-4 py-3 text-xs text-muted-foreground">{a.heure_debut}–{a.heure_fin}</td>
                      <td data-label="Source" className="px-6 py-3 text-xs text-muted-foreground">{a.sync_source}</td>
                    </tr>
                  )
                })}
                {visibleAbsences.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">{scanClass ? 'Aucun pointage correspondant dans cette classe.' : 'Choisissez une classe pour consulter les pointages.'}</td></tr>}
              </tbody>
            </table>
          </div>
          {filteredAbsences.length > 30 && <div className="flex items-center justify-between px-4 py-3"><p className="text-xs text-muted-foreground">{filteredAbsences.length} pointages · page {attendancePage + 1} / {attendancePageCount}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={attendancePage === 0} onClick={() => setAttendancePage((page) => Math.max(0, page - 1))}>Précédent</Button><Button size="sm" variant="outline" disabled={attendancePage >= attendancePageCount - 1} onClick={() => setAttendancePage((page) => Math.min(attendancePageCount - 1, page + 1))}>Suivant</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  )
}

export function BulletinsScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Bulletins & Appréciations</h2>
      <p className="text-sm text-muted-foreground">Génération PDF et appréciations assistées par IA.</p>
      <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Sélectionnez un élève dans l'onglet "Élèves" pour générer son bulletin.</CardContent></Card>
    </div>
  )
}

export function TimetableScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Emploi du temps</h2>
      <p className="text-sm text-muted-foreground">Matrice semaine par classe / professeur.</p>
      <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Module en cours de configuration côté backend.</CardContent></Card>
    </div>
  )
}

type GradeReport = {
  period: { id: number; label: string; code: string; academic_year: string }
  threshold: string
  summary: {
    student_count: number
    subject_class_count: number
    note_count: number
    average: string
    passed_count: number
    pass_rate: string
  }
  results: {
    class_id: number | null
    class_name: string
    subject_id: number
    subject_name: string
    student_count: number
    average: string
    passed_count: number
    pass_rate: string
  }[]
}

export function ReportsScreen({ users, studentCount, classes, matieres, periods }: {
  users: User[]
  studentCount: number
  classes: Classe[]
  matieres: Matiere[]
  periods: ExamPeriod[]
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [threshold, setThreshold] = useState('9.75')
  const [report, setReport] = useState<GradeReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!periods.length) {
      setSelectedPeriod('')
      return
    }
    const latest = [...periods].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
    setSelectedPeriod((current) => periods.some((period) => String(period.id) === current) ? current : String(latest.id))
  }, [periods])

  useEffect(() => {
    if (!selectedPeriod) {
      setReport(null)
      return
    }
    let cancelled = false
    setReport(null)
    setLoading(true)
    setError('')
    api.get<GradeReport>(`/notes/reports/?exam_period=${encodeURIComponent(selectedPeriod)}&threshold=${encodeURIComponent(threshold)}`)
      .then((result) => { if (!cancelled) setReport(result) })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le rapport des résultats.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedPeriod, threshold])

  const exportCsv = () => {
    if (!report) return
    const rows = [
      ['Période', report.period.label, 'Année scolaire', report.period.academic_year, 'Seuil', report.threshold],
      ['Classe', 'Matière', 'Élèves notés', 'Moyenne pondérée', 'Admis', 'Taux de réussite (%)'],
      ...report.results.map((row) => [
        row.class_name,
        row.subject_name,
        row.student_count,
        row.average,
        row.passed_count,
        row.pass_rate,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `rapport-resultats-${report.period.code}-${report.period.academic_year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Rapports & Pilotage</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Élèves actifs</p><p className="mt-1 text-2xl font-semibold">{studentCount}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Enseignants actifs</p><p className="mt-1 text-2xl font-semibold">{users.filter((user) => user.role === 'PROFESSEUR' && user.status === 'ACTIVE').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Classes</p><p className="mt-1 text-2xl font-semibold">{classes.length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Matières</p><p className="mt-1 text-2xl font-semibold">{matieres.length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Résultats par classe et matière</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-56 gap-1.5 text-xs font-semibold">Période d’examen
              <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm" disabled={!periods.length}>
                {periods.length === 0 && <option value="">Aucune période configurée</option>}
                {[...periods].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((period) => (
                  <option key={period.id} value={period.id}>{period.label} — {period.academic_year}</option>
                ))}
              </select>
            </label>
            <label className="grid w-36 gap-1.5 text-xs font-semibold">Seuil d’admission
              <Input type="number" min="0" max="20" step="0.25" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
            </label>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!report || loading}>Exporter CSV</Button>
          </div>
          <p className="text-xs text-muted-foreground">Calcul basé uniquement sur les notes validées ou verrouillées. Le taux de réussite utilise le seuil sélectionné.</p>
          {!periods.length && <p className="text-sm text-muted-foreground">Configurez d’abord une période d’examen pour consulter les résultats.</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {loading && <p className="py-6 text-center text-sm text-muted-foreground">Calcul du rapport…</p>}
          {!loading && report && (
            <>
              <div className="mobile-stat-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Élèves évalués</p><p className="mt-1 text-xl font-semibold">{report.summary.student_count}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Moyenne générale</p><p className="mt-1 text-xl font-semibold">{report.summary.average}/20</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Taux de réussite</p><p className="mt-1 text-xl font-semibold">{report.summary.pass_rate}%</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Notes au-dessus du seuil</p><p className="mt-1 text-xl font-semibold">{report.summary.passed_count}/{report.summary.note_count}</p></CardContent></Card>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="mobile-card-table w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Classe</th>
                      <th className="px-4 py-3">Matière</th>
                      <th className="px-4 py-3 text-right">Élèves</th>
                      <th className="px-4 py-3 text-right">Moyenne</th>
                      <th className="px-4 py-3 text-right">Admis</th>
                      <th className="px-4 py-3 text-right">Réussite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((row) => (
                      <tr key={`${row.class_id ?? 'none'}-${row.subject_id}`} className="border-t border-border">
                        <td data-label="Classe" className="px-4 py-3 font-medium">{row.class_name}</td>
                        <td data-label="Matière" className="px-4 py-3">{row.subject_name}</td>
                        <td data-label="Élèves" className="px-4 py-3 text-right">{row.student_count}</td>
                        <td data-label="Moyenne" className="px-4 py-3 text-right">{row.average}/20</td>
                        <td data-label="Admis" className="px-4 py-3 text-right">{row.passed_count}/{row.student_count}</td>
                        <td data-label="Réussite" className="px-4 py-3 text-right">{row.pass_rate}%</td>
                      </tr>
                    ))}
                    {report.results.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucune note validée pour cette période.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AuditScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Journal d'audit</h2>
      <p className="text-sm text-muted-foreground">Traçabilité des actions sensibles (notes, paiements, statuts).</p>
      <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Module visible côté Admin uniquement.</CardContent></Card>
    </div>
  )
}

export function ChatScreen() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Messagerie</h2>
      <p className="text-sm text-muted-foreground">Chat inter-enseignants (groupes de matière, classes, annonces Admin).</p>
      <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Module mobile prioritaire — voir l'application Expo.</CardContent></Card>
    </div>
  )
}
