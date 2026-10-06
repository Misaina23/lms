'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Printer, TicketCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, type Etudiant, type StudentOfficePass } from '@/lib/api'

const kinds: Record<StudentOfficePass['kind'], string> = {
  CONVOCATION: 'Convocation au bureau',
  ENTRY: 'Billet d’entrée',
  RETURN: 'Autorisation de retour en classe',
}

export function OfficePassesScreen({ students, records, role, onReload }: {
  students: Etudiant[]
  records: StudentOfficePass[]
  role: string
  onReload: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [kind, setKind] = useState<StudentOfficePass['kind']>('CONVOCATION')
  const [reason, setReason] = useState('')
  const [destination, setDestination] = useState('Bureau de vie scolaire')
  const [scheduledFor, setScheduledFor] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState<StudentOfficePass | null>(null)
  const canIssue = role === 'ADMIN' || role === 'SURVEILLANT' || role === 'SECRETARIAT'

  const issuePass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/office-passes/', {
        student: Number(studentId),
        kind,
        reason,
        destination,
        scheduled_for: scheduledFor || null,
      })
      setReason('')
      setScheduledFor('')
      onReload()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de créer le billet.')
    } finally {
      setSaving(false)
    }
  }

  const markUsed = async (record: StudentOfficePass) => {
    setError('')
    try {
      await api.post(`/office-passes/${record.id}/mark-used/`, {})
      onReload()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Impossible de clôturer ce billet.')
    }
  }

  const student = printing?.student_detail

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Secrétariat et vie scolaire</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight">Convocations et billets élèves</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Créez une convocation, un billet d’entrée ou une autorisation de retour en classe. Chaque émission et clôture est journalisée.</p>
      </div>

      {canIssue && (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TicketCheck className="size-5 text-primary" /> Émettre un document</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={issuePass} className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold">Élève
                <select required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                  <option value="">Sélectionner un élève</option>
                  {students.filter((item) => item.actif).map((item) => <option key={item.id} value={item.id}>{item.last_name} {item.first_name} — {item.matricule}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">Type de document
                <select value={kind} onChange={(event) => setKind(event.target.value as StudentOfficePass['kind'])} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
                  {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">Motif<textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-xl border border-border bg-card p-3 text-sm" /></label>
              <div className="grid content-start gap-4">
                <label className="grid gap-1.5 text-xs font-semibold">Destination<Input required maxLength={120} value={destination} onChange={(event) => setDestination(event.target.value)} /></label>
                <label className="grid gap-1.5 text-xs font-semibold">Date et heure (facultatif)<Input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>
              </div>
              {error && <p className="sm:col-span-2 text-sm text-destructive" role="alert">{error}</p>}
              <div className="sm:col-span-2 flex justify-end"><Button type="submit" disabled={saving || students.length === 0}>{saving ? 'Enregistrement…' : 'Créer le billet'}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Documents récents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {error && !canIssue && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {records.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucune convocation ou billet émis.</p>}
          {records.map((record) => (
            <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="min-w-0">
                <p className="font-semibold">{record.student_detail.full_name} · {kinds[record.kind]}</p>
                <p className="mt-1 text-xs text-muted-foreground">Réf. {record.reference} · {record.destination} · {record.status}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{record.reason}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPrinting(record)} className="gap-1"><Printer className="size-4" /> Imprimer</Button>
                {canIssue && record.status === 'OPEN' && <Button size="sm" onClick={() => void markUsed(record)} className="gap-1"><CheckCircle2 className="size-4" /> Clôturer</Button>}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      {printing && student && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Impression du billet">
          <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-xl">
            <div className="print-office-pass rounded-xl border-2 border-primary/30 bg-white p-6 text-[#0a1e2c]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={96} height={46} className="h-11 w-20 shrink-0 object-contain" />
                  <div><p className="font-bold">Lycée Midongy Sud</p><p className="text-xs text-slate-500">Vie scolaire</p></div>
                </div>
                <Image src="/drapeau.jpeg" alt="Emblème LMS" width={78} height={44} className="h-10 w-auto object-contain" />
              </div>
              <p className="mt-5 text-center text-xs font-bold uppercase tracking-[.18em] text-primary">Réf. {printing.reference}</p>
              <h3 className="mt-2 text-center font-display text-xl font-extrabold">{kinds[printing.kind]}</h3>
              <p className="mt-5"><strong>Élève :</strong> {student.first_name} {student.last_name} ({student.matricule})</p>
              <p className="mt-2"><strong>Classe :</strong> {student.classe_detail?.nom || '—'}</p>
              <p className="mt-2"><strong>Destination :</strong> {printing.destination}</p>
              {printing.scheduled_for && <p className="mt-2"><strong>Date :</strong> {new Date(printing.scheduled_for).toLocaleString('fr-FR')}</p>}
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm"><strong>Motif :</strong> {printing.reason}</p>
              <p className="mt-8 text-right text-xs text-slate-500">Émis le {new Date(printing.created_at).toLocaleString('fr-FR')} · {printing.issued_by_name}</p>
              <div className="mt-8 flex justify-between text-xs"><span>Signature vie scolaire : __________________</span><span>Signature élève : __________________</span></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPrinting(null)}>Fermer</Button>
              <Button onClick={() => window.print()} className="gap-2"><Printer className="size-4" /> Imprimer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
