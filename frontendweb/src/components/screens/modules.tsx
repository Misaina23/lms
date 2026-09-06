'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, Plus, Pencil, Trash2, UserPlus, ChevronRight, BookOpen, GraduationCap, UsersRound, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type User, type Classe, type Matiere, type Etudiant, type Note, type ExamPeriod } from '@/lib/api'
import { initials } from '@/lib/admin-data'

export function TeachersScreen({ users, etudiants, notes, matieres, periods, onReload }: {
  users: User[]
  etudiants: any[]
  notes: any[]
  matieres: Matiere[]
  periods: any[]
  onReload: () => void
}) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', matricule: '', teacher_type: 'FONCTIONNAIRE' as 'FONCTIONNAIRE' | 'SUPPLEANT', phone: '' })
  const [saving, setSaving] = useState(false)

  const teachers = users.filter((u) => u.role === 'PROFESSEUR')
  const filtered = teachers.filter((t) => {
    const q = query.toLowerCase()
    return t.first_name.toLowerCase().includes(q) || t.last_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ first_name: '', last_name: '', email: '', matricule: '', teacher_type: 'FONCTIONNAIRE', phone: '' })
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
      teacher_type: (teacher.teacher_type as 'FONCTIONNAIRE' | 'SUPPLEANT') || 'FONCTIONNAIRE',
      phone: teacher.phone || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingTeacher) {
        await api.patch(`/users/${editingTeacher.id}/`, form)
      } else {
        await api.post('/users/', { ...form, role: 'PROFESSEUR', status: 'PENDING_VERIFICATION' })
      }
      onReload()
      resetForm()
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Supprimer cet enseignant ?')) return
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
      } else if (status === 'REJECTED' || status === 'SUSPENDED') {
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
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Enseignants</h2>
          <p className="text-sm text-muted-foreground">{teachers.length} enseignants · {teachers.filter((t) => t.status === 'ACTIVE').length} actifs · {teachers.filter((t) => t.status === 'PENDING_VERIFICATION').length} en attente</p>
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
            <CardTitle className="text-base">{editingTeacher ? 'Modifier enseignant' : 'Nouvel enseignant'}</CardTitle>
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
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none" value={form.teacher_type} onChange={(e) => setForm({ ...form, teacher_type: e.target.value as any })}>
                  <option value="FONCTIONNAIRE">Fonctionnaire</option>
                  <option value="SUPPLEANT">Suppléant</option>
                </select>
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
        {filtered.map((teacher) => {
          const notesCount = notes.filter((n) => n.professeur === teacher.id).length
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
                    <p className="mt-1 text-xs text-muted-foreground">{teacher.matricule} · {teacher.teacher_type || '—'}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(teacher.status)}`}>
                    {teacher.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{notesCount} notes</span>
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
            <p className="text-sm text-muted-foreground">Aucun enseignant trouvé.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function ClassesScreen({ classes, etudiants, onReload }: { classes: any[]; etudiants: any[]; onReload: () => void }) {
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
          <p className="text-sm text-muted-foreground">{classes.length} classes · {etudiants.filter((e) => e.actif).length} élèves actifs</p>
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
          const effectif = etudiants.filter((e) => e.classe === classe.id && e.actif).length
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

export function MatieresScreen({ matieres, classes, onReload }: { matieres: Matiere[]; classes: any[]; onReload: () => void }) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null)
  const [form, setForm] = useState({ nom: '', code: '', description: '', coefficient: 1, classe: '' })
  const [saving, setSaving] = useState(false)

  const filtered = matieres.filter((m) => {
    const q = query.toLowerCase()
    return m.nom.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
  })

  const resetForm = () => {
    setForm({ nom: '', code: '', description: '', coefficient: 1, classe: '' })
    setEditingMatiere(null)
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (matiere: Matiere) => {
    setEditingMatiere(matiere)
    setForm({ nom: matiere.nom, code: matiere.code, description: matiere.description || '', coefficient: matiere.coefficient, classe: '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (payload.classe) {
        payload.classe = Number(payload.classe)
      } else {
        delete payload.classe
      }
      if (editingMatiere) {
        await api.patch(`/matieres/${editingMatiere.id}/`, payload)
      } else {
        await api.post('/matieres/', payload)
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
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classe</label>
                <select
                  value={form.classe}
                  onChange={(e) => setForm({ ...form, classe: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
                >
                  <option value="">Aucune (coefficient global)</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nom} - {c.niveau} {c.stream || ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Coefficient</label>
                <Input type="number" value={form.coefficient.toString()} onChange={(e) => setForm({ ...form, coefficient: parseFloat(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Option..." />
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
        {filtered.map((matiere) => (
          <Card key={matiere.id} className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{matiere.nom}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{matiere.code} · Coef. {matiere.coefficient}</p>
                  {matiere.description && <p className="mt-1 text-xs text-muted-foreground">{matiere.description}</p>}
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
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Notes & Évaluations</h2>
        <p className="text-sm text-muted-foreground">{notes.length} notes · {periods.length} périodes d'examen configurées</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Moyenne générale</p><p className="mt-1 text-2xl font-semibold">{notes.length ? (notes.reduce((s, n) => s + Number(n.note), 0) / notes.length).toFixed(2) : '—'}/20</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Notes verrouillées</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'LOCKED').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En brouillon</p><p className="mt-1 text-2xl font-semibold">{notes.filter((n) => n.status === 'DRAFT').length}</p></CardContent></Card>
      </div>

      <Card className="rounded-2xl">
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
                      <td className="px-3 py-3 sm:px-6 sm:py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${n.status === 'LOCKED' ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-700'}`}>{n.status}</span></td>
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
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Pointage & Assiduité</h2>
        <p className="text-sm text-muted-foreground">{absences.length} pointages · {today_abs.length} aujourd'hui</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Présents</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{absences.filter((a) => a.statut === 'PRESENT').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">En retard</p><p className="mt-1 text-2xl font-semibold text-amber-600">{absences.filter((a) => a.statut === 'LATE').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Absents</p><p className="mt-1 text-2xl font-semibold text-rose-600">{absences.filter((a) => a.statut === 'ABSENT').length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl">
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.statut === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-700' : a.statut === 'LATE' ? 'bg-amber-500/10 text-amber-700' : 'bg-rose-500/10 text-rose-700'}`}>
                          {a.statut}
                        </span>
                      </td>
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

export function ReportsScreen({ users, etudiants, classes, matieres, notes }: { users: User[]; etudiants: Etudiant[]; classes: any[]; matieres: Matiere[]; notes: Note[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">Rapports & Pilotage</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Élèves</p><p className="mt-1 text-2xl font-semibold">{etudiants.filter((e) => e.actif).length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Enseignants actifs</p><p className="mt-1 text-2xl font-semibold">{users.filter((u) => u.role === 'PROFESSEUR' && u.status === 'ACTIVE').length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Classes</p><p className="mt-1 text-2xl font-semibold">{classes.length}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Matières</p><p className="mt-1 text-2xl font-semibold">{matieres.length}</p></CardContent></Card>
      </div>
      <Card className="rounded-2xl"><CardContent className="p-8 text-center text-muted-foreground">Exports PDF / Excel disponibles dans une prochaine version.</CardContent></Card>
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
