'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, UsersRound } from 'lucide-react'
import { api, type Etudiant, type Enrollment, type Classe } from '@/lib/api'
import { initials, formatCurrency } from '@/lib/admin-data'

export function EnrollmentRegistryScreen({ enrollments, etudiants, classes }: {
  enrollments: Enrollment[]
  etudiants: Etudiant[]
  classes: Classe[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Inscriptions scolaires</h2>
        <p className="text-sm text-muted-foreground">{enrollments.length} dossiers d’inscription enregistrés.</p>
      </div>
      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader><CardTitle className="text-base">Dossiers élèves</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="mobile-card-table w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Élève</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Classe</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Année scolaire</th>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Dossier</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => {
                  const student = etudiants.find((item) => item.id === enrollment.student)
                  const classe = classes.find((item) => item.id === enrollment.classe)
                  return (
                    <tr key={enrollment.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25">
                      <td data-label="Élève" className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {student ? initials(`${student.first_name} ${student.last_name}`) : '?'}
                          </span>
                          <span>
                            <strong className="block font-semibold">{student ? `${student.first_name} ${student.last_name}` : '—'}</strong>
                            <small className="text-xs text-muted-foreground">{student?.matricule || '—'}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Classe" className="px-3 py-3 text-muted-foreground sm:px-4 sm:py-4">{classe?.nom || '—'}</td>
                      <td data-label="Année scolaire" className="px-3 py-3 sm:px-4 sm:py-4">{enrollment.academic_year}</td>
                      <td data-label="Dossier" className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Inscrit</span>
                      </td>
                    </tr>
                  )
                })}
                {enrollments.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun dossier d’inscription.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mx-5 mt-3 rounded-xl bg-secondary px-4 py-3 text-xs leading-5 text-secondary-foreground">
            Cette liste concerne uniquement l’inscription scolaire. Les frais et règlements sont gérés séparément par l’administration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function EnrollmentsScreen({ enrollments, etudiants, classes, canManagePayments = false, onReload }: {
  enrollments: Enrollment[]
  etudiants: Etudiant[]
  classes: Classe[]
  canManagePayments?: boolean
  onReload: () => void
}) {
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL')
  const [page, setPage] = useState(0)
  const [paymentEnrollment, setPaymentEnrollment] = useState<Enrollment | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const filtered = useMemo(
    () => enrollments.filter((e) => filter === 'ALL' || e.payment_status === filter),
    [enrollments, filter]
  )
  const pageSize = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const stats = useMemo(() => {
    const total = enrollments.reduce((sum, e) => sum + Number(e.frais_total || 0), 0)
    const verse = enrollments.reduce((sum, e) => sum + Number(e.frais_verses || 0), 0)
    return {
      count: enrollments.length,
      total,
      verse,
      reste: total - verse,
      paid: enrollments.filter((e) => e.payment_status === 'PAID').length,
      partial: enrollments.filter((e) => e.payment_status === 'PARTIAL').length,
      unpaid: enrollments.filter((e) => e.payment_status === 'UNPAID').length,
    }
  }, [enrollments])

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PAID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      PARTIAL: 'bg-amber-500/10 text-amber-700',
      UNPAID: 'bg-rose-500/10 text-rose-700',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  const recordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!paymentEnrollment) return
    setPaymentSaving(true)
    setPaymentError('')
    try {
      await api.post(`/enrollments/${paymentEnrollment.id}/confirm-payment/`, { amount: paymentAmount })
      setPaymentEnrollment(null)
      setPaymentAmount('')
      onReload()
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Impossible d’enregistrer ce paiement.')
    } finally {
      setPaymentSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Inscriptions & Paiements</h2>
        <p className="text-sm text-muted-foreground">{stats.count} dossiers · {formatCurrency(stats.verse)} sur {formatCurrency(stats.total)}</p>
      </div>

      <div className="mobile-stat-grid grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Encaissé</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(stats.verse)}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Reste à payer</p><p className="mt-1 text-2xl font-semibold text-rose-600">{formatCurrency(stats.reste)}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Payé / Partiel / Impayé</p><p className="mt-1 text-lg font-semibold">{stats.paid} · {stats.partial} · {stats.unpaid}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PAID', 'PARTIAL', 'UNPAID'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => { setFilter(f); setPage(0) }}>
            {f === 'ALL' ? 'Tous' : f}
          </Button>
        ))}
      </div>

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader><CardTitle className="text-base">Dossiers d'inscription</CardTitle></CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="mobile-card-table w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 sm:px-6 font-semibold">Élève</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Classe</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Année</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold">Statut</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold hidden md:table-cell">Reçu</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold text-right">Total</th>
                  <th className="px-3 py-3 sm:px-4 font-semibold text-right">Versé</th>
                  <th className="px-3 py-3 sm:px-6 text-right font-semibold">Reste</th>
                  {canManagePayments && <th className="px-3 py-3 sm:px-4 font-semibold">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((en) => {
                  const etudiant = etudiants.find((e) => e.id === en.student)
                  const classe = classes.find((c) => c.id === en.classe)
                  const reste = en.reste_a_payer ?? (Number(en.frais_total || 0) - Number(en.frais_verses || 0))
                  return (
                    <tr key={en.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td data-label="Élève" className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {etudiant ? initials(`${etudiant.first_name} ${etudiant.last_name}`) : '?'}
                          </div>
                          <div>
                            <p className="font-semibold">{etudiant ? `${etudiant.first_name} ${etudiant.last_name}` : '—'}</p>
                            <p className="text-xs text-muted-foreground">{etudiant?.matricule || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td data-label="Classe" className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{classe?.nom || '—'}</td>
                      <td data-label="Année" className="px-3 py-3 sm:px-4 sm:py-4">{en.academic_year}</td>
                      <td data-label="Statut" className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(en.payment_status)}`}>
                          {en.payment_status}
                        </span>
                      </td>
                      <td data-label="Reçu" className="px-3 py-3 sm:px-4 sm:py-4 hidden md:table-cell font-mono text-xs">{en.receipt_number || '—'}</td>
                      <td data-label="Total" className="px-3 py-3 sm:px-4 sm:py-4 text-right">{formatCurrency(en.frais_total, en.devise)}</td>
                      <td data-label="Versé" className="px-3 py-3 sm:px-4 sm:py-4 text-right">{formatCurrency(en.frais_verses, en.devise)}</td>
                      <td data-label="Reste" className="px-3 py-3 sm:px-6 sm:py-4 text-right font-semibold text-rose-600">{formatCurrency(reste, en.devise)}</td>
                      {canManagePayments && <td data-label="Action" className="px-3 py-3 sm:px-4 sm:py-4">{reste > 0 && <Button size="sm" variant="outline" onClick={() => { setPaymentEnrollment(en); setPaymentAmount(String(reste)); setPaymentError('') }}>Encaisser</Button>}</td>}
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={canManagePayments ? 9 : 8} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun dossier.</td></tr>
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
      {paymentEnrollment && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Enregistrer un paiement">
        <form onSubmit={recordPayment} className="w-full max-w-md space-y-4 rounded-2xl bg-background p-5 shadow-xl">
          <div><h3 className="font-semibold">Enregistrer un paiement</h3><p className="mt-1 text-sm text-muted-foreground">{etudiants.find((item) => item.id === paymentEnrollment.student)?.full_name || paymentEnrollment.receipt_number}</p><p className="text-sm text-muted-foreground">Reste à payer : {formatCurrency(paymentEnrollment.reste_a_payer, paymentEnrollment.devise)}</p></div>
          <label className="grid gap-1.5 text-xs font-semibold">Montant reçu ({paymentEnrollment.devise})<Input required type="number" min="0.01" max={paymentEnrollment.reste_a_payer ?? undefined} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
          {paymentError && <p className="text-sm text-destructive" role="alert">{paymentError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPaymentEnrollment(null)}>Annuler</Button><Button type="submit" disabled={paymentSaving}>{paymentSaving ? 'Enregistrement…' : 'Confirmer'}</Button></div>
        </form>
      </div>}
    </div>
  )
}
