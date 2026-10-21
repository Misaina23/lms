'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Search, CheckCircle2, UserPlus, X, UsersRound, Printer, IdCard, ArrowRightLeft, History, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api, type Etudiant, type Classe, type CertificateRequest, type PaginatedResponse, type StudentClassHistory, type StudentTransferRequest } from '@/lib/api'
import { initials, useStudentDirectory, useStudentSearch } from '@/lib/admin-data'

export function StudentsScreen({ classes, onReload, canManage = true, canReviewTransfers = false, canManageCertificates = false, showGrades = true }: {
  classes: Classe[]
  onReload: () => void
  canManage?: boolean
  canReviewTransfers?: boolean
  canManageCertificates?: boolean
  showGrades?: boolean
}) {
  const [query, setQuery] = useState('')
  const [directoryClass, setDirectoryClass] = useState('')
  const [page, setPage] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [cardStudent, setCardStudent] = useState<Etudiant | null>(null)
  const [cardQr, setCardQr] = useState('')
  const [transferStudent, setTransferStudent] = useState<Etudiant | null>(null)
  const [transferTargetClass, setTransferTargetClass] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferRequests, setTransferRequests] = useState<StudentTransferRequest[]>([])
  const [transferRequestsLoading, setTransferRequestsLoading] = useState(false)
  const [transferRequestsError, setTransferRequestsError] = useState('')
  const [studentHistory, setStudentHistory] = useState<StudentClassHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [decisionRequest, setDecisionRequest] = useState<StudentTransferRequest | null>(null)
  const [decisionStatus, setDecisionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
  const [decisionReason, setDecisionReason] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const [decisionSaving, setDecisionSaving] = useState(false)
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([])
  const [certificateLoading, setCertificateLoading] = useState(false)
  const [certificateError, setCertificateError] = useState('')
  const [certificateClass, setCertificateClass] = useState('')
  const [certificateStudent, setCertificateStudent] = useState('')
  const [certificateStudentSearch, setCertificateStudentSearch] = useState('')
  const [certificateYear, setCertificateYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`)
  const [certificateSaving, setCertificateSaving] = useState(false)
  const [certificateDecisionReasons, setCertificateDecisionReasons] = useState<Record<number, string>>({})
  const [certificateNegotiations, setCertificateNegotiations] = useState<Record<number, boolean>>({})
  const [certificateDownloading, setCertificateDownloading] = useState<number | null>(null)
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
  const pageSize = 20
  const { results: pageItems, count: studentCount, isLoading: directoryLoading, error: directoryError } = useStudentDirectory(directoryClass, query, page, pageSize)
  const { results: certificateCandidates, count: certificateCandidateCount, isSearching: isSearchingCertificateStudent, error: certificateSearchError } = useStudentSearch(certificateClass, certificateStudentSearch, 'actif=true&statut=ENROLLED')
  const totalPages = Math.max(1, Math.ceil(studentCount / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const refreshTransferRequests = useCallback(async () => {
    if (!canManage) return
    setTransferRequestsLoading(true)
    setTransferRequestsError('')
    try {
      const results: StudentTransferRequest[] = []
      let pageNumber = 1
      let hasNextPage = true
      while (hasNextPage) {
        const response = await api.get<PaginatedResponse<StudentTransferRequest>>(
          `/student-transfer-requests/?page=${pageNumber}`,
        )
        results.push(...response.results)
        hasNextPage = Boolean(response.next)
        pageNumber += 1
      }
      setTransferRequests(results)
    } catch (error) {
      setTransferRequestsError(error instanceof Error ? error.message : 'Impossible de charger les demandes de transfert.')
    } finally {
      setTransferRequestsLoading(false)
    }
  }, [canManage])

  const refreshCertificateRequests = useCallback(async () => {
    if (!canManageCertificates) return
    setCertificateLoading(true)
    setCertificateError('')
    try {
      const results: CertificateRequest[] = []
      let pageNumber = 1
      let hasNextPage = true
      while (hasNextPage) {
        const response = await api.get<PaginatedResponse<CertificateRequest>>(
          `/certificate-requests/?page=${pageNumber}`,
        )
        results.push(...response.results)
        hasNextPage = Boolean(response.next)
        pageNumber += 1
      }
      setCertificateRequests(results)
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : 'Impossible de charger les demandes de certificat.')
    } finally {
      setCertificateLoading(false)
    }
  }, [canManageCertificates])

  useEffect(() => {
    void refreshTransferRequests()
  }, [refreshTransferRequests])

  useEffect(() => {
    void refreshCertificateRequests()
  }, [refreshCertificateRequests])

  const submitCertificateRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCertificateSaving(true)
    setCertificateError('')
    try {
      await api.post('/certificate-requests/', {
        student: Number(certificateStudent),
        academic_year: certificateYear.trim(),
      })
      setCertificateStudent('')
      setCertificateStudentSearch('')
      await refreshCertificateRequests()
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : 'Impossible de créer la demande de certificat.')
    } finally {
      setCertificateSaving(false)
    }
  }

  const decideCertificateRequest = async (request: CertificateRequest, status: 'APPROVED' | 'REJECTED') => {
    setCertificateError('')
    const decisionReason = (certificateDecisionReasons[request.id] || '').trim()
    if (!decisionReason) {
      setCertificateError('Indiquez une justification pour chaque décision de certificat.')
      return
    }
    setCertificateSaving(true)
    try {
      await api.post(`/certificate-requests/${request.id}/review/`, {
        status,
        decision_reason: decisionReason,
        negotiation_approved: status === 'APPROVED' && Boolean(certificateNegotiations[request.id]),
      })
      await refreshCertificateRequests()
      onReload()
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : 'Impossible d’enregistrer la décision.')
    } finally {
      setCertificateSaving(false)
    }
  }

  const downloadCertificate = async (request: CertificateRequest) => {
    setCertificateError('')
    setCertificateDownloading(request.id)
    try {
      const file = await api.download(`/certificate-requests/${request.id}/download/`)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificat-scolarite-${request.student_detail.matricule}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : 'Impossible de télécharger le certificat.')
    } finally {
      setCertificateDownloading(null)
    }
  }

  useEffect(() => {
    if (!transferStudent) {
      setStudentHistory([])
      return
    }
    let cancelled = false
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const results: StudentClassHistory[] = []
        let pageNumber = 1
        let hasNextPage = true
        while (hasNextPage) {
          const response = await api.get<PaginatedResponse<StudentClassHistory>>(
            `/student-class-history/?student=${transferStudent.id}&page=${pageNumber}`,
          )
          results.push(...response.results)
          hasNextPage = Boolean(response.next)
          pageNumber += 1
        }
        if (!cancelled) setStudentHistory(results)
      } catch (error) {
        if (!cancelled) {
          setTransferError(error instanceof Error ? error.message : 'Impossible de charger l’historique scolaire.')
        }
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    void loadHistory()
    return () => { cancelled = true }
  }, [transferStudent])

  const submitTransferRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!transferStudent) return
    const sourceClass = classes.find((classe) => classe.id === transferStudent.classe)
    if (!sourceClass?.academic_year) {
      setTransferError('L’année scolaire de la classe actuelle est inconnue.')
      return
    }
    setTransferSaving(true)
    setTransferError('')
    try {
      await api.post('/student-transfer-requests/', {
        student: transferStudent.id,
        target_class: Number(transferTargetClass),
        academic_year: sourceClass.academic_year,
        reason: transferReason,
      })
      setTransferStudent(null)
      setTransferTargetClass('')
      setTransferReason('')
      await refreshTransferRequests()
      onReload()
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Impossible de créer la demande de transfert.')
    } finally {
      setTransferSaving(false)
    }
  }

  const submitTransferDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!decisionRequest) return
    setDecisionSaving(true)
    setDecisionError('')
    try {
      await api.post(`/student-transfer-requests/${decisionRequest.id}/review/`, {
        status: decisionStatus,
        decision_reason: decisionReason,
      })
      setDecisionRequest(null)
      setDecisionReason('')
      await refreshTransferRequests()
      onReload()
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Impossible d’enregistrer la décision.')
    } finally {
      setDecisionSaving(false)
    }
  }

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
            <p className="text-sm text-muted-foreground">{studentCount} élève(s) dans la classe sélectionnée · {classes.length} classes</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={directoryClass} onChange={(event) => { setDirectoryClass(event.target.value); setPage(0); setQuery('') }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm" aria-label="Filtrer les élèves par classe">
            <option value="">Choisir une classe</option>
            {classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              disabled={!directoryClass}
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

      {canManage && (
        <Card className="border-border/70 bg-card/80 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ArrowRightLeft className="size-4" /> Transferts scolaires</CardTitle>
            <p className="text-xs text-muted-foreground">Les demandes sont soumises au contrôle de capacité et restent traçables dans l’historique de l’élève.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {transferRequestsError && <p className="text-sm text-destructive" role="alert">{transferRequestsError}</p>}
            {transferRequestsLoading ? <p className="text-sm text-muted-foreground">Chargement des demandes…</p> : (
              <div className="space-y-2">
                {transferRequests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">{request.student_detail.first_name} {request.student_detail.last_name} <span className="text-xs font-normal text-muted-foreground">· {request.student_detail.matricule}</span></p>
                      <p className="text-xs text-muted-foreground">{request.from_class_detail?.nom || 'Classe inconnue'} → {request.target_class_detail.nom} · {request.academic_year} · {request.status}</p>
                      <p className="mt-1 text-sm">{request.reason}</p>
                      {request.decision_reason && <p className="mt-1 text-xs text-muted-foreground">Décision : {request.decision_reason}</p>}
                    </div>
                    {canReviewTransfers && request.status === 'PENDING' && (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => { setDecisionRequest(request); setDecisionStatus('APPROVED'); setDecisionError('') }}>Approuver</Button>
                        <Button size="sm" variant="outline" onClick={() => { setDecisionRequest(request); setDecisionStatus('REJECTED'); setDecisionError('') }}>Refuser</Button>
                      </div>
                    )}
                  </div>
                ))}
                {transferRequests.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande de transfert.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManageCertificates && (
        <Card className="border-border/70 bg-card/80 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Printer className="size-4" /> Certificats de scolarité</CardTitle>
            <p className="text-xs text-muted-foreground">Créez les demandes, vérifiez l’inscription et les frais, puis téléchargez les certificats approuvés.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_180px_auto]" onSubmit={submitCertificateRequest}>
              <label className="grid gap-1.5 text-xs font-semibold">Classe
                <select required value={certificateClass} onChange={(event) => {
                  setCertificateClass(event.target.value)
                  setCertificateStudent('')
                  setCertificateStudentSearch('')
                }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal outline-none">
                  <option value="">Choisir d’abord une classe</option>
                  {classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.nom} — {classe.niveau}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">Rechercher un élève
                <Input
                  type="search"
                  value={certificateStudentSearch}
                  onChange={(event) => {
                    setCertificateStudentSearch(event.target.value)
                    setCertificateStudent('')
                  }}
                  disabled={!certificateClass}
                  aria-label="Rechercher par nom ou matricule"
                  placeholder="Nom, prénom ou matricule"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">Année scolaire
                <Input required maxLength={9} value={certificateYear} onChange={(event) => setCertificateYear(event.target.value)} placeholder="2026-2027" />
              </label>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={certificateSaving || !certificateStudent}>{certificateSaving ? 'Enregistrement…' : 'Créer une demande'}</Button>
              </div>
              {certificateClass && !certificateStudent && certificateStudentSearch.trim() && (
                <div className="space-y-1 rounded-xl border border-border p-2 md:col-span-2 xl:col-span-2" role="listbox" aria-label="Résultats des élèves">
                  {certificateCandidates.slice(0, 8).map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => setCertificateStudent(String(student.id))}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>{student.first_name} {student.last_name}</span>
                      <span className="text-xs text-muted-foreground">{student.matricule}</span>
                    </button>
                  ))}
                  {isSearchingCertificateStudent && <p className="px-3 py-2 text-sm text-muted-foreground">Recherche en cours…</p>}
                  {certificateSearchError && <p className="px-3 py-2 text-sm text-destructive" role="alert">{certificateSearchError}</p>}
                  {!isSearchingCertificateStudent && !certificateSearchError && certificateCandidates.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucun élève inscrit correspondant dans cette classe.</p>}
                  {certificateCandidateCount > certificateCandidates.length && <p className="px-3 py-2 text-xs text-muted-foreground">{certificateCandidateCount} résultat(s) : affinez la recherche.</p>}
                </div>
              )}
              {certificateStudent && (
                <p className="text-sm text-primary md:col-span-2 xl:col-span-2">
                  Élève sélectionné : {certificateCandidates.find((student) => student.id === Number(certificateStudent))?.full_name || 'Élève choisi'}
                </p>
              )}
            </form>
            {certificateError && <p className="text-sm text-destructive" role="alert">{certificateError}</p>}
            {certificateLoading ? <p className="text-sm text-muted-foreground">Chargement des demandes…</p> : (
              <div className="space-y-3">
                {certificateRequests.map((request) => (
                  <div key={request.id} className="space-y-3 rounded-xl border border-border/70 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{request.student_detail.first_name} {request.student_detail.last_name} <span className="text-xs font-normal text-muted-foreground">· {request.student_detail.matricule}</span></p>
                        <p className="text-xs text-muted-foreground">
                          {classes.find((classe) => classe.id === request.student_detail.classe)?.nom || 'Classe inconnue'} · {request.academic_year} · {request.status}
                          {request.status === 'APPROVED' && ` · ${request.fee_verified ? 'Frais vérifiés' : 'Dérogation accordée'}`}
                          {request.status === 'PENDING' && ` · Frais ${request.fees_settled ? 'réglés' : 'dus'}`}
                        </p>
                        {request.decision_reason && <p className="mt-1 text-xs text-muted-foreground">Décision : {request.decision_reason}</p>}
                      </div>
                      {request.status === 'APPROVED' && (
                        <Button size="sm" variant="outline" className="gap-2" disabled={certificateDownloading === request.id} onClick={() => void downloadCertificate(request)}>
                          <Download className="size-4" /> {certificateDownloading === request.id ? 'Téléchargement…' : 'Télécharger le PDF'}
                        </Button>
                      )}
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="space-y-2">
                        <Input
                          required
                          value={certificateDecisionReasons[request.id] || ''}
                          onChange={(event) => setCertificateDecisionReasons((reasons) => ({ ...reasons, [request.id]: event.target.value }))}
                          placeholder="Justification de la décision"
                          aria-label={`Justification pour la demande ${request.id}`}
                        />
                        {!request.fees_settled && (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(certificateNegotiations[request.id])}
                              onChange={(event) => setCertificateNegotiations((values) => ({ ...values, [request.id]: event.target.checked }))}
                            />
                            Autoriser par dérogation malgré les frais dus (justification obligatoire)
                          </label>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={certificateSaving} onClick={() => void decideCertificateRequest(request, 'REJECTED')}>Refuser</Button>
                          <Button size="sm" disabled={certificateSaving} onClick={() => void decideCertificateRequest(request, 'APPROVED')}>Approuver</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {certificateRequests.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande de certificat.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 bg-card/80 rounded-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Liste des élèves</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{studentCount} résultats{directoryLoading ? ' · chargement…' : ''}</p>
            {directoryError && <p className="mt-2 text-sm text-destructive" role="alert">{directoryError}</p>}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="mobile-card-table w-full min-w-[640px] text-left text-sm">
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
                      <td data-label="Élève" className="px-3 py-3 sm:px-6 sm:py-4">
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
                      <td data-label="Classe" className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{classe?.nom || '—'}</td>
                      <td data-label="Statut" className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statutBadge(etudiant.statut)}`}>
                          {etudiant.statut}
                        </span>
                      </td>
                      {showGrades && <td data-label="Moyenne" className="px-3 py-3 sm:px-4 sm:py-4 hidden md:table-cell font-semibold">
                        {etudiant.moyenne_generale != null ? `${etudiant.moyenne_generale}/20` : '—'}
                      </td>}
                      <td data-label="Action" className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        {canManage && <div className="flex justify-end gap-1">
                          {etudiant.statut === 'ENROLLED' && etudiant.actif && <Button variant="ghost" size="sm" className="gap-1" onClick={() => {
                            setTransferError('')
                            setTransferTargetClass('')
                            setTransferReason('')
                            setTransferStudent(etudiant)
                          }}><ArrowRightLeft className="size-4" /> Transfert</Button>}
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setCardStudent(etudiant)}>
                            <IdCard className="size-4" /> Carte
                          </Button>
                        </div>}
                      </td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={showGrades ? 5 : 4} className="px-6 py-8 text-center text-sm text-muted-foreground">{directoryClass ? 'Aucun élève trouvé.' : 'Choisissez une classe pour afficher les élèves.'}</td></tr>
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

      {transferStudent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Demande de transfert scolaire">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Demande de transfert</h3>
                <p className="text-sm text-muted-foreground">{transferStudent.first_name} {transferStudent.last_name} · {classes.find((classe) => classe.id === transferStudent.classe)?.nom || 'Classe inconnue'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setTransferStudent(null)} aria-label="Fermer"><X className="size-4" /></Button>
            </div>
            <form className="space-y-4" onSubmit={submitTransferRequest}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classe cible</label>
                <select required value={transferTargetClass} onChange={(event) => setTransferTargetClass(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none">
                  <option value="">Choisir une classe de la même année</option>
                  {classes.filter((classe) => classe.id !== transferStudent.classe && classe.academic_year === classes.find((current) => current.id === transferStudent.classe)?.academic_year).map((classe) => <option key={classe.id} value={classe.id}>{classe.nom} — {classe.niveau}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Motif de la demande</label>
                <textarea required value={transferReason} onChange={(event) => setTransferReason(event.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none" />
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="size-4" /> Historique des classes</h4>
                {historyLoading ? <p className="text-xs text-muted-foreground">Chargement de l’historique…</p> : studentHistory.length > 0 ? (
                  <ul className="space-y-2">
                    {studentHistory.map((event) => <li key={event.id} className="text-xs">
                      <span className="font-semibold">{event.academic_year} · {event.classe_detail.nom} · {event.change_type}</span>
                      {event.reason && <span className="text-muted-foreground"> — {event.reason}</span>}
                    </li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">Aucun événement d’historique enregistré.</p>}
              </div>
              {transferError && <p className="text-sm text-destructive" role="alert">{transferError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>Annuler</Button>
                <Button type="submit" disabled={transferSaving}>{transferSaving ? 'Envoi…' : 'Soumettre la demande'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {decisionRequest && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Décision de transfert">
          <form onSubmit={submitTransferDecision} className="w-full max-w-lg space-y-4 rounded-2xl bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">{decisionStatus === 'APPROVED' ? 'Approuver' : 'Refuser'} le transfert</h3>
                <p className="text-sm text-muted-foreground">{decisionRequest.student_detail.first_name} {decisionRequest.student_detail.last_name} → {decisionRequest.target_class_detail.nom}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setDecisionRequest(null)} aria-label="Fermer"><X className="size-4" /></Button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Justification obligatoire</label>
              <textarea required value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none" />
            </div>
            {decisionError && <p className="text-sm text-destructive" role="alert">{decisionError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDecisionRequest(null)}>Annuler</Button>
              <Button type="submit" disabled={decisionSaving}>{decisionSaving ? 'Enregistrement…' : 'Confirmer la décision'}</Button>
            </div>
          </form>
        </div>
      )}

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
