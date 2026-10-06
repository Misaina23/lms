'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Search, CheckCircle2, UserPlus, X, UsersRound, Printer, IdCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api, type Etudiant, type Classe } from '@/lib/api'
import { useFilteredStudents, initials } from '@/lib/admin-data'

export function StudentsScreen({ etudiants, classes, onReload, canManage = true, showGrades = true }: {
  etudiants: Etudiant[]
  classes: Classe[]
  onReload: () => void
  canManage?: boolean
  showGrades?: boolean
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [cardStudent, setCardStudent] = useState<Etudiant | null>(null)
  const [cardQr, setCardQr] = useState('')
  const [form, setForm] = useState({
    matricule: '',
    first_name: '',
    last_name: '',
    email_parent: '',
    phone_parent: '',
    classe: '',
    date_inscription: new Date().toISOString().slice(0, 10),
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  })
  const filtered = useFilteredStudents(etudiants, query)
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  useEffect(() => {
    let cancelled = false
    if (!cardStudent) {
      setCardQr('')
      return
    }
    QRCode.toDataURL(cardStudent.matricule, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
      .then((dataUrl) => {
        if (!cancelled) setCardQr(dataUrl)
      })
      .catch((error: unknown) => {
        console.error('Unable to generate student QR card', error)
        if (!cancelled) setFormError('Impossible de générer le QR code de cette carte.')
      })
    return () => { cancelled = true }
  }, [cardStudent])

  const submitRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await api.post('/etudiants/register/', {
        ...form,
        classe: form.classe ? Number(form.classe) : null,
      })
      setShowAddForm(false)
      setForm({
        matricule: '',
        first_name: '',
        last_name: '',
        email_parent: '',
        phone_parent: '',
        classe: '',
        date_inscription: new Date().toISOString().slice(0, 10),
        academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      })
      onReload()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer le dossier.')
    } finally {
      setSaving(false)
    }
  }

  const statutBadge = (s: string) => {
    const map: Record<string, string> = {
      ENROLLED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      APPLICANT: 'bg-amber-500/10 text-amber-700',
      SUSPENDED: 'bg-rose-500/10 text-rose-700',
      GRADUATED: 'bg-sky-500/10 text-sky-700',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Élèves</h2>
          <p className="text-sm text-muted-foreground">{etudiants.length} élèves inscrits · {classes.length} classes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              placeholder="Rechercher un élève..."
              className="h-10 w-56 pl-9"
            />
          </div>
          <Button onClick={onReload} variant="outline" size="sm">Actualiser</Button>
          {canManage && <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-1"><UserPlus className="size-4" /> Inscrire un élève</Button>}
        </div>
      </div>

      {showAddForm && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Nouvel élève</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} aria-label="Fermer le formulaire"><X className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitRegistration}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Matricule</label>
                <Input required value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nom</label>
                <Input required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} placeholder="Nom" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Prénom</label>
                <Input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} placeholder="Prénom" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">E-mail du responsable</label>
                <Input type="email" value={form.email_parent} onChange={(event) => setForm({ ...form, email_parent: event.target.value })} placeholder="famille@exemple.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Téléphone du responsable</label>
                <Input value={form.phone_parent} onChange={(event) => setForm({ ...form, phone_parent: event.target.value })} placeholder="+261 34 00 000 00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classe</label>
                <select required value={form.classe} onChange={(event) => setForm({ ...form, classe: event.target.value })} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none">
                  <option value="">Choisir une classe</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nom} — {c.niveau}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date d’inscription</label>
                <Input required type="date" value={form.date_inscription} onChange={(event) => setForm({ ...form, date_inscription: event.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Année scolaire</label>
                <Input required maxLength={9} value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} placeholder="2026-2027" />
              </div>
              <p className="sm:col-span-2 rounded-xl bg-secondary px-4 py-3 text-xs leading-5 text-secondary-foreground">L’inscription de l’élève est enregistrée sans paiement préalable. Les règlements relèvent d’un module distinct.</p>
              {formError && <p className="sm:col-span-2 text-sm text-destructive" role="alert">{formError}</p>}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Annuler</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer l’inscription'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Liste des élèves</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} résultats</p>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Élève</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Classe</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Statut</th>
                  {showGrades && <th className="px-3 py-3 sm:px-4 font-semibold hidden md:table-cell">Moyenne</th>}
                  <th className="px-3 py-3 sm:px-6 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((etudiant) => {
                  const classe = classes.find((c) => c.id === etudiant.classe)
                  return (
                    <tr key={etudiant.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/25">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initials(`${etudiant.first_name} ${etudiant.last_name}`)}
                          </div>
                          <div>
                            <p className="font-semibold">{etudiant.first_name} {etudiant.last_name}</p>
                            <p className="text-xs text-muted-foreground">{etudiant.matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{classe?.nom || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statutBadge(etudiant.statut)}`}>
                          {etudiant.statut}
                        </span>
                      </td>
                      {showGrades && <td className="px-3 py-3 sm:px-4 sm:py-4 hidden md:table-cell font-semibold">
                        {etudiant.moyenne_generale != null ? `${etudiant.moyenne_generale}/20` : '—'}
                      </td>}
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        {canManage && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setCardStudent(etudiant)}>
                            <IdCard className="size-4" /> Carte
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={showGrades ? 5 : 4} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun élève trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {safePage + 1} / {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Suivant</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {cardStudent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Carte scolaire">
          <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Carte scolaire</h3>
              <Button variant="ghost" size="icon" onClick={() => setCardStudent(null)} aria-label="Fermer"><X className="size-4" /></Button>
            </div>
            <div className="print-student-card mx-auto flex max-w-sm items-center gap-4 rounded-xl border-2 border-primary/30 bg-white p-4 text-[#0a1e2c]">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={64} height={32} className="h-7 w-14 shrink-0 object-contain" />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide">Lycée Midongy Sud</p>
                    <p className="text-[9px] text-slate-500">Carte d’élève</p>
                  </div>
                </div>
                <p className="truncate font-bold">{cardStudent.first_name} {cardStudent.last_name}</p>
                <p className="mt-1 text-xs text-slate-600">Matricule : {cardStudent.matricule}</p>
                <p className="mt-1 text-xs text-slate-600">Classe : {classes.find((c) => c.id === cardStudent.classe)?.nom || '—'}</p>
              </div>
              {cardQr
                ? <img src={cardQr} alt={`QR code ${cardStudent.matricule}`} className="size-24 shrink-0" />
                : <div className="size-24 shrink-0 animate-pulse rounded bg-slate-100" aria-label="Génération du QR code" />}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Le QR code contient le matricule de l’élève et sert au pointage par un membre autorisé.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCardStudent(null)}>Fermer</Button>
              <Button onClick={() => window.print()} disabled={!cardQr} className="gap-2"><Printer className="size-4" /> Imprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
