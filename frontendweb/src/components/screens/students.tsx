'use client'

import { useState, useMemo } from 'react'
import { Search, CheckCircle2, UserPlus, Upload, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { User, Etudiant, Classe } from '@/lib/api'
import { useFilteredStudents, initials, formatCurrency } from '@/lib/admin-data'

export function StudentsScreen({ users, etudiants, classes, onReload }: {
  users: User[]
  etudiants: Etudiant[]
  classes: Classe[]
  onReload: () => void
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const filtered = useFilteredStudents(etudiants, users, query)
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

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
          <h2 className="text-2xl font-semibold tracking-tight">Élèves</h2>
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
          <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-1"><UserPlus className="size-4" /> Ajouter</Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline" size="sm" className="gap-1"><Upload className="size-4" /> Importer Excel</Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Nouvel élève</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="size-4" /></Button>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); alert('Formulaire élève: à connecter au backend'); }}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nom</label>
                <Input required placeholder="Nom" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Prénom</label>
                <Input required placeholder="Prénom" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input type="email" required placeholder="email@exemple.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
                <Input placeholder="+261 34 00 000 00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classe</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none">
                  <option value="">Sélectionner...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.nom} — {c.niveau}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Statut</label>
                <select className="h-9 w-full rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none">
                  <option value="ENROLLED">ENROLLED</option>
                  <option value="APPLICANT">APPLICANT</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showImportModal && (
        <Card className="border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Importer des élèves (Excel/CSV)</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)}><X className="size-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Déposez votre fichier Excel/CSV ici</p>
              <p className="text-xs text-muted-foreground">Colonnes attendues : nom, prénom, email, classe, statut</p>
              <Input type="file" accept=".xlsx,.xls,.csv" className="mt-3 mx-auto w-full max-w-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Annuler</Button>
              <Button onClick={() => { alert('Importation: à connecter au backend'); setShowImportModal(false); }}>Importer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80">
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
                  <th className="px-3 py-3 sm:px-4 font-semibold hidden md:table-cell">Moyenne</th>
                  <th className="px-3 py-3 sm:px-6 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((etudiant) => {
                  const user = users.find((u) => u.id === etudiant.user)
                  const classe = classes.find((c) => c.id === etudiant.classe)
                  return (
                    <tr key={etudiant.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/25">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {user ? initials(`${user.first_name} ${user.last_name}`) : '?'}
                          </div>
                          <div>
                            <p className="font-semibold">{user ? `${user.first_name} ${user.last_name}` : '—'}</p>
                            <p className="text-xs text-muted-foreground">{user?.matricule || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{classe?.nom || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statutBadge(etudiant.statut)}`}>
                          {etudiant.statut}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4 hidden md:table-cell font-semibold">
                        {etudiant.moyenne_generale != null ? `${etudiant.moyenne_generale}/20` : '—'}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        <Button variant="ghost" size="sm">Voir</Button>
                      </td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun élève trouvé.</td></tr>
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
    </div>
  )
}
