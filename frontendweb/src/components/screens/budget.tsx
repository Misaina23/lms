'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  FileText,
  GraduationCap,
  Users,
  HandHeart,
} from 'lucide-react'
import { api, type BudgetItem, type BudgetCategory, type BudgetReport, type BudgetStats, type Enrollment, type User } from '@/lib/api'

function formatCurrency(value: string | number | null | undefined, devise = 'MGA') {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' ' + devise
}

function StatCard({ label, value, detail, trend, icon: Icon, accent, isNegative }: {
  label: string
  value: string
  detail: string
  trend: string
  icon: typeof TrendingUp
  accent: string
  isNegative?: boolean
}) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div className={`flex size-10 items-center justify-center rounded-xl ${accent}`}><Icon className="size-5" /></div>
          {trend && <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${isNegative ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-muted text-muted-foreground'}`}>
            {isNegative ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {trend}
          </span>}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

export function BudgetScreen({ 
  budgetItems, 
  budgetCategories, 
  budgetReports, 
  budgetStats,
  enrollments,
  users,
  onReload,
}: { 
  budgetItems: BudgetItem[]
  budgetCategories: BudgetCategory[]
  budgetReports: BudgetReport[]
  budgetStats: BudgetStats | null
  enrollments: Enrollment[]
  users: User[]
  onReload: () => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'tuition' | 'salaries' | 'donations' | 'reports'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [reportPeriodType, setReportPeriodType] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [selectedStats, setSelectedStats] = useState<BudgetStats | null>(budgetStats)
  const [form, setForm] = useState({ item_type: 'EXPENSE', category: '', academic_year: budgetStats?.academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, date: new Date().toISOString().slice(0, 10), amount: '', devise: 'MGA', description: '', designation: '', revenue_source: 'OTHER_REVENUE', expense_type: 'OTHER_EXPENSE' })

  useEffect(() => {
    if (!/^\d{4}-\d{4}$/.test(form.academic_year)) return
    let cancelled = false
    api.get<BudgetStats>(`/budget/items/stats/?academic_year=${encodeURIComponent(form.academic_year)}`)
      .then((result) => { if (!cancelled) setSelectedStats(result) })
      .catch((error) => { if (!cancelled) setActionError(error instanceof Error ? error.message : 'Impossible de charger les statistiques de cette année.') })
    return () => { cancelled = true }
  }, [form.academic_year])

  const categories = useMemo(() => {
    const cats: Record<string, BudgetCategory> = {}
    budgetCategories.forEach(c => { cats[c.id] = c })
    return cats
  }, [budgetCategories])

  const yearItems = useMemo(() => budgetItems.filter((item) => item.academic_year === form.academic_year), [budgetItems, form.academic_year])
  const tuitionItems = useMemo(() => yearItems.filter(i => i.revenue_source === 'TUITION'), [yearItems])
  const salaryItems = useMemo(() => yearItems.filter(i => i.expense_type === 'TEACHER_NON_PERM'), [yearItems])
  const donationItems = useMemo(() => yearItems.filter(i => i.revenue_source === 'DONATION' || i.revenue_source === 'SUBSIDY'), [yearItems])

  const totalTuition = useMemo(() => tuitionItems.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0), [tuitionItems])
  const totalSalaries = useMemo(() => salaryItems.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0), [salaryItems])
  const totalDonations = useMemo(() => donationItems.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0), [donationItems])

  const filteredItems = useMemo(() => {
    let items = yearItems
      if (activeTab === 'tuition') items = tuitionItems
    else if (activeTab === 'salaries') items = salaryItems
    else if (activeTab === 'donations') items = donationItems

    return items.filter(item => {
      if (filterType !== 'ALL' && item.item_type !== filterType) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      const catName = categories[item.category]?.name || ''
      return (
        catName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.designation.toLowerCase().includes(q) ||
        item.reference_number.toLowerCase().includes(q)
      )
    })
  }, [yearItems, tuitionItems, salaryItems, donationItems, filterType, searchQuery, categories, activeTab])

  const totalRevenue = useMemo(() => {
    return filteredItems
      .filter(i => i.item_type === 'REVENUE')
      .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
  }, [filteredItems])

  const totalExpense = useMemo(() => {
    return filteredItems
      .filter(i => i.item_type === 'EXPENSE')
      .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
  }, [filteredItems])

  const balance = totalRevenue - totalExpense
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / 10))
  const visibleItems = filteredItems.slice(page * 10, page * 10 + 10)

  const createBudgetItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setActionError('')
    try {
      await api.post('/budget/items/', { ...form, category: Number(form.category) })
      setShowCreate(false)
      setForm({ ...form, amount: '', description: '', designation: '', category: '' })
      onReload()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible d’enregistrer la ligne budgétaire.')
    } finally {
      setSaving(false)
    }
  }

  const validateBudgetItem = async (item: BudgetItem) => {
    setActionError('')
    try {
      await api.post(`/budget/items/${item.id}/validate_item/`, {})
      onReload()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible de valider cette ligne budgétaire.')
    }
  }

  const exportBudget = async (format: 'excel' | 'csv') => {
    setActionError('')
    try {
      const blob = await api.download(`/budget/items/export_${format}/?academic_year=${encodeURIComponent(form.academic_year)}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `budget_${form.academic_year}.${format === 'excel' ? 'xlsx' : 'csv'}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible d’exporter le budget.')
    }
  }

  const generateBudgetReport = async () => {
    setSaving(true)
    setActionError('')
    try {
      await api.post('/budget/items/generate_report/', { academic_year: form.academic_year, period_type: reportPeriodType })
      onReload()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible de générer le rapport.')
    } finally {
      setSaving(false)
    }
  }

  const downloadReport = (report: BudgetReport) => {
    if (report.file) {
      window.open(report.file, '_blank', 'noopener,noreferrer')
      return
    }
    if (!report.data_json) return
    const blob = new Blob([JSON.stringify(report.data_json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapport_budget_${report.academic_year}_${report.period_type}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId)
    return user ? `${user.first_name} ${user.last_name}` : '—'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Budget & Finances</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Gestion budgétaire</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Suivi des recettes (scolarité, subventions, dons) et des dépenses (salaires, matériel, maintenance).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">Année scolaire<Input aria-label="Année scolaire du budget" maxLength={9} pattern="\d{4}-\d{4}" value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} className="h-10 w-32" /></label>
          <Button onClick={() => setShowCreate(true)} className="h-10 w-full gap-2 bg-primary px-4 text-primary-foreground shadow-sm sm:w-auto">
            <Plus className="size-4" /> Nouvelle ligne
          </Button>
          <Button onClick={() => void exportBudget('excel')} variant="outline" className="h-10 w-full gap-2 border-border px-4 sm:w-auto">
            <Download className="size-4" /> Exporter
          </Button>
        </div>
      </div>

      {actionError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{actionError}</p>}
      {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-label="Nouvelle ligne budgétaire">
        <form onSubmit={createBudgetItem} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-background p-5 shadow-xl">
          <h3 className="font-semibold">Nouvelle ligne budgétaire</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">Type<select value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value, category: '' })} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="EXPENSE">Dépense</option><option value="REVENUE">Recette</option></select></label>
            <label className="grid gap-1 text-xs font-semibold">Catégorie<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="">Choisir une catégorie</option>{budgetCategories.filter((item) => item.category_type === form.item_type).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold">Année scolaire<Input required pattern="\\d{4}-\\d{4}" maxLength={9} value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} /></label>
            <label className="grid gap-1 text-xs font-semibold">Date<Input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
            <label className="grid gap-1 text-xs font-semibold">Montant ({form.devise})<Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
            {form.item_type === 'REVENUE' ? <label className="grid gap-1 text-xs font-semibold">Source<select value={form.revenue_source} onChange={(event) => setForm({ ...form, revenue_source: event.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="TUITION">Scolarité</option><option value="SUBSIDY">Subvention</option><option value="DONATION">Don</option><option value="OTHER_REVENUE">Autre recette</option></select></label> : <label className="grid gap-1 text-xs font-semibold">Nature de la dépense<select value={form.expense_type} onChange={(event) => setForm({ ...form, expense_type: event.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-normal"><option value="CLEANING">Matériel de ménage</option><option value="OFFICE_SUPPLIES">Fournitures de bureau</option><option value="TEACHER_NON_PERM">Personnel enseignant</option><option value="SURVEILLANT">Surveillance</option><option value="GUARD">Gardiennage</option><option value="SPORTS_EQUIPMENT">Équipement sportif</option><option value="MAINTENANCE">Maintenance</option><option value="UTILITIES">Eau, électricité, Internet</option><option value="OTHER_EXPENSE">Autre dépense</option></select></label>}
            <label className="grid gap-1 text-xs font-semibold">Désignation<Input value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} /></label>
            <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Description<Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          </div>
          {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button><Button type="submit" disabled={saving || !budgetCategories.some((item) => item.category_type === form.item_type)}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </form>
      </div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
          { key: 'tuition', label: 'Scolarité', icon: GraduationCap },
          { key: 'salaries', label: 'Salaires', icon: Users },
          { key: 'donations', label: 'Dons & Subventions', icon: HandHeart },
          { key: 'items', label: 'Toutes les lignes', icon: FileText },
          { key: 'reports', label: 'Rapports', icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setPage(0) }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div className="mobile-stat-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Scolarité"
              value={formatCurrency(totalTuition)}
              detail={`${tuitionItems.length} paiements`}
              trend=""
              icon={GraduationCap}
              accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              label="Salaires"
              value={formatCurrency(totalSalaries)}
              detail={`${salaryItems.length} paiements`}
              trend=""
              icon={Users}
              accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              label="Dons & Subventions"
              value={formatCurrency(totalDonations)}
              detail={`${donationItems.length} entrées`}
              trend=""
              icon={HandHeart}
              accent="bg-amber-500/10 text-amber-700 dark:text-amber-300"
            />
            <StatCard
              label="Solde global"
              value={formatCurrency(selectedStats?.balance || 0)}
              detail="Recettes - Dépenses"
              trend=""
              icon={Wallet}
              accent={(parseFloat(selectedStats?.balance || '0') >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}
            />
          </div>

          {/* Revenue/Expense by Category */}
          <div className="mt-2 grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recettes par catégorie</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Répartition des revenus</p>
              </CardHeader>
              <CardContent>
                {selectedStats?.revenue_by_category && selectedStats.revenue_by_category.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStats.revenue_by_category.slice(0, 6).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{cat.category__name}</p>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(100, (parseFloat(cat.total) / (parseFloat(selectedStats.total_revenue) || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-semibold">{formatCurrency(cat.total)}</p>
                          <p className="text-xs text-muted-foreground">{cat.count} ligne(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucune donnée</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Répartition des dépenses</p>
              </CardHeader>
              <CardContent>
                {selectedStats?.expense_by_category && selectedStats.expense_by_category.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStats.expense_by_category.slice(0, 6).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{cat.category__name}</p>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-rose-500 transition-all"
                              style={{
                                width: `${Math.min(100, (parseFloat(cat.total) / (parseFloat(selectedStats.total_expense) || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-semibold">{formatCurrency(cat.total)}</p>
                          <p className="text-xs text-muted-foreground">{cat.count} ligne(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">Aucune donnée</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {(activeTab === 'items' || activeTab === 'tuition' || activeTab === 'salaries' || activeTab === 'donations') && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">
                {activeTab === 'tuition' && 'Paiements de scolarité'}
                {activeTab === 'salaries' && 'Salaires enseignants'}
                {activeTab === 'donations' && 'Dons & Subventions'}
                {activeTab === 'items' && 'Lignes budgétaires'}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {filteredItems.length} ligne(s) · {formatCurrency(totalRevenue)} recettes · {formatCurrency(totalExpense)} dépenses
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
                  placeholder="Rechercher..."
                  className="h-9 w-56 pl-9"
                />
              </div>
              {activeTab === 'items' && (
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
                  className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
                >
                  <option value="ALL">Tous</option>
                  <option value="REVENUE">Recettes</option>
                  <option value="EXPENSE">Dépenses</option>
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="mobile-card-table w-full min-w-[900px] text-left text-sm">
                <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 font-semibold">Date</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Type</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Catégorie</th>
                    {activeTab === 'tuition' && <th className="px-3 py-3 sm:px-4 font-semibold">Élève</th>}
                    {activeTab === 'salaries' && <th className="px-3 py-3 sm:px-4 font-semibold">Enseignant</th>}
                    {activeTab === 'donations' && <th className="px-3 py-3 sm:px-4 font-semibold">Désignation</th>}
                    <th className="px-3 py-3 sm:px-4 font-semibold">Description</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold text-right">Montant</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Statut</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td data-label="Date" className="px-3 py-3 sm:px-6 sm:py-4">{item.date}</td>
                      <td data-label="Type" className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${item.item_type === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                          {item.item_type === 'REVENUE' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {item.item_type === 'REVENUE' ? 'Recette' : 'Dépense'}
                        </span>
                      </td>
                      <td data-label="Catégorie" className="px-3 py-3 sm:px-4 sm:py-4">{categories[item.category]?.name || '—'}</td>
                      {activeTab === 'tuition' && (
                        <td data-label="Élève" className="px-3 py-3 sm:px-4 sm:py-4">
                          {item.related_enrollment_detail?.student || '—'}
                        </td>
                      )}
                      {activeTab === 'salaries' && (
                        <td data-label="Enseignant" className="px-3 py-3 sm:px-4 sm:py-4">
                          {item.related_teacher_assignment_detail?.teacher || '—'}
                        </td>
                      )}
                      {activeTab === 'donations' && (
                        <td data-label="Désignation" className="px-3 py-3 sm:px-4 sm:py-4">
                          {item.designation || '—'}
                        </td>
                      )}
                      <td data-label="Description" className="px-3 py-3 sm:px-4 sm:py-4 max-w-[200px] truncate" title={item.description}>{item.description}</td>
                      <td data-label="Montant" className={`px-3 py-3 sm:px-6 sm:py-4 text-right font-semibold ${item.item_type === 'REVENUE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.item_type === 'REVENUE' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                      <td data-label="Validation" className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className={`text-[11px] font-semibold ${item.is_validated ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.is_validated ? 'Validé' : 'En attente'}
                        </span>
                      </td>
                      <td data-label="Action" className="px-3 py-3 sm:px-4 sm:py-4">{!item.is_validated && <Button size="sm" variant="outline" onClick={() => void validateBudgetItem(item)}>Valider</Button>}</td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={activeTab === 'items' ? 7 : 8} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune ligne budgétaire.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 10 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">10 / {filteredItems.length} lignes</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Précédent</Button>
                  <span className="self-center text-xs">{page + 1} / {pageCount}</span>
                  <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Suivant</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">Rapports budgétaires</CardTitle><div className="flex gap-2"><select aria-label="Périodicité du rapport" value={reportPeriodType} onChange={(event) => setReportPeriodType(event.target.value as typeof reportPeriodType)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm"><option value="MONTHLY">Mensuel</option><option value="QUARTERLY">Trimestriel</option><option value="YEARLY">Annuel</option></select><Button size="sm" disabled={saving} onClick={() => void generateBudgetReport()}><Plus className="size-4" />Générer</Button></div></div>
            <p className="mt-1 text-xs text-muted-foreground">Période scolaire : {form.academic_year}</p>
          </CardHeader>
          <CardContent>
            {budgetReports.length > 0 ? (
              <div className="space-y-3">
                {budgetReports.filter((report) => report.academic_year === form.academic_year).map((report) => (
                  <div key={report.id} className="flex items-center justify-between rounded-lg border border-border/70 p-4 hover:bg-muted/25">
                    <div className="flex-1">
                      <p className="font-medium">
                        {report.period_type === 'MONTHLY' ? 'Mensuel' : report.period_type === 'QUARTERLY' ? 'Trimestriel' : 'Annuel'} · {report.academic_year}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.period_start} → {report.period_end} · Généré le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${report.status === 'READY' ? 'bg-emerald-500/10 text-emerald-700' : report.status === 'GENERATING' ? 'bg-amber-500/10 text-amber-700' : 'bg-rose-500/10 text-rose-700'}`}>
                        {report.status === 'READY' ? 'Prêt' : report.status === 'GENERATING' ? 'En cours' : 'Échec'}
                      </span>
                      <Button size="sm" variant="outline" className="h-8 border-border" disabled={report.status !== 'READY' || (!report.file && !report.data_json)} onClick={() => downloadReport(report)}>
                        <Download className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="mx-auto size-12 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-foreground">Aucun rapport</p>
                <p className="mt-1 text-xs text-muted-foreground">Générez votre premier rapport budgétaire.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
