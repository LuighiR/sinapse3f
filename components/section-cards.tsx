"use client"

import * as React from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  isFuture,
  isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FileSpreadsheetIcon,
  ShoppingCartIcon,
  ClockIcon,
  RefreshCwIcon,
  CalendarIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  getBudgetSummary,
  getBudgetFollowUp,
  getSalesSummary,
  refreshBudgets,
  refreshSales,
  refreshCalls,
  getEmployees,
  getBranches,
  type BudgetSummary,
  type SalesSummary,
  type FollowUpSummary,
  type Employee,
  type Branch,
} from "@/lib/api"
import {
  KpiDrilldownDialog,
  type DrilldownKind,
} from "@/components/kpi-drilldown-dialog"
import { CallsSection } from "@/components/calls-section"
import { WhatsAppSection } from "@/components/whatsapp-section"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function toYMD(d: Date) {
  return format(d, "yyyy-MM-dd")
}

/** Clamp a date so it never exceeds today */
function clampToday(d: Date) {
  const now = new Date()
  return d > now ? now : d
}

function CardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24 mt-1" />
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </CardFooter>
    </Card>
  )
}

export function SectionCards() {
  const { session } = useAuth()
  const [budgets, setBudgets] = React.useState<BudgetSummary | null>(null)
  const [sales, setSales] = React.useState<SalesSummary | null>(null)
  const [salesWithBudget, setSalesWithBudget] = React.useState<SalesSummary | null>(null)
  const [salesWithoutBudget, setSalesWithoutBudget] = React.useState<SalesSummary | null>(null)
  const [followUp, setFollowUp] = React.useState<FollowUpSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const [drilldownOpen, setDrilldownOpen] = React.useState(false)
  const [drilldownKind, setDrilldownKind] =
    React.useState<DrilldownKind | null>(null)

  // ── Date filter state ──
  const [filterMode, setFilterMode] = React.useState<"month" | "range">("month")
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date())
  const [rangeFrom, setRangeFrom] = React.useState<Date | undefined>(undefined)
  const [rangeTo, setRangeTo] = React.useState<Date | undefined>(undefined)

  // ── Seller filter ──
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>("")
  const [employees, setEmployees] = React.useState<Employee[]>([])

  // ── Branch filter ──
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("")
  const [branches, setBranches] = React.useState<Branch[]>([])

  React.useEffect(() => {
    if (!session) return
    getEmployees({ token: session.accessToken, tenantId: session.tenantId })
      .then(setEmployees)
      .catch(() => {})
    getBranches({ token: session.accessToken, tenantId: session.tenantId })
      .then(setBranches)
      .catch(() => {})
  }, [session])

  const selectedEmployee = React.useMemo(
    () => employees.find((e) => String(e.id) === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )

  // Per-domain filter values derived from the selected employee
  const sellerId = selectedEmployee ? String(selectedEmployee.erpId) : undefined
  const extensionUuid = selectedEmployee?.extensionUuid ?? undefined
  const extensionNumber = selectedEmployee?.extensionNumber ?? undefined
  const chatId = selectedEmployee?.chatId ?? undefined
  const branchId = selectedBranchId || undefined

  const { from, to } = React.useMemo(() => {
    if (filterMode === "month") {
      const start = startOfMonth(selectedMonth)
      const end = clampToday(endOfMonth(selectedMonth))
      return { from: toYMD(start), to: toYMD(end) }
    }
    // range mode
    if (rangeFrom && rangeTo) {
      return { from: toYMD(rangeFrom), to: toYMD(rangeTo) }
    }
    // fallback to current month while range is incomplete
    const now = new Date()
    return { from: toYMD(startOfMonth(now)), to: toYMD(now) }
  }, [filterMode, selectedMonth, rangeFrom, rangeTo])

  const fetchData = React.useCallback(() => {
    if (!session) return
    const opts = {
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      ...(sellerId ? { sellerId } : {}),
      ...(branchId ? { branchId } : {}),
    }

    setLoading(true)
    Promise.all([
      getBudgetSummary(opts).then(setBudgets).catch((e) => {
        console.error("[KPI] budgets", e)
        toast.error("Erro ao carregar orçamentos")
      }),
      getSalesSummary(opts).then(setSales).catch((e) => {
        console.error("[KPI] sales", e)
        toast.error("Erro ao carregar vendas")
      }),
      getSalesSummary({ ...opts, hasLinkedBudget: "true" }).then(setSalesWithBudget).catch((e) => {
        console.error("[KPI] salesWithBudget", e)
        toast.error("Erro ao carregar vendas c/ orçamento")
      }),
      getSalesSummary({ ...opts, hasLinkedBudget: "false" }).then(setSalesWithoutBudget).catch((e) => {
        console.error("[KPI] salesWithoutBudget", e)
        toast.error("Erro ao carregar vendas s/ orçamento")
      }),
      getBudgetFollowUp({ ...opts, referenceAt: `${to}T23:59:59-03:00` }).then(setFollowUp).catch((e) => {
        console.error("[KPI] followUp", e)
        toast.error("Erro ao carregar follow-up")
      }),
    ]).finally(() => setLoading(false))
  }, [session, from, to, sellerId, branchId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefresh() {
    if (!session || refreshing) return
    setRefreshing(true)
    const opts = {
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      ...(sellerId ? { sellerId } : {}),
      ...(branchId ? { branchId } : {}),
    }

    try {
      await Promise.all([
        refreshBudgets(opts),
        refreshSales(opts),
        refreshCalls(opts),
      ])
      toast.success("KPIs atualizados com sucesso")
      fetchData()
      setRefreshKey((k) => k + 1)
    } catch {
      toast.error("Erro ao atualizar KPIs")
    } finally {
      setRefreshing(false)
    }
  }

  function openDrilldown(kind: DrilldownKind) {
    setDrilldownKind(kind)
    setDrilldownOpen(true)
  }

  const skeletons = Array.from({ length: 4 }).map((_, i) => (
    <CardSkeleton key={i} />
  ))

  const wonPct =
    budgets && budgets.total.count > 0
      ? ((budgets.won.count / budgets.total.count) * 100).toFixed(1)
      : "0"
  const openPct =
    budgets && budgets.total.count > 0
      ? ((budgets.open.count / budgets.total.count) * 100).toFixed(1)
      : "0"
  const activeWithBudgetPct =
    sales && sales.active.count > 0 && salesWithBudget
      ? ((salesWithBudget.active.count / sales.active.count) * 100).toFixed(1)
      : "0"
  const activeWithoutBudgetPct =
    sales && sales.active.count > 0 && salesWithoutBudget
      ? ((salesWithoutBudget.active.count / sales.active.count) * 100).toFixed(1)
      : "0"
  const canceledPct =
    sales && sales.total.count > 0
      ? ((sales.canceled.count / sales.total.count) * 100).toFixed(1)
      : "0"

  return (
    <>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {/* Filtro de período + Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode selector */}
          <Select
            value={filterMode}
            onValueChange={(v) => setFilterMode(v as "month" | "range")}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="range">Período</SelectItem>
            </SelectContent>
          </Select>

          {filterMode === "month" ? (
            /* Month selector — previous/next with label */
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() =>
                  setSelectedMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
              >
                <span className="sr-only">Mês anterior</span>
                <CalendarIcon className="size-4" />
                <span className="text-xs">‹</span>
              </Button>
              <span className="min-w-[120px] text-center text-sm font-medium capitalize">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={
                  selectedMonth.getFullYear() === new Date().getFullYear() &&
                  selectedMonth.getMonth() === new Date().getMonth()
                }
                onClick={() =>
                  setSelectedMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
              >
                <span className="sr-only">Próximo mês</span>
                <CalendarIcon className="size-4" />
                <span className="text-xs">›</span>
              </Button>
            </div>
          ) : (
            /* Date range picker */
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 font-normal">
                  <CalendarIcon className="size-4" />
                  {rangeFrom && rangeTo
                    ? `${format(rangeFrom, "dd/MM/yyyy")} — ${format(rangeTo, "dd/MM/yyyy")}`
                    : "Selecione o período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  locale={ptBR}
                  selected={
                    rangeFrom
                      ? { from: rangeFrom, to: rangeTo }
                      : undefined
                  }
                  onSelect={(range) => {
                    setRangeFrom(range?.from)
                    setRangeTo(range?.to)
                  }}
                  disabled={(date) => isFuture(date) && !isToday(date)}
                  numberOfMonths={2}
                  defaultMonth={
                    rangeFrom ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
                  }
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Seller filter */}
          <Select
            value={selectedEmployeeId || "__all__"}
            onValueChange={(v) => setSelectedEmployeeId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos Vendedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos Vendedores</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch filter */}
          <Select
            value={selectedBranchId || "__all__"}
            onValueChange={(v) => setSelectedBranchId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas Filiais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas Filiais</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* period label */}
          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
            {from} → {to}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar KPIs"}
          </Button>
        </div>

        {/* Orçamentos */}
        <div className="flex flex-col gap-4" id="orcamentos">
          <div className="flex items-center gap-2">
            <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Orçamentos</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {loading ? (
              skeletons
            ) : budgets ? (
              <>
                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
                  onClick={() => openDrilldown("budgets-total")}
                >
                  <CardHeader>
                    <CardDescription>Total de Orçamentos</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(budgets.total.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        {formatCurrency(Number(budgets.total.value))}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Volume total no período
                    </div>
                    <div className="text-muted-foreground">
                      Quantidade e valor bruto
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
                  onClick={() => openDrilldown("budgets-won")}
                >
                  <CardHeader>
                    <CardDescription>Fechados</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(budgets.won.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        {wonPct}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(budgets.won.value))}
                    </div>
                    <div className="text-muted-foreground">
                      Taxa de conversão no período
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60"
                  onClick={() => openDrilldown("budgets-open")}
                >
                  <CardHeader>
                    <CardDescription>Em Aberto</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(budgets.open.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingDownIcon />
                        {openPct}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(budgets.open.value))}
                    </div>
                    <div className="text-muted-foreground">
                      Aguardando fechamento
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
                  onClick={() => openDrilldown("budgets-lost")}
                >
                  <CardHeader>
                    <CardDescription>Perdidos</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(budgets.lost.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingDownIcon />
                        {budgets.total.count > 0
                          ? ((budgets.lost.count / budgets.total.count) * 100).toFixed(1)
                          : "0"}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(budgets.lost.value))}
                    </div>
                    <div className="text-muted-foreground">
                      Orçamentos cancelados no período
                    </div>
                  </CardFooter>
                </Card>
              </>
            ) : null}
          </div>
        </div>

        {/* Follow-up */}
        <div className="flex flex-col gap-4" id="follow-up">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Follow-up de Orçamentos</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : followUp ? (
            <div className="flex flex-col gap-6">
              {/* Total geral */}
              {followUp.total && (
                <div className="flex items-baseline gap-4 text-sm text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{formatNumber(followUp.total.count)}</strong> orçamentos</span>
                  <span>·</span>
                  <span><strong className="text-foreground">{formatCurrency(Number(followUp.total.value))}</strong></span>
                </div>
              )}

              {/* Janela de 24h */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-baseline gap-2">
                  Janela de 24h
                  {followUp.within24h.total && (
                    <span className="text-xs font-normal normal-case">— {formatNumber(followUp.within24h.total.count)} orçamentos · {formatCurrency(Number(followUp.within24h.total.value))}</span>
                  )}
                </h3>
                <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3">
                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
                    onClick={() => openDrilldown("followup-within24h-converted")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP convertidos</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300 @[250px]/card:text-4xl">
                        {Number(followUp.within24h.converted.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          <TrendingUpIcon />
                          Convertidos
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.within24h.converted.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.within24h.converted.value))}
                      </div>
                    </CardFooter>
                  </Card>

                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
                    onClick={() => openDrilldown("followup-within24h-lost")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP não convertidos</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-rose-500 dark:text-rose-300 @[250px]/card:text-4xl">
                        {Number(followUp.within24h.lost.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          <TrendingDownIcon />
                          Não convertidos
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.within24h.lost.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.within24h.lost.value))}
                      </div>
                    </CardFooter>
                  </Card>

                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60"
                    onClick={() => openDrilldown("followup-within24h-open")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP não executados</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-300 @[250px]/card:text-4xl">
                        {Number(followUp.within24h.open.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          Em aberto
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.within24h.open.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.within24h.open.value))}
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              </div>

              {/* Pós 24h */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-baseline gap-2">
                  Pós 24h
                  {followUp.after24h.total && (
                    <span className="text-xs font-normal normal-case">— {formatNumber(followUp.after24h.total.count)} orçamentos · {formatCurrency(Number(followUp.after24h.total.value))}</span>
                  )}
                </h3>
                <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3">
                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
                    onClick={() => openDrilldown("followup-after24h-converted")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP convertidos</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300 @[250px]/card:text-4xl">
                        {Number(followUp.after24h.converted.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          <TrendingUpIcon />
                          Convertidos
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.after24h.converted.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.after24h.converted.value))}
                      </div>
                    </CardFooter>
                  </Card>

                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
                    onClick={() => openDrilldown("followup-after24h-lost")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP não convertidos</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-rose-500 dark:text-rose-300 @[250px]/card:text-4xl">
                        {Number(followUp.after24h.lost.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          <TrendingDownIcon />
                          Não convertidos
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.after24h.lost.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.after24h.lost.value))}
                      </div>
                    </CardFooter>
                  </Card>

                  <Card
                    className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60"
                    onClick={() => openDrilldown("followup-after24h-open")}
                  >
                    <CardHeader>
                      <CardDescription>Follow UP não executados</CardDescription>
                      <CardTitle className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-300 @[250px]/card:text-4xl">
                        {Number(followUp.after24h.open.percentage).toFixed(2).replace(".", ",")}%
                      </CardTitle>
                      <CardAction>
                        <Badge variant="outline">
                          Em aberto
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                      <div className="font-medium">
                        Quantidade: {formatNumber(followUp.after24h.open.count)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatCurrency(Number(followUp.after24h.open.value))}
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Vendas */}
        <div className="flex flex-col gap-4" id="vendas">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Vendas</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
            {loading ? (
              skeletons
            ) : sales ? (
              <>
                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60"
                  onClick={() => openDrilldown("sales-total")}
                >
                  <CardHeader>
                    <CardDescription>Total de Vendas</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(sales.total.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        {formatCurrency(Number(sales.total.value))}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Volume total de vendas
                    </div>
                    <div className="text-muted-foreground">
                      Período selecionado
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60"
                  onClick={() => openDrilldown("sales-active-with-budget")}
                >
                  <CardHeader>
                    <CardDescription>Ativas c/ Orçamento</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(salesWithBudget?.active.count ?? 0)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        {activeWithBudgetPct}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(salesWithBudget?.active.value ?? 0))}
                    </div>
                    <div className="text-muted-foreground">
                      Vendas com orçamento vinculado
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60"
                  onClick={() => openDrilldown("sales-active-without-budget")}
                >
                  <CardHeader>
                    <CardDescription>Ativas s/ Orçamento</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(salesWithoutBudget?.active.count ?? 0)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        {activeWithoutBudgetPct}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(salesWithoutBudget?.active.value ?? 0))}
                    </div>
                    <div className="text-muted-foreground">
                      Vendas sem orçamento vinculado
                    </div>
                  </CardFooter>
                </Card>

                <Card
                  className="@container/card cursor-pointer transition-shadow hover:shadow-md bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60"
                  onClick={() => openDrilldown("sales-canceled")}
                >
                  <CardHeader>
                    <CardDescription>NFe Canceladas</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatNumber(sales.canceled.count)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingDownIcon />
                        {canceledPct}%
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      {formatCurrency(Number(sales.canceled.value))}
                    </div>
                    <div className="text-muted-foreground">
                      Taxa de cancelamento
                    </div>
                  </CardFooter>
                </Card>

                <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
                  <CardHeader>
                    <CardDescription>Ticket Médio</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatCurrency(Number(sales.averageTicket.value))}
                    </CardTitle>
                    <CardAction>
                      <Badge variant="outline">
                        <TrendingUpIcon />
                        Ativas
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                      Média diária:{" "}
                      {formatNumber(Math.round(Number(sales.averageDaily.count)))}{" "}
                      vendas
                      <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      {formatCurrency(Number(sales.averageDaily.value))} /dia
                    </div>
                  </CardFooter>
                </Card>
              </>
            ) : null}
          </div>
        </div>

        {/* Ligações */}
        <CallsSection refreshKey={refreshKey} from={from} to={to} extensionUuid={extensionUuid} extensionNumber={extensionNumber} branchId={branchId} />

        {/* WhatsApp */}
        <WhatsAppSection refreshKey={refreshKey} from={from} to={to} chatId={chatId} sellerId={sellerId} branchId={branchId} />
      </div>

      {session && (
        <KpiDrilldownDialog
          open={drilldownOpen}
          onOpenChange={setDrilldownOpen}
          kind={drilldownKind}
          token={session.accessToken}
          tenantId={session.tenantId}
          from={from}
          to={to}
          sellerId={sellerId}
          branchId={branchId}
          referenceAt={`${to}T23:59:59-03:00`}
        />
      )}
    </>
  )
}
