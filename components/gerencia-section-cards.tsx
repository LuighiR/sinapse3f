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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FileSpreadsheetIcon,
  ShoppingCartIcon,
  ClockIcon,
  Building2Icon,
  PhoneIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  CalendarIcon,
} from "lucide-react"
import { toast } from "sonner"
import type { BudgetSummary, Employee, FollowUpSummary, SalesSummary } from "@/lib/api"
import {
  getEmployees,
  refreshBudgets,
  refreshCalls,
  refreshSales,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { fetchGerenciaKpis } from "@/lib/fetch-gerencia-kpis"
import type { FetchGerenciaKpisResult } from "@/lib/fetch-gerencia-kpis"
import type { BranchKpiData, CityKpiData } from "@/lib/gerencia-kpi-types"
import {
  GerenciaCallsSection,
} from "@/components/gerencia-calls-section"
import {
  GerenciaWhatsAppSection,
} from "@/components/gerencia-whatsapp-section"
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
import { cn } from "@/lib/utils"

function toYMD(d: Date) {
  return format(d, "yyyy-MM-dd")
}

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

function BudgetCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

function FollowUpCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

function SalesCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

function CommsCardsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

type SectionTheme = "sky" | "emerald" | "violet" | "amber" | "green"

const SECTION_THEME: Record<
  SectionTheme,
  { border: string; icon: string; badge: string }
> = {
  sky: {
    border: "border-l-sky-500/80",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    badge: "bg-sky-100/80 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200",
  },
  emerald: {
    border: "border-l-emerald-500/80",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    badge: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200",
  },
  violet: {
    border: "border-l-violet-500/80",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    badge: "bg-violet-100/80 text-violet-800 dark:bg-violet-950/80 dark:text-violet-200",
  },
  amber: {
    border: "border-l-amber-500/80",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    badge: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200",
  },
  green: {
    border: "border-l-green-600/80",
    icon: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    badge: "bg-green-100/80 text-green-800 dark:bg-green-950/80 dark:text-green-200",
  },
}

function GerenciaSectionZone({
  id,
  title,
  icon,
  theme,
  shaded,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  theme: SectionTheme
  shaded: boolean
  children: React.ReactNode
}) {
  const styles = SECTION_THEME[theme]

  return (
    <section
      id={id}
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border/70 border-l-4 p-5 shadow-xs lg:p-7",
        styles.border,
        shaded
          ? "bg-muted/50 dark:bg-muted/25"
          : "bg-background dark:bg-background",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5",
            styles.icon,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Visão geral e detalhamento por filial
          </p>
        </div>
        <Badge variant="outline" className={cn("hidden sm:inline-flex", styles.badge)}>
          Seção
        </Badge>
      </div>
      {children}
    </section>
  )
}

function GerenciaSubsection({
  title,
  variant = "geral",
  children,
}: {
  title: string
  variant?: "geral" | "cidade"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 lg:p-5",
        variant === "geral"
          ? "border-border/50 bg-background/90 shadow-xs dark:bg-background/60"
          : "border-dashed border-muted-foreground/30 bg-background/95 dark:bg-background/70",
      )}
    >
      <div className="flex items-center gap-2">
        {variant === "cidade" && (
          <Building2Icon className="size-4 text-muted-foreground" />
        )}
        <h3
          className={cn(
            "font-semibold",
            variant === "geral"
              ? "text-sm uppercase tracking-wide text-muted-foreground"
              : "text-base",
          )}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
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

function formatPct(value: number) {
  return value.toFixed(1)
}

function formatFollowUpPct(value: string) {
  return Number(value).toFixed(2).replace(".", ",")
}

interface BudgetCardsProps {
  data: BudgetSummary
}

function BudgetCards({ data }: BudgetCardsProps) {
  const wonPct =
    data.total.count > 0
      ? formatPct((data.won.count / data.total.count) * 100)
      : "0"
  const openPct =
    data.total.count > 0
      ? formatPct((data.open.count / data.total.count) * 100)
      : "0"
  const lostPct =
    data.total.count > 0
      ? formatPct((data.lost.count / data.total.count) * 100)
      : "0"

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
        <CardHeader>
          <CardDescription>Total de Orçamentos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.total.count)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              {formatCurrency(Number(data.total.value))}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Volume total no período
          </div>
          <div className="text-muted-foreground">Quantidade e valor bruto</div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
        <CardHeader>
          <CardDescription>Fechados</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.won.count)}
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
            {formatCurrency(Number(data.won.value))}
          </div>
          <div className="text-muted-foreground">Taxa de conversão no período</div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
        <CardHeader>
          <CardDescription>Em Aberto</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.open.count)}
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
            {formatCurrency(Number(data.open.value))}
          </div>
          <div className="text-muted-foreground">Aguardando fechamento</div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60">
        <CardHeader>
          <CardDescription>Perdidos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(data.lost.count)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              {lostPct}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {formatCurrency(Number(data.lost.value))}
          </div>
          <div className="text-muted-foreground">
            Orçamentos cancelados no período
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

interface FollowUpCardsProps {
  data: FollowUpSummary
}

function FollowUpCards({ data }: FollowUpCardsProps) {
  return (
    <div className="flex flex-col gap-6">
      {data.total && (
        <div className="flex items-baseline gap-4 text-sm text-muted-foreground">
          <span>
            Total:{" "}
            <strong className="text-foreground">
              {formatNumber(data.total.count)}
            </strong>{" "}
            orçamentos
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground">
              {formatCurrency(Number(data.total.value))}
            </strong>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-baseline gap-2">
          Janela de 24h
          {data.within24h.total && (
            <span className="text-xs font-normal normal-case">
              — {formatNumber(data.within24h.total.count)} orçamentos ·{" "}
              {formatCurrency(Number(data.within24h.total.value))}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3">
          <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
            <CardHeader>
              <CardDescription>Follow UP convertidos</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.within24h.converted.percentage)}%
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
                Quantidade: {formatNumber(data.within24h.converted.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.within24h.converted.value))}
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60">
            <CardHeader>
              <CardDescription>Follow UP não convertidos</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-rose-500 dark:text-rose-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.within24h.lost.percentage)}%
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
                Quantidade: {formatNumber(data.within24h.lost.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.within24h.lost.value))}
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
            <CardHeader>
              <CardDescription>Follow UP não executados</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.within24h.open.percentage)}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline">Em aberto</Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="font-medium">
                Quantidade: {formatNumber(data.within24h.open.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.within24h.open.value))}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase flex items-baseline gap-2">
          Pós 24h
          {data.after24h.total && (
            <span className="text-xs font-normal normal-case">
              — {formatNumber(data.after24h.total.count)} orçamentos ·{" "}
              {formatCurrency(Number(data.after24h.total.value))}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3">
          <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
            <CardHeader>
              <CardDescription>Follow UP convertidos</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.after24h.converted.percentage)}%
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
                Quantidade: {formatNumber(data.after24h.converted.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.after24h.converted.value))}
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60">
            <CardHeader>
              <CardDescription>Follow UP não convertidos</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-rose-500 dark:text-rose-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.after24h.lost.percentage)}%
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
                Quantidade: {formatNumber(data.after24h.lost.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.after24h.lost.value))}
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
            <CardHeader>
              <CardDescription>Follow UP não executados</CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-300 @[250px]/card:text-4xl">
                {formatFollowUpPct(data.after24h.open.percentage)}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline">Em aberto</Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="font-medium">
                Quantidade: {formatNumber(data.after24h.open.count)}
              </div>
              <div className="text-muted-foreground">
                {formatCurrency(Number(data.after24h.open.value))}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface SalesCardsProps {
  sales: SalesSummary
  salesWithBudget: Pick<SalesSummary, "active">
  salesWithoutBudget: Pick<SalesSummary, "active">
}

function SalesCards({
  sales,
  salesWithBudget,
  salesWithoutBudget,
}: SalesCardsProps) {
  const activeWithBudgetPct =
    sales.active.count > 0
      ? formatPct(
          (salesWithBudget.active.count / sales.active.count) * 100,
        )
      : "0"
  const activeWithoutBudgetPct =
    sales.active.count > 0
      ? formatPct(
          (salesWithoutBudget.active.count / sales.active.count) * 100,
        )
      : "0"
  const canceledPct =
    sales.total.count > 0
      ? formatPct((sales.canceled.count / sales.total.count) * 100)
      : "0"

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
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
          <div className="text-muted-foreground">Período selecionado</div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
        <CardHeader>
          <CardDescription>Ativas c/ Orçamento</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(salesWithBudget.active.count)}
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
            {formatCurrency(Number(salesWithBudget.active.value))}
          </div>
          <div className="text-muted-foreground">
            Vendas com orçamento vinculado
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
        <CardHeader>
          <CardDescription>Ativas s/ Orçamento</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatNumber(salesWithoutBudget.active.count)}
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
            {formatCurrency(Number(salesWithoutBudget.active.value))}
          </div>
          <div className="text-muted-foreground">
            Vendas sem orçamento vinculado
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60">
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
          <div className="text-muted-foreground">Taxa de cancelamento</div>
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
            {formatNumber(Math.round(Number(sales.averageDaily.count)))} vendas
            <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {formatCurrency(Number(sales.averageDaily.value))} /dia
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

function CityBlock({ title, data }: { title: string; data: CityKpiData }) {
  return (
    <GerenciaSubsection title={title} variant="cidade">
      <BudgetCards data={data.budgets} />
    </GerenciaSubsection>
  )
}

function CityFollowUpBlock({ title, data }: { title: string; data: FollowUpSummary }) {
  return (
    <GerenciaSubsection title={title} variant="cidade">
      <FollowUpCards data={data} />
    </GerenciaSubsection>
  )
}

function CitySalesBlock({ title, data }: { title: string; data: CityKpiData }) {
  return (
    <GerenciaSubsection title={title} variant="cidade">
      <SalesCards
        sales={data.sales}
        salesWithBudget={data.salesWithBudget}
        salesWithoutBudget={data.salesWithoutBudget}
      />
    </GerenciaSubsection>
  )
}

type GerenciaSectionCardsProps = {
  mode?: "overview" | "employee"
}

export function GerenciaSectionCards({
  mode = "overview",
}: GerenciaSectionCardsProps) {
  const { session } = useAuth()
  const [filterMode, setFilterMode] = React.useState<"month" | "range">("month")
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date())
  const [rangeFrom, setRangeFrom] = React.useState<Date | undefined>(undefined)
  const [rangeTo, setRangeTo] = React.useState<Date | undefined>(undefined)
  const [data, setData] = React.useState<FetchGerenciaKpisResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [loadError, setLoadError] = React.useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("")
  const [employees, setEmployees] = React.useState<Employee[]>([])

  const { from, to } = React.useMemo(() => {
    if (filterMode === "month") {
      const start = startOfMonth(selectedMonth)
      const end = clampToday(endOfMonth(selectedMonth))
      return { from: toYMD(start), to: toYMD(end) }
    }
    if (rangeFrom && rangeTo) {
      return { from: toYMD(rangeFrom), to: toYMD(rangeTo) }
    }
    const now = new Date()
    return { from: toYMD(startOfMonth(now)), to: toYMD(now) }
  }, [filterMode, selectedMonth, rangeFrom, rangeTo])

  const selectedEmployee = React.useMemo(
    () => employees.find((e) => String(e.id) === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  )

  React.useEffect(() => {
    if (mode !== "employee" || !session) return
    getEmployees({ token: session.accessToken, tenantId: session.tenantId })
      .then(setEmployees)
      .catch(() => {
        toast.error("Erro ao carregar colaboradores")
        setEmployees([])
      })
  }, [mode, session])

  const fetchData = React.useCallback(() => {
    if (!session) return
    if (mode === "employee" && !selectedEmployee) {
      setData(null)
      setLoading(false)
      setLoadError(false)
      return
    }
    setLoading(true)
    setLoadError(false)
    fetchGerenciaKpis({
      token: session.accessToken,
      tenantId: session.tenantId,
      from,
      to,
      ...(mode === "employee" && selectedEmployee
        ? { employee: selectedEmployee }
        : {}),
    })
      .then((result) => {
        setData(result)
        if (mode === "employee" && result.failedBranchIds.length > 0) {
          for (const id of result.failedBranchIds) {
            const name =
              result.branches.find((b) => b.branch.id === id)?.branch.name ??
              String(id)
            toast.error(`Erro ao carregar KPIs de ${name}`)
          }
        }
        if (result.whatsappCitiesLoadFailed) {
          toast.error("Erro ao carregar cidades do WhatsApp")
        }
        if (result.failedWhatsAppCityIds.length > 0) {
          for (const id of result.failedWhatsAppCityIds) {
            const name =
              result.whatsappCities.find((c) => c.city.id === id)?.city.name ??
              id
            toast.error(`Erro ao carregar WhatsApp de ${name}`)
          }
        }
      })
      .catch((e) => {
        console.error("[Gerencia] KPIs", e)
        setLoadError(true)
        setData(null)
        toast.error(
          mode === "employee"
            ? "Erro ao carregar dados da gerência"
            : "Erro ao carregar dados da diretoria",
        )
      })
      .finally(() => setLoading(false))
  }, [session, from, to, mode, selectedEmployee])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefresh() {
    if (!session || refreshing) return
    if (mode === "employee" && !selectedEmployee) return
    setRefreshing(true)
    try {
      const opts = {
        token: session.accessToken,
        tenantId: session.tenantId,
        from,
        to,
      }
      await Promise.all([
        refreshBudgets(opts),
        refreshSales(opts),
        refreshCalls(opts),
      ])
      toast.success("KPIs atualizados com sucesso")
      const result = await fetchGerenciaKpis({
        ...opts,
        ...(mode === "employee" && selectedEmployee
          ? { employee: selectedEmployee }
          : {}),
      })
      setData(result)
      if (mode === "employee" && result.failedBranchIds.length > 0) {
        for (const id of result.failedBranchIds) {
          const name =
            result.branches.find((b) => b.branch.id === id)?.branch.name ??
            String(id)
          toast.error(`Erro ao carregar KPIs de ${name}`)
        }
      }
      if (result.whatsappCitiesLoadFailed) {
        toast.error("Erro ao carregar cidades do WhatsApp")
      }
      if (result.failedWhatsAppCityIds.length > 0) {
        for (const id of result.failedWhatsAppCityIds) {
          const name =
            result.whatsappCities.find((c) => c.city.id === id)?.city.name ??
            id
          toast.error(`Erro ao carregar WhatsApp de ${name}`)
        }
      }
    } catch {
      toast.error("Erro ao atualizar KPIs")
    } finally {
      setRefreshing(false)
    }
  }

  const periodLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR })
  const isCurrentMonth =
    selectedMonth.getFullYear() === new Date().getFullYear() &&
    selectedMonth.getMonth() === new Date().getMonth()

  const branches = data?.branches ?? []
  const whatsappCities = data?.whatsappCities ?? []
  const showEmptyEmployeeState = mode === "employee" && !selectedEmployee

  if (!loading && loadError) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 lg:px-6">
        <p className="text-sm text-muted-foreground">
          {mode === "employee"
            ? "Não foi possível carregar os KPIs da gerência."
            : "Não foi possível carregar os KPIs da diretoria."}
        </p>
        <Button variant="outline" onClick={fetchData}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setSelectedMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
            >
              <span className="sr-only">Mês anterior</span>
              <CalendarIcon className="size-4" />
              <span className="text-xs">‹</span>
            </Button>
            <span className="min-w-[120px] text-center text-sm font-medium capitalize">
              {periodLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={isCurrentMonth}
              onClick={() =>
                setSelectedMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
            >
              <span className="sr-only">Próximo mês</span>
              <CalendarIcon className="size-4" />
              <span className="text-xs">›</span>
            </Button>
          </div>
        ) : (
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
                  rangeFrom ??
                  new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
                }
              />
            </PopoverContent>
          </Popover>
        )}

        <span className="text-xs text-muted-foreground">
          {from} → {to}
        </span>

        {mode === "employee" && (
          <Select
            value={selectedEmployeeId || undefined}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing || loading || showEmptyEmployeeState}
          onClick={handleRefresh}
          className="ml-auto gap-2"
        >
          <RefreshCwIcon
            className={`size-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Atualizando..." : "Atualizar KPIs"}
        </Button>
      </div>

      {showEmptyEmployeeState ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione um colaborador para ver os KPIs por cidade.
          </p>
        </div>
      ) : (
        <>
      <GerenciaSectionZone
        id="orcamentos"
        title="Orçamentos"
        icon={<FileSpreadsheetIcon />}
        theme="sky"
        shaded
      >
        {loading || !data ? (
          <>
            <GerenciaSubsection title="Geral">
              <BudgetCardsSkeleton />
            </GerenciaSubsection>
            {branches.map(({ branch }) => (
              <GerenciaSubsection key={branch.id} title={branch.name} variant="cidade">
                <BudgetCardsSkeleton />
              </GerenciaSubsection>
            ))}
          </>
        ) : (
          <>
            <GerenciaSubsection title="Geral">
              <BudgetCards data={data.geral.budgets} />
            </GerenciaSubsection>
            {data.branches.map(({ branch, data: branchData }) => (
              <CityBlock
                key={`budget-${branch.id}`}
                title={branch.name}
                data={branchData}
              />
            ))}
          </>
        )}
      </GerenciaSectionZone>

      <GerenciaSectionZone
        id="follow-up"
        title="Follow-up de Orçamentos"
        icon={<ClockIcon />}
        theme="emerald"
        shaded={false}
      >
        {loading || !data ? (
          <>
            <GerenciaSubsection title="Geral">
              <FollowUpCardsSkeleton />
            </GerenciaSubsection>
            {branches.map(({ branch }) => (
              <GerenciaSubsection key={branch.id} title={branch.name} variant="cidade">
                <FollowUpCardsSkeleton />
              </GerenciaSubsection>
            ))}
          </>
        ) : (
          <>
            <GerenciaSubsection title="Geral">
              <FollowUpCards data={data.geral.followUp} />
            </GerenciaSubsection>
            {data.branches.map(({ branch, data: branchData }) => (
              <CityFollowUpBlock
                key={`followup-${branch.id}`}
                title={branch.name}
                data={branchData.followUp}
              />
            ))}
          </>
        )}
      </GerenciaSectionZone>

      <GerenciaSectionZone
        id="vendas"
        title="Vendas"
        icon={<ShoppingCartIcon />}
        theme="violet"
        shaded
      >
        {loading || !data ? (
          <>
            <GerenciaSubsection title="Geral">
              <SalesCardsSkeleton />
            </GerenciaSubsection>
            {branches.map(({ branch }) => (
              <GerenciaSubsection key={branch.id} title={branch.name} variant="cidade">
                <SalesCardsSkeleton />
              </GerenciaSubsection>
            ))}
          </>
        ) : (
          <>
            <GerenciaSubsection title="Geral">
              <SalesCards
                sales={data.geral.sales}
                salesWithBudget={data.geral.salesWithBudget}
                salesWithoutBudget={data.geral.salesWithoutBudget}
              />
            </GerenciaSubsection>
            {data.branches.map(({ branch, data: branchData }) => (
              <CitySalesBlock
                key={`sales-${branch.id}`}
                title={branch.name}
                data={branchData}
              />
            ))}
          </>
        )}
      </GerenciaSectionZone>

      <GerenciaSectionZone
        id="ligacoes"
        title="Ligações"
        icon={<PhoneIcon />}
        theme="amber"
        shaded={false}
      >
        {loading || !data ? (
          <>
            <GerenciaSubsection title="Geral">
              <CommsCardsSkeleton />
            </GerenciaSubsection>
            {branches.map(({ branch }) => (
              <GerenciaSubsection key={branch.id} title={branch.name} variant="cidade">
                <CommsCardsSkeleton />
              </GerenciaSubsection>
            ))}
          </>
        ) : (
          <>
            <GerenciaSubsection title="Geral">
              <GerenciaCallsSection
                data={data.geral.calls}
                variant={mode === "employee" ? "employee" : "overview"}
                from={from}
                to={to}
                employeeId={
                  selectedEmployee ? String(selectedEmployee.id) : undefined
                }
              />
            </GerenciaSubsection>
            {data.branches.map(({ branch, data: branchData }) => (
              <GerenciaSubsection
                key={`calls-${branch.id}`}
                title={branch.name}
                variant="cidade"
              >
                <GerenciaCallsSection
                  data={branchData.calls}
                  variant={mode === "employee" ? "employee" : "overview"}
                  from={from}
                  to={to}
                  employeeId={
                    selectedEmployee ? String(selectedEmployee.id) : undefined
                  }
                  branchId={String(branch.id)}
                />
              </GerenciaSubsection>
            ))}
          </>
        )}
      </GerenciaSectionZone>

      <GerenciaSectionZone
        id="whatsapp"
        title="WhatsApp"
        icon={<MessageCircleIcon />}
        theme="green"
        shaded
      >
        {loading || !data ? (
          <>
            <GerenciaSubsection title="Geral">
              <CommsCardsSkeleton />
            </GerenciaSubsection>
            {whatsappCities.map(({ city }) => (
              <GerenciaSubsection
                key={city.id}
                title={city.name}
                variant="cidade"
              >
                <CommsCardsSkeleton />
              </GerenciaSubsection>
            ))}
          </>
        ) : (
          <>
            <GerenciaSubsection title="Geral">
              <GerenciaWhatsAppSection data={data.geral.whatsapp} />
            </GerenciaSubsection>
            {data.whatsappCities.map(({ city, data: cityWa }) => (
              <GerenciaSubsection
                key={`whatsapp-${city.id}`}
                title={city.name}
                variant="cidade"
              >
                <GerenciaWhatsAppSection data={cityWa} />
              </GerenciaSubsection>
            ))}
          </>
        )}
      </GerenciaSectionZone>
        </>
      )}
    </div>
  )
}
