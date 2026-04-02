"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  format,
  startOfMonth,
  endOfMonth,
  isFuture,
  isToday,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ArrowLeftIcon,
  SearchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  getBudgetFollowUpDrilldown,
  getEmployees,
  getBranches,
  type FollowUpDrilldownRow,
  type Employee,
  type Branch,
} from "@/lib/api"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/* ── helpers ── */

function toYMD(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function clampToday(d: Date) {
  const now = new Date()
  return d > now ? now : d
}

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

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

const BUDGET_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  WON: { label: "Convertido", variant: "default" },
  OPEN: { label: "Em Aberto", variant: "secondary" },
  LOST: { label: "Cancelado", variant: "destructive" },
}

const FOLLOWUP_WINDOW_LABELS: Record<string, string> = {
  within24h: "≤ 24h",
  after24h: "> 24h",
}

const FOLLOWUP_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  converted: { label: "Convertido", variant: "default" },
  lost: { label: "Não Convertido", variant: "destructive" },
  open: { label: "Não Executado", variant: "secondary" },
}

const WINDOW_FILTER_OPTIONS = [
  { value: "all", label: "Todas Janelas" },
  { value: "within24h", label: "Até 24h" },
  { value: "after24h", label: "Pós 24h" },
]

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos Follow-up" },
  { value: "converted", label: "Convertidos" },
  { value: "lost", label: "Não Convertidos" },
  { value: "open", label: "Não Executados" },
]

const PAGE_SIZE = 25

/* ── main page ── */

export default function FollowUpPage() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (!session) router.replace("/login")
  }, [session, router])

  /* ── read query params (from KPI drilldown navigation) ── */
  const qFrom = searchParams.get("from")
  const qTo = searchParams.get("to")
  const qSellerId = searchParams.get("sellerId")
  const qReferenceAt = searchParams.get("referenceAt")
  const qFollowUpWindow = searchParams.get("followUpWindow")
  const qFollowUpStatus = searchParams.get("followUpStatus")

  /* ── date state ── */
  const now = new Date()

  const [filterMode, setFilterMode] = React.useState<"month" | "range">(
    qFrom && qTo ? "range" : "month",
  )
  const [month, setMonth] = React.useState(() => {
    if (qFrom) return new Date(qFrom + "T12:00:00")
    return now
  })
  const [rangeFrom, setRangeFrom] = React.useState<Date | undefined>(
    qFrom ? new Date(qFrom + "T12:00:00") : undefined,
  )
  const [rangeTo, setRangeTo] = React.useState<Date | undefined>(
    qTo ? new Date(qTo + "T12:00:00") : undefined,
  )

  const from =
    filterMode === "month"
      ? toYMD(startOfMonth(month))
      : rangeFrom
        ? toYMD(rangeFrom)
        : qFrom ?? toYMD(startOfMonth(now))
  const to =
    filterMode === "month"
      ? toYMD(clampToday(endOfMonth(month)))
      : rangeTo
        ? toYMD(rangeTo)
        : qTo ?? toYMD(clampToday(endOfMonth(now)))

  /* referenceAt — from query or computed from `to` end-of-day */
  const referenceAt = qReferenceAt ?? `${to}T23:59:59-03:00`

  /* ── employees ── */
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>(
    qSellerId ?? "all",
  )

  /* ── branches ── */
  const [branches, setBranches] = React.useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>("all")

  React.useEffect(() => {
    if (!session) return
    getEmployees({ token: session.accessToken, tenantId: session.tenantId })
      .then(setEmployees)
      .catch(() => {})
    getBranches({ token: session.accessToken, tenantId: session.tenantId })
      .then(setBranches)
      .catch(() => {})
  }, [session])

  const selectedEmployee =
    selectedEmployeeId !== "all"
      ? employees.find((e) => String(e.id) === selectedEmployeeId)
      : undefined
  const sellerId = selectedEmployee
    ? String(selectedEmployee.erpId)
    : qSellerId ?? undefined
  const branchId = selectedBranchId !== "all" ? selectedBranchId : undefined

  /* ── follow-up filters ── */
  const [followUpWindow, setFollowUpWindow] = React.useState<string>(
    qFollowUpWindow ?? "all",
  )
  const [followUpStatus, setFollowUpStatus] = React.useState<string>(
    qFollowUpStatus ?? "all",
  )

  /* ── search ── */
  const [search, setSearch] = React.useState("")

  /* ── data fetching ── */
  const [rows, setRows] = React.useState<FollowUpDrilldownRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(0)

  const fetchKey = React.useRef(0)

  React.useEffect(() => {
    if (!session) return
    const key = ++fetchKey.current
    setLoading(true)
    setError(null)
    setPage(0)

    getBudgetFollowUpDrilldown({
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      referenceAt,
      sellerId,
      branchId,
      followUpWindow: followUpWindow !== "all" ? followUpWindow : undefined,
      followUpStatus: followUpStatus !== "all" ? followUpStatus : undefined,
    })
      .then((data) => {
        if (key !== fetchKey.current) return
        setRows(data.rows)
      })
      .catch((e: Error) => {
        if (key !== fetchKey.current) return
        setError(e.message)
      })
      .finally(() => {
        if (key !== fetchKey.current) return
        setLoading(false)
      })
  }, [session, from, to, referenceAt, sellerId, branchId, followUpWindow, followUpStatus])

  /* ── client-side search filter ── */
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.customerName?.toLowerCase().includes(q) ||
        r.sellerName?.toLowerCase().includes(q) ||
        r.davId?.toLowerCase().includes(q) ||
        r.cpfCnpj?.includes(q),
    )
  }, [rows, search])

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  /* ── totals ── */
  const totals = React.useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        count: acc.count + 1,
        value: acc.value + Number(r.valueAmount),
      }),
      { count: 0, value: 0 },
    )
  }, [filtered])

  if (!session) return null

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 px-4 md:gap-6 md:py-6 lg:px-6">
              {/* ── header ── */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard")}
                  >
                    <ArrowLeftIcon className="size-4" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Follow-up de Orçamentos
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Detalhamento de follow-up no período
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="tabular-nums">
                    {formatNumber(totals.count)} registros
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {formatCurrency(totals.value)}
                  </Badge>
                </div>
              </div>

              {/* ── filters bar ── */}
              <div className="flex flex-wrap items-center gap-2">
                {/* date mode toggle */}
                <div className="flex rounded-md border">
                  <Button
                    size="sm"
                    variant={filterMode === "month" ? "default" : "ghost"}
                    className="rounded-r-none h-8 text-xs"
                    onClick={() => setFilterMode("month")}
                  >
                    MÊS
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === "range" ? "default" : "ghost"}
                    className="rounded-l-none h-8 text-xs"
                    onClick={() => setFilterMode("range")}
                  >
                    RANGE
                  </Button>
                </div>

                {filterMode === "month" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setMonth(
                          (p) =>
                            new Date(p.getFullYear(), p.getMonth() - 1, 1),
                        )
                      }
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    <span className="min-w-[110px] text-center text-sm font-medium capitalize">
                      {format(month, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={
                        isFuture(
                          startOfMonth(
                            new Date(
                              month.getFullYear(),
                              month.getMonth() + 1,
                              1,
                            ),
                          ),
                        )
                      }
                      onClick={() =>
                        setMonth(
                          (p) =>
                            new Date(p.getFullYear(), p.getMonth() + 1, 1),
                        )
                      }
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                      >
                        <CalendarIcon className="size-3.5" />
                        {rangeFrom && rangeTo
                          ? `${format(rangeFrom, "dd/MM")} – ${format(rangeTo, "dd/MM/yyyy")}`
                          : "Selecionar período"}
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
                        onSelect={(r) => {
                          setRangeFrom(r?.from)
                          setRangeTo(r?.to)
                        }}
                        disabled={(d) => isFuture(d) && !isToday(d)}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* employee/seller filter */}
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Todos Vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Vendedores</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* branch filter */}
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Todas Filiais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Filiais</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* follow-up window filter */}
                <Select value={followUpWindow} onValueChange={setFollowUpWindow}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* follow-up status filter */}
                <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* local search */}
                <div className="relative ml-auto">
                  <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente, vendedor..."
                    className="h-8 w-[220px] pl-8 text-xs"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(0)
                    }}
                  />
                </div>
              </div>

              {/* ── table ── */}
              <div className="rounded-lg border bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="w-[100px]">Status Orç.</TableHead>
                        <TableHead className="w-[80px]">Janela</TableHead>
                        <TableHead className="w-[120px]">Follow-up</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Filial</TableHead>
                        <TableHead className="text-right w-[130px]">
                          Valor
                        </TableHead>
                        <TableHead className="w-[90px]">DAV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading &&
                        Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 10 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}

                      {error && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center text-destructive py-8"
                          >
                            {error}
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading && !error && paginated.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center text-muted-foreground py-8"
                          >
                            Nenhum registro de follow-up encontrado no período
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading &&
                        paginated.map((row) => {
                          const bst = BUDGET_STATUS_LABELS[row.statusNormalized] ?? {
                            label: row.statusNormalized,
                            variant: "outline" as const,
                          }
                          const fst = FOLLOWUP_STATUS_LABELS[row.followUpStatus] ?? {
                            label: row.followUpStatus,
                            variant: "outline" as const,
                          }
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="tabular-nums text-xs">
                                {formatDate(row.budgetDate)}
                              </TableCell>
                              <TableCell
                                className="max-w-[200px] truncate text-xs"
                                title={row.customerName}
                              >
                                {row.customerName}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.sellerName}
                              </TableCell>
                              <TableCell>
                                <Badge variant={bst.variant} className="text-xs">
                                  {bst.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {FOLLOWUP_WINDOW_LABELS[row.followUpWindow] ?? row.followUpWindow}
                              </TableCell>
                              <TableCell>
                                <Badge variant={fst.variant} className="text-xs">
                                  {fst.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.channel ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.branchName}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-medium">
                                {formatCurrency(Number(row.valueAmount))}
                              </TableCell>
                              <TableCell className="tabular-nums text-xs">
                                {row.davId ?? "—"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                </div>

                {/* ── pagination ── */}
                {!loading && filtered.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Página {page + 1} de {totalPages} ·{" "}
                      {formatNumber(filtered.length)} registros
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page === 0}
                        onClick={() => setPage(0)}
                      >
                        <ChevronsLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeftIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(totalPages - 1)}
                      >
                        <ChevronsRightIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
