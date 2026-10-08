'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldCheck,
  Users,
  X,
  Wallet,
  TrendingUp,
  Download,
  LogOut,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type PaginatedResponse, type User, type Classe, type Matiere, type Etudiant, type Note, type Absence, type Enrollment, type StudentOrientation, type ExamPeriod } from '@/lib/api'
import { useAdminData, type ScreenKey } from '@/lib/admin-data'
import { clearSession, getStoredUser, isValidPortalRole } from '@/lib/auth'
import { StudentsScreen } from '@/components/screens/students'
import { EnrollmentRegistryScreen, EnrollmentsScreen } from '@/components/screens/enrollments'
import { TeachersScreen, ClassesScreen, MatieresScreen, GradesScreen, AttendanceScreen, ReportsScreen, ExamPeriodsScreen } from '@/components/screens/modules'
import { BudgetScreen } from '@/components/screens/budget'
import { TimetableScreen } from '@/components/screens/timetable'
import { BulletinsScreen } from '@/components/screens/bulletins'
import { ChatScreen } from '@/components/screens/chat'
import { AuditScreen } from '@/components/screens/audit'
import { RegistrationsScreen } from '@/components/screens/registrations'
import { NotificationsScreen } from '@/components/screens/notifications'
import { OfficePassesScreen } from '@/components/screens/office-passes'
import Image from 'next/image'

const navigation: { key: ScreenKey; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { key: 'students', label: 'Élèves', icon: GraduationCap },
  { key: 'enrollments', label: 'Inscriptions', icon: CheckCircle2 },
  { key: 'payments', label: 'Finances & règlements', icon: CircleDollarSign },
  { key: 'classes', label: 'Classes', icon: BookOpen },
  { key: 'teachers', label: 'Personnel', icon: Users },
  { key: 'registrations', label: 'Demandes', icon: UserPlus },
  { key: 'matieres', label: 'Matières', icon: BookOpen },
  { key: 'timetable', label: 'Emploi du temps', icon: CalendarDays },
  { key: 'attendance', label: 'Pointage', icon: Clock3 },
  { key: 'grades', label: 'Notes', icon: FileText },
  { key: 'periods', label: 'Année & périodes', icon: CalendarDays },
  { key: 'bulletins', label: 'Bulletins', icon: FileText },
  { key: 'chat', label: 'Messagerie', icon: MessageSquare },
  { key: 'notifications', label: 'Alertes', icon: Bell },
  { key: 'office', label: 'Convocations & billets', icon: FileText },
  { key: 'audit', label: 'Audit', icon: ShieldCheck },
  { key: 'reports', label: 'Rapports', icon: Building2 },
  { key: 'budget', label: 'Budget', icon: Wallet },
]

function StatCard({ label, value, detail, trend, icon: Icon, accent }: { label: string; value: string; detail: string; trend: string; icon: typeof Users; accent: string }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg rounded-2xl">
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

const roleLabels: Record<string, string> = {
  ADMIN: 'Administration générale',
  PROFESSEUR: 'Espace enseignant',
  SURVEILLANT: 'Vie scolaire',
  SECRETARIAT: 'Secrétariat',
}

const roleScreenKeys: Record<string, ScreenKey[]> = {
  ADMIN: navigation.map(({ key }) => key),
  PROFESSEUR: ['grades', 'attendance', 'timetable', 'chat', 'notifications'],
  SURVEILLANT: ['students', 'attendance', 'timetable', 'chat', 'notifications', 'office'],
  SECRETARIAT: ['students', 'enrollments', 'attendance', 'timetable', 'chat', 'notifications', 'office'],
}

export default function Home() {
  const [active, setActive] = useState<ScreenKey>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Personnel')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const { data, isLoading, reload } = useAdminData()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = getStoredUser()
    if (!token || !user || !isValidPortalRole(user.role)) {
      clearSession()
      window.location.replace('/login')
      return
    }

    if (!roleScreenKeys[user.role]) {
      clearSession()
      window.location.replace('/login')
      return
    }
    setRole(user.role)
    setDisplayName(`${user.first_name} ${user.last_name}`.trim() || roleLabels[user.role])
    setActive(user.role === 'ADMIN' ? 'overview' : roleScreenKeys[user.role][0])
    setIsLoggedIn(true)
  }, [])

  const handleLogout = () => {
    clearSession()
    setIsLoggedIn(false)
    window.location.href = '/'
  }

  const allowedKeys = role ? roleScreenKeys[role] : []
  const visibleNavigation = navigation
    .filter(({ key }) => allowedKeys.includes(key))
    .map((item) => role === 'SECRETARIAT' && item.key === 'students'
      ? { ...item, label: 'Dossiers élèves' }
      : item)
  const activeLabel = navigation.find((n) => n.key === active)?.label ?? "Vue d'ensemble"

  const renderScreen = () => {
    if (!role) {
      return <div className="py-20 text-center text-sm text-muted-foreground">Vérification de votre session…</div>
    }
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Chargement des données…</p>
          </div>
        </div>
      )
    }
    switch (active) {
      case 'overview': return <OverviewScreen data={data} />
      case 'students': return <StudentsScreen etudiants={data.etudiants} classes={data.classes as any} onReload={reload} canManage={role === 'ADMIN' || role === 'SECRETARIAT'} showGrades={role === 'ADMIN'} />
      case 'enrollments': return <EnrollmentRegistryScreen enrollments={data.enrollments} etudiants={data.etudiants} classes={data.classes as any} />
      case 'payments': return <EnrollmentsScreen enrollments={data.enrollments} etudiants={data.etudiants} classes={data.classes as any} />
      case 'classes': return <ClassesScreen classes={data.classes as any} etudiants={data.etudiants} onReload={reload} />
      case 'teachers': return <TeachersScreen users={data.users} etudiants={data.etudiants} notes={data.notes} matieres={data.matieres} periods={data.periods} onReload={reload} />
      case 'matieres': return <MatieresScreen matieres={data.matieres} classes={data.classes as any} onReload={reload} />
      case 'attendance': return <AttendanceScreen absences={data.absences} users={data.users} etudiants={data.etudiants} onReload={reload} canScan={role === 'ADMIN' || role === 'PROFESSEUR'} />
      case 'grades': return <GradesScreen notes={data.notes} users={data.users} etudiants={data.etudiants} matieres={data.matieres} periods={data.periods} role={role} onReload={reload} />
      case 'periods': return <ExamPeriodsScreen periods={data.periods} onReload={reload} />
      case 'registrations': return <RegistrationsScreen allUsers={data.allUsers} onReload={reload} />
      case 'timetable': return <TimetableScreen slots={data.timetableSlots} classes={data.classes as any} matieres={data.matieres} users={data.users} />
      case 'bulletins': return <BulletinsScreen etudiants={data.etudiants} notes={data.notes} matieres={data.matieres} periods={data.periods} />
      case 'reports': return <ReportsScreen users={data.users} etudiants={data.etudiants} classes={data.classes as any} matieres={data.matieres} notes={data.notes} />
      case 'budget': return <BudgetScreen budgetItems={data.budgetItems} budgetCategories={data.budgetCategories} budgetReports={data.budgetReports} budgetStats={data.budgetStats} enrollments={data.enrollments} users={data.users} />
      case 'chat': return <ChatScreen users={data.users} />
      case 'notifications': return <NotificationsScreen notifications={data.notifications} classes={data.classes} role={role} onReload={reload} />
      case 'office': return <OfficePassesScreen students={data.etudiants} records={data.officePasses} role={role} onReload={reload} />
      case 'audit': return <AuditScreen logs={data.auditLogs} />
    }
  }

  return (
    <>
      <main className="min-h-dvh bg-background text-foreground">
        <div className="flex min-h-dvh">
          <aside className={`${mobileNav ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0`}>
            <div className="flex h-[82px] shrink-0 items-center justify-between border-b border-sidebar-border px-6">
              <div className="flex items-center gap-3">
                <Image src="/logo%20%282%29.jpeg" alt="Logo LMS" width={80} height={40} className="h-9 w-[72px] shrink-0 object-contain" />
                <div><p className="font-semibold tracking-tight text-sidebar-foreground">Lycée Midongy Sud</p><p className="text-[11px] text-sidebar-foreground/55">{role ? roleLabels[role] : 'Espace sécurisé'}</p></div>
              </div>
              <button onClick={() => setMobileNav(false)} className="text-sidebar-foreground/60 lg:hidden" aria-label="Fermer le menu"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">Pilotage</p>
              <nav className="space-y-1" aria-label="Navigation principale">
                {visibleNavigation.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => { setActive(key); setMobileNav(false) }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active === key ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                    <Icon className="size-[17px] shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="shrink-0 border-t border-sidebar-border p-4">
              <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/65 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">AD</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/55">En ligne</p>
                </div>
              </div>
            </div>
          </aside>

          {mobileNav && <button className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileNav(false)} aria-label="Fermer la navigation" />}

          <section className="min-w-0 flex-1">
            <header className="flex h-[68px] items-center justify-between border-b border-border/70 bg-background/90 px-3 backdrop-blur-md sm:h-[82px] sm:px-8">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Ouvrir le menu"><Menu className="size-5" /></Button>
                <div className="min-w-0">
                  <p className="hidden text-xs text-muted-foreground sm:block">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{activeLabel}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
                <div className="relative hidden md:block">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher..." className="h-9 w-56 rounded-lg border border-border bg-muted/35 pl-3 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                <button onClick={() => setActive('notifications')} className="relative flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted sm:size-10" aria-label="Notifications">
                  <Bell className="size-[18px]" />
                  {role !== 'ADMIN' && data.notifications.some((notification) => !notification.is_read) && <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />}
                </button>
                {isLoggedIn && (
                  <button onClick={handleLogout} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted sm:size-10" aria-label="Déconnexion">
                    <LogOut className="size-[18px]" />
                  </button>
                )}
              </div>
            </header>

            <div className="mx-auto max-w-[1500px] px-3 pb-24 pt-4 sm:p-8">
              {renderScreen()}
            </div>
          </section>
        </div>
        <nav className="mobile-tab-bar fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/80 bg-card/95 px-2 pt-2 shadow-[0_-8px_24px_-18px_rgba(10,30,44,.28)] backdrop-blur-xl lg:hidden" aria-label="Navigation rapide">
          {visibleNavigation.slice(0, 4).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-current={active === key ? 'page' : undefined}
              onClick={() => { setActive(key); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${active === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Icon className="size-[18px]" />
              <span className="max-w-full truncate">{label}</span>
            </button>
          ))}
          <button
            type="button"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((open) => !open)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${mobileNav ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Menu className="size-[18px]" />
            <span>Menu</span>
          </button>
        </nav>
      </main>
      <footer className="border-t border-border/70 bg-background/90 px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-[1500px] text-center">
          <p className="text-xs text-muted-foreground">Développé par DevMisaina</p>
        </div>
      </footer>
    </>
  )
}

function OverviewScreen({ data }: { data: ReturnType<typeof useAdminData>['data'] }) {
  const students = data.etudiants
  const elevesActifs = students.filter((e) => e.actif).length
  const enseignantsActifs = data.users.filter((u) => u.role === 'PROFESSEUR' && u.status === 'ACTIVE').length
  const totalEncaisse = data.enrollments.reduce((s, e) => s + Number(e.frais_verses || 0), 0)
  const totalDu = data.enrollments.reduce((s, e) => s + Number(e.frais_total || 0), 0)

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Bonjour,</p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Voici l'état du lycée.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Vue d'ensemble des effectifs, des paiements et de la vie scolaire pour piloter votre établissement.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted sm:w-auto"><CalendarDays className="size-4 text-muted-foreground" />{new Date().getFullYear()} — {new Date().getFullYear() + 1}<ChevronDown className="size-4 text-muted-foreground" /></button>
          <Button className="h-10 w-full gap-2 bg-primary px-4 text-primary-foreground shadow-sm sm:w-auto"><ArrowUpRight className="size-4" />Rapport du jour</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Élèves actifs" value={elevesActifs.toString()} detail={`${data.users.filter((u) => u.role === 'ELEVE').length} élèves inscrits`} trend="4,8 %" icon={GraduationCap} accent="bg-primary/10 text-primary" />
        <StatCard label="Enseignants" value={enseignantsActifs.toString()} detail="Personnel actif" trend="2,1 %" icon={Users} accent="bg-sky-500/10 text-sky-700 dark:text-sky-300" />
        <StatCard label="Classes" value={data.classes.length.toString()} detail={`${data.matieres.length} matières`} trend="0,0 %" icon={BookOpen} accent="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
        <StatCard label="Encaissé" value={new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalEncaisse) + ' Ar'} detail={`sur ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(totalDu)} Ar attendus`} trend="7,2 %" icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
      </div>

      <div className="mt-2 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div><CardTitle className="text-base">Dernières notes</CardTitle><p className="mt-1 text-xs text-muted-foreground">Saisies récentes · toutes matières</p></div>
          </CardHeader>
          <CardContent>
            <div className="mt-7 flex h-52 items-end justify-between gap-3 border-b border-border pb-0 sm:gap-6">
              {data.notes.slice(-6).reverse().map((note) => (
                <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={note.id}>
                  <span className="text-[10px] font-semibold text-muted-foreground">{note.note}/20</span>
                  <div className="relative flex h-[78%] w-full items-end justify-center overflow-hidden rounded-t-md bg-muted/60">
                    <div className={`w-full rounded-t-md ${Number(note.note) >= 10 ? 'bg-primary' : 'bg-destructive'} transition-all duration-500`} style={{ height: `${Math.max(20, (Number(note.note) / 20) * 100)}%` }} />
                  </div>
                  <span className="mb-2 text-[11px] text-muted-foreground">{data.matieres.find((m) => m.id === note.matiere)?.code || '—'}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-primary" />Moyenne générale</span>
              <span className="font-semibold text-foreground">{data.notes.length ? (data.notes.reduce((s, n) => s + Number(n.note), 0) / data.notes.length).toFixed(1) : '—'} /20</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div><CardTitle className="text-base">À traiter aujourd'hui</CardTitle><p className="mt-1 text-xs text-muted-foreground">Actions prioritaires</p></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { n: data.users.filter((u) => u.role === 'PROFESSEUR' && u.status === 'PENDING_VERIFICATION').length, l: "Comptes enseignants à valider", c: "bg-primary/10 text-primary" },
              { n: data.enrollments.filter((e) => e.payment_status === 'UNPAID').length, l: "Paiements en attente", c: "bg-amber-500/10 text-amber-700" },
              { n: data.orientations.filter((o) => o.status === 'PROPOSED').length, l: "Orientations IA à confirmer", c: "bg-rose-500/10 text-rose-700" },
            ].map((item) => (
              <button key={item.l} className="flex w-full items-center gap-3 rounded-lg border border-border/70 p-3 text-left transition-colors hover:bg-muted/40">
                <span className={`flex size-9 items-center justify-center rounded-lg text-sm font-bold ${item.c}`}>{item.n}</span>
                <span className="flex-1 text-sm font-medium">{item.l}</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
