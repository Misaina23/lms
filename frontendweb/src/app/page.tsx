'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type PaginatedResponse, type User, type Classe, type Matiere, type Etudiant, type Note, type Absence, type Enrollment, type StudentOrientation, type ExamPeriod } from '@/lib/api'

const navigation = [
  { label: 'Vue d’ensemble', icon: LayoutDashboard },
  { label: 'Élèves', icon: GraduationCap },
  { label: 'Inscriptions', icon: CheckCircle2 },
  { label: 'Paiements', icon: CircleDollarSign },
  { label: 'Classes & matières', icon: BookOpen },
  { label: 'Enseignants', icon: Users },
  { label: 'Emploi du temps', icon: CalendarDays },
  { label: 'Pointage', icon: Clock3 },
  { label: 'Résultats & bulletins', icon: FileText },
  { label: 'Rapports', icon: Building2 },
]

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2)
}

function StatCard({ label, value, detail, trend, icon: Icon, accent }: { label: string; value: string; detail: string; trend: string; icon: typeof Users; accent: string }) {
  return (
    <Card className="group border-border/70 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div className={`flex size-10 items-center justify-center rounded-xl ${accent}`}><Icon className="size-5" /></div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"><ArrowUpRight className="size-3" />{trend}</span>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  const [active, setActive] = useState('Vue d’ensemble')
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('Cette semaine')
  const [bulletinOpen, setBulletinOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [orientations, setOrientations] = useState<StudentOrientation[]>([])
  const [periods, setPeriods] = useState<ExamPeriod[]>([])
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    setIsDark(theme === null || theme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDark)
    window.dispatchEvent(new Event('theme-change'))
  }

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogin = () => {
    window.location.href = '/login'
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
    window.location.href = '/login'
  }

   useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [usersData, classesData, matieresData, etudiantsData, notesData, absencesData, enrollmentsData, orientationsData, periodsData] = await Promise.all([
          api.get<PaginatedResponse<User>>('/users/'),
          api.get<PaginatedResponse<Classe>>('/classes/'),
          api.get<PaginatedResponse<Matiere>>('/matieres/'),
          api.get<PaginatedResponse<Etudiant>>('/etudiants/'),
          api.get<PaginatedResponse<Note>>('/notes/'),
          api.get<PaginatedResponse<Absence>>('/absences/'),
          api.get<PaginatedResponse<Enrollment>>('/enrollments/'),
          api.get<PaginatedResponse<StudentOrientation>>('/orientations/'),
          api.get<PaginatedResponse<ExamPeriod>>('/exam-periods/'),
        ])
        setUsers(usersData.results || [])
        setClasses(classesData.results || [])
        setMatieres(matieresData.results || [])
        setEtudiants(etudiantsData.results || [])
        setNotes(notesData.results || [])
        setAbsences(absencesData.results || [])
        setEnrollments(enrollmentsData.results || [])
        setOrientations(orientationsData.results || [])
        setPeriods(periodsData.results || [])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredStudents = useMemo(
    () =>
      etudiants.filter((etudiant) => {
        const user = users.find((u) => u.id === etudiant.user)
        return user?.first_name?.toLowerCase().includes(query.toLowerCase()) || user?.last_name?.toLowerCase().includes(query.toLowerCase())
      }),
    [etudiants, users, query]
  )

  return (
    <>
    <main className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh">
        <aside className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0`}>
          <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-sidebar-border px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md"><GraduationCap className="size-5" /></div>
              <div><p className="font-semibold tracking-tight text-sidebar-foreground">Lycée Horizon</p><p className="text-[11px] text-sidebar-foreground/55">Administration centrale</p></div>
            </div>
            <button onClick={() => setMobileNav(false)} className="text-sidebar-foreground/60 lg:hidden" aria-label="Fermer le menu"><X className="size-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Pilotage</p>
            <nav className="space-y-1" aria-label="Navigation principale">
              {navigation.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); setMobileNav(false) }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active === label ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><Icon className="size-[17px] shrink-0" /><span className="flex-1 text-left">{label}</span></button>)}
            </nav>
            <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Système</p>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"><ShieldCheck className="size-[17px]" />Sécurité & activités</button>
            <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"><Settings2 className="size-[17px]" />Paramètres</button>
          </div>
          <div className="shrink-0 border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/65 p-3"><div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">AD</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-sidebar-foreground">Aminata Diallo</p><p className="truncate text-[11px] text-sidebar-foreground/55">Administratrice</p></div><ChevronDown className="size-4 text-sidebar-foreground/45" /></div>
          </div>
        </aside>

        {mobileNav && <button className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileNav(false)} aria-label="Fermer la navigation" />}

        <section className="min-w-0 flex-1">
          <header className="flex h-[82px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8">
            <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Ouvrir le menu"><Menu className="size-5" /></Button><div><p className="hidden text-xs text-muted-foreground sm:block">Samedi 23 août 2026</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">{active}</h1></div></div>
            <div className="flex items-center gap-2 sm:gap-4"><div className="relative hidden md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un élève..." className="h-10 w-56 rounded-lg border border-border bg-muted/35 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/20" /></div><button className="relative flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted" aria-label="Notifications"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" /></button><button onClick={toggleTheme} className="flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted" aria-label={isDark ? 'Mode clair' : 'Mode sombre'}>{isDark ? '☀️' : '🌙'}</button><div className="hidden size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:flex">AD</div>{!isLoggedIn ? <Button onClick={handleLogin} variant="outline" size="sm">Connexion</Button> : <Button onClick={handleLogout} variant="outline" size="sm">Déconnexion</Button>}</div>
          </header>

          <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Chargement des données...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {active === 'Vue d\u2019ensemble' && (
                  <>
                    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 font-serif text-sm italic text-primary">Bonjour Aminata,</p><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Voici l\u2019état du lycée.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Une vue claire des effectifs, des inscriptions et de la vie scolaire pour décider plus vite.</p></div><div className="flex items-center gap-2"><button className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted"><CalendarDays className="size-4 text-muted-foreground" />2025 — 2026<ChevronDown className="size-4 text-muted-foreground" /></button><Button className="h-10 gap-2 bg-primary px-4 text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"><ArrowUpRight className="size-4" />Rapport du jour</Button></div></div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Élèves actifs" value={etudiants.length.toString()} detail={`${users.filter(u => u.role === 'ELEVE').length} élèves inscrits`} trend="4,8 %" icon={GraduationCap} accent="bg-primary/10 text-primary" /><StatCard label="Inscriptions" value={etudiants.length.toString()} detail="Dossiers enregistrés" trend="7,2 %" icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" /><StatCard label="Enseignants" value={users.filter(u => u.role === 'PROFESSEUR').length.toString()} detail="Personnel actif" trend="2,1 %" icon={Users} accent="bg-sky-500/10 text-sky-700 dark:text-sky-300" /><StatCard label="Matières" value={matieres.length.toString()} detail="Programme scolaire" trend="0,0 %" icon={BookOpen} accent="bg-amber-500/10 text-amber-700 dark:text-amber-300" /></div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                      <Card className="border-border/70 bg-card/80 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><div><CardTitle className="text-base">Dernières notes</CardTitle><p className="mt-1 text-xs text-muted-foreground">Saisies récentes · toutes matières</p></div><button onClick={() => setPeriod(period === 'Cette semaine' ? 'Ce mois' : 'Cette semaine')} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">{period}<ChevronDown className="size-3.5" /></button></CardHeader><CardContent><div className="mt-7 flex h-52 items-end justify-between gap-3 border-b border-border pb-0 sm:gap-6">{notes.slice(-6).reverse().map((note, index) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={note.id}><span className="text-[10px] font-semibold text-muted-foreground">{note.note}/20</span><div className="relative flex h-[78%] w-full items-end justify-center overflow-hidden rounded-t-md bg-muted/60"><div className={`w-full rounded-t-md bg-primary ${Number(note.note) >= 10 ? 'bg-primary' : 'bg-destructive'} transition-all duration-500`} style={{ height: `${Math.max(20, (Number(note.note) / 20) * 100)}%` }} /></div><span className="mb-2 text-[11px] text-muted-foreground">{matieres.find(m => m.id === note.matiere)?.code || '—'}</span></div>)}</div><div className="mt-5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-primary" />Moyenne générale</span><span className="font-semibold text-foreground">{notes.length ? (notes.reduce((sum, n) => sum + Number(n.note), 0) / notes.length).toFixed(1) : '—'} /20</span></div></CardContent></Card>

                  <Card className="border-border/70 bg-card/80 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><div><CardTitle className="text-base">Répartition des classes</CardTitle><p className="mt-1 text-xs text-muted-foreground">Effectifs par niveau</p></div><button className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Plus d'options"><MoreHorizontal className="size-5" /></button></CardHeader><CardContent><div className="mt-6 flex items-center gap-6"><div className="relative flex size-32 shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(var(--primary) 0 38%, oklch(0.73 0.13 172) 38% 71%, oklch(0.82 0.14 83) 71% 100%)' }}><div className="flex size-20 flex-col items-center justify-center rounded-full bg-card"><span className="text-xl font-semibold">{classes.length}</span><span className="text-[10px] text-muted-foreground">classes</span></div></div><div className="space-y-3 text-xs"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /><span className="w-14 text-muted-foreground">Seconde</span><span className="font-semibold">{classes.filter(c => c.niveau === 'SECONDAIRE_GENERAL').length}</span></div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[oklch(0.73_0.13_172)]" /><span className="w-14 text-muted-foreground">Première</span><span className="font-semibold">{classes.filter(c => c.niveau === 'SECONDAIRE_GENERAL').length}</span></div><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-[oklch(0.82_0.14_83)]" /><span className="w-14 text-muted-foreground">Terminale</span><span className="font-semibold">{classes.filter(c => c.niveau === 'SECONDAIRE_GENERAL').length}</span></div></div></div><div className="mt-7 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{etudiants.length} élèves</span> répartis sur les classes actuelles.</div></CardContent></Card>

                  <Card className="mt-6 border-border/70 bg-card/80 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Dernières inscriptions</CardTitle><p className="mt-1 text-xs text-muted-foreground">Les dossiers qui nécessitent votre attention</p></div><Button variant="outline" className="hidden gap-2 sm:flex">Voir toutes les inscriptions <ArrowUpRight className="size-4" /></Button></CardHeader><CardContent className="px-0"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><tr><th className="px-6 py-3 font-semibold">Élève</th><th className="px-4 py-3 font-semibold">Classe</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 font-semibold">Droits versés</th><th className="px-6 py-3 text-right font-semibold">Action</th></tr></thead><tbody>{filteredStudents.slice(0, 5).map((etudiant) => { const user = users.find(u => u.id === etudiant.user); const classe = classes.find(c => c.id === etudiant.classe); return <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/25" key={etudiant.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{user ? initials(user.first_name + ' ' + user.last_name) : '?'} </div><div><p className="font-semibold">{user ? `${user.first_name} ${user.last_name}` : '—'}</p><p className="text-xs text-muted-foreground">{user?.matricule || '—'}</p></div></div></td><td className="px-4 py-4 text-muted-foreground">{classe?.nom || '—'}</td><td className="px-4 py-4"><span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Inscription complète</span></td><td className="px-4 py-4 text-muted-foreground">{etudiant.date_inscription}</td><td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="size-4" /></Button></td></tr>})}</tbody></table></div></CardContent></Card>

                  <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><Card className="border-border/70 bg-card/80 shadow-sm"><CardHeader><CardTitle className="text-base">À traiter aujourd'hui</CardTitle></CardHeader><CardContent className="space-y-3">{[
                    ["7", "demandes de comptes enseignants", "bg-primary/10 text-primary"],
                    ["14", "paiements à rapprocher", "bg-amber-500/10 text-amber-700"],
                    ["3", "classes sans professeur principal", "bg-rose-500/10 text-rose-700"],
                  ].map(([number, label, color]) => <button key={label} className="flex w-full items-center gap-3 rounded-lg border border-border/70 p-3 text-left transition-colors hover:bg-muted/40"><span className={`flex size-9 items-center justify-center rounded-lg text-sm font-bold ${color}`}>{number}</span><span className="flex-1 text-sm font-medium">{label}</span><ArrowUpRight className="size-4 text-muted-foreground" /></button>)}</CardContent></Card><Card className="border-border/70 bg-card/80 shadow-sm"><CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">Activité récente</CardTitle><p className="mt-1 text-xs text-muted-foreground">Journal sécurisé des opérations</p></div><ShieldCheck className="size-5 text-emerald-600" /></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Il y a 8 min</p><p className="mt-1 text-sm font-medium">Note ajoutée en Mathématiques</p><p className="mt-2 text-[11px] text-muted-foreground">M. Kouassi · Tle C</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Il y a 24 min</p><p className="mt-1 text-sm font-medium">Reçu de paiement validé</p><p className="mt-2 text-[11px] text-muted-foreground">Caisse · REC-00842</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Il y a 1 h</p><p className="mt-1 text-sm font-medium">Nouvel enseignant enregistré</p><p className="mt-2 text-[11px] text-muted-foreground">Admin · Sciences Physiques</p></div></CardContent></Card></div></div>
                  </>
                )}

                {active === 'Élèves' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Gestion des élèves</p>
                    <p className="text-sm">Liste, fiches et parcours scolaire détaillé.</p>
                  </div>
                )}

                {active === 'Inscriptions' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Gestion des inscriptions</p>
                    <p className="text-sm">Dossiers, paiements et statuts de scolarité.</p>
                  </div>
                )}

                {active === 'Paiements' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <CircleDollarSign className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Gestion des paiements</p>
                    <p className="text-sm">Reçus, factures et rapprochement bancaire.</p>
                  </div>
                )}

                {active === 'Classes & matières' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Classes & matières</p>
                    <p className="text-sm">Organisation pédagogique et affectations.</p>
                  </div>
                )}

                {active === 'Enseignants' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Gestion des enseignants</p>
                    <p className="text-sm">Effectifs, disponibilités et contrats.</p>
                  </div>
                )}

                {active === 'Emploi du temps' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <CalendarDays className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Emploi du temps</p>
                    <p className="text-sm">Planning des cours et salles.</p>
                  </div>
                )}

                {active === 'Pointage' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock3 className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Pointage</p>
                    <p className="text-sm">Absences, retards et présence en ligne.</p>
                  </div>
                )}

                {active === 'Résultats & bulletins' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Résultats & bulletins</p>
                    <p className="text-sm">Notes, moyennes et bulletins générés.</p>
                  </div>
                )}

                {active === 'Rapports' && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Building2 className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Rapports</p>
                    <p className="text-sm">Statistiques, indicateurs et export PDF.</p>
                  </div>
                )}
              </div>
              )}
            </div>
        </section>
      </div>
      {bulletinOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bulletin-title"><div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Édition académique</p><h2 id="bulletin-title" className="mt-1 text-xl font-semibold tracking-tight">Générer les bulletins scolaires</h2><p className="mt-1 text-xs text-muted-foreground">Calcul automatique des moyennes pondérées par coefficient.</p></div><button onClick={() => setBulletinOpen(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Fermer"><X className="size-5" /></button></div><div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.8fr_1.2fr]"><div className="space-y-4"><div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FileText className="size-4" /></div><div><p className="text-sm font-semibold">Bulletins du 1er trimestre</p><p className="mt-1 text-xs leading-5 text-muted-foreground">2025 — 2026 · {etudiants.length} élèves dans la sélection administrative.</p></div></div></div><label className="block text-xs font-semibold text-foreground" htmlFor="bulletin-period">Période scolaire</label><select id="bulletin-period" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"><option>1er trimestre · 2025 — 2026</option><option>2e trimestre · 2025 — 2026</option><option>3e trimestre · 2025 — 2026</option></select><div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs font-semibold text-foreground">Inclure dans le lot</p><div className="mt-3 space-y-2 text-sm text-muted-foreground"><label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="size-4 rounded border-border" /><span>Bulletins individuels (PDF)</span></label><label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="size-4 rounded border-border" /><span>Synthèse de classe</span></label><label className="flex items-center gap-2"><input type="checkbox" className="size-4 rounded border-border" /><span>Comparatif avec le trimestre précédent</span></label></div></div><Button className="w-full gap-2 bg-primary text-primary-foreground"><Download className="size-4" />Préparer le lot</Button></div><div className="space-y-4"><div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-xs font-semibold text-foreground">Aperçu avant génération</p><div className="mt-3 space-y-3">{etudiants.slice(0, 3).map((etudiant) => { const user = users.find(u => u.id === etudiant.user); const studentNotes = notes.filter(n => n.etudiant === etudiant.id); const avg = studentNotes.length ? (studentNotes.reduce((sum, n) => sum + Number(n.note) * Number(n.coefficient), 0) / studentNotes.reduce((sum, n) => sum + Number(n.coefficient), 0)).toFixed(2) : '—'; return <div key={etudiant.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background p-3"><div className="flex items-center gap-3"><div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{user ? initials(user.first_name + ' ' + user.last_name) : '?'}</div><div><p className="text-sm font-medium">{user ? `${user.first_name} ${user.last_name}` : '—'}</p><p className="text-xs text-muted-foreground">{classes.find(c => c.id === etudiant.classe)?.nom || '—'}</p></div></div><div className="text-right"><p className="text-sm font-semibold">{avg}/20</p><p className="text-[11px] text-muted-foreground">{studentNotes.length} note{studentNotes.length !== 1 ? 's' : ''}</p></div></div> })}</div></div><div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4"><div><p className="text-sm font-semibold">Prêt à générer</p><p className="text-xs text-muted-foreground">{etudiants.length} bulletens · estimation 2 min</p></div><Button className="gap-2 bg-primary text-primary-foreground"><Printer className="size-4" />Générer</Button></div></div></div></div></div>}
    </main>
    <footer className="border-t border-border/70 bg-background/90 px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-[1500px] text-center">
        <p className="text-xs text-muted-foreground">Développé par DevMisaina</p>
      </div>
    </footer>
    </>
  )
}
