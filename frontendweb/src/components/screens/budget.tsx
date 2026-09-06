'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  FileText,
  Calendar,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react'
import type { BudgetItem, BudgetCategory, BudgetReport, BudgetStats } from '@/lib/api'

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
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${isNegative ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
            {isNegative ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {trend}
          </span>
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
  budgetStats 
}: { 
  budgetItems: BudgetItem[]
  budgetCategories: BudgetCategory[]
  budgetReports: BudgetReport[]
  budgetStats: BudgetStats | null
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'reports'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')

  const categories = useMemo(() => {
    const cats: Record<string, BudgetCategory> = {}
    budgetCategories.forEach(c => { cats[c.id] = c })
    return cats
  }, [budgetCategories])

  const filteredItems = useMemo(() => {
    return budgetItems.filter(item => {
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
  }, [budgetItems, filterType, searchQuery, categories])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-serif text-sm italic text-primary">Budget & Finances</p>
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Gestion budgétaire</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Suivi des recettes (scolarité, subventions, dons) et des dépenses (matériel, salaires, maintenance).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button className="h-10 w-full gap-2 bg-primary px-4 text-primary-foreground shadow-sm sm:w-auto">
            <Plus className="size-4" /> Nouvelle ligne
          </Button>
          <Button variant="outline" className="h-10 w-full gap-2 border-border px-4 sm:w-auto">
            <Download className="size-4" /> Exporter
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
          { key: 'items', label: 'Lignes budgétaires', icon: FileText },
          { key: 'reports', label: 'Rapports', icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Recettes"
              value={formatCurrency(totalRevenue)}
              detail={`${filteredItems.filter(i => i.item_type === 'REVENUE').length} lignes`}
              trend="+12.5%"
              icon={ArrowUpRight}
              accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              label="Total Dépenses"
              value={formatCurrency(totalExpense)}
              detail={`${filteredItems.filter(i => i.item_type === 'EXPENSE').length} lignes`}
              trend="+8.2%"
              icon={ArrowDownRight}
              accent="bg-rose-500/10 text-rose-700 dark:text-rose-300"
              isNegative
            />
            <StatCard
              label="Solde"
              value={formatCurrency(balance)}
              detail="Recettes - Dépenses"
              trend={balance >= 0 ? '+' : ''}
              icon={Wallet}
              accent={balance >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}
            />
            <StatCard
              label="Rapports générés"
              value={budgetReports.length.toString()}
              detail="Cette année"
              trend="+3"
              icon={FileText}
              accent="bg-sky-500/10 text-sky-700 dark:text-sky-300"
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
                {budgetStats?.revenue_by_category && budgetStats.revenue_by_category.length > 0 ? (
                  <div className="space-y-3">
                    {budgetStats.revenue_by_category.slice(0, 6).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{cat.category__name}</p>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(100, (parseFloat(cat.total) / (parseFloat(budgetStats.total_revenue) || 1)) * 100)}%`,
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
                {budgetStats?.expense_by_category && budgetStats.expense_by_category.length > 0 ? (
                  <div className="space-y-3">
                    {budgetStats.expense_by_category.slice(0, 6).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{cat.category__name}</p>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-rose-500 transition-all"
                              style={{
                                width: `${Math.min(100, (parseFloat(cat.total) / (parseFloat(budgetStats.total_expense) || 1)) * 100)}%`,
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

      {activeTab === 'items' && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base">Lignes budgétaires</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {filteredItems.length} ligne(s) · {formatCurrency(totalRevenue)} recettes · {formatCurrency(totalExpense)} dépenses
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="h-9 w-56 pl-9"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-9 rounded-lg border border-border bg-muted/35 px-3 text-sm outline-none"
              >
                <option value="ALL">Tous</option>
                <option value="REVENUE">Recettes</option>
                <option value="EXPENSE">Dépenses</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-y border-border bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 sm:px-6 font-semibold">Date</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Type</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Catégorie</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Description</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Désignation</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold text-right">Montant</th>
                    <th className="px-3 py-3 sm:px-4 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className="border-b border-border/60 hover:bg-muted/25">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">{item.date}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${item.item_type === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>
                          {item.item_type === 'REVENUE' ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {item.item_type === 'REVENUE' ? 'Recette' : 'Dépense'}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">{categories[item.category]?.name || '—'}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4 max-w-[200px] truncate" title={item.description}>{item.description}</td>
                      <td className="px-3 py-3 sm:px-4 sm:py-4">{item.designation || '—'}</td>
                      <td className={`px-3 py-3 sm:px-6 sm:py-4 text-right font-semibold ${item.item_type === 'REVENUE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.item_type === 'REVENUE' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className={`text-[11px] font-semibold ${item.is_validated ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.is_validated ? 'Validé' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune ligne budgétaire.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 5 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">5 / {filteredItems.length} lignes</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Précédent</Button>
                  <Button variant="outline" size="sm" disabled>Suivant</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card className="border-border/70 bg-card/80 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Rapports budgétaires</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Générez des rapports mensuels, trimestriels ou annuels.</p>
          </CardHeader>
          <CardContent>
            {budgetReports.length > 0 ? (
              <div className="space-y-3">
                {budgetReports.map((report) => (
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
                      <Button size="sm" variant="outline" className="h-8 border-border">
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
                <Button className="mt-4 bg-primary text-primary-foreground">
                  <Plus className="size-4" /> Générer un rapport
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}