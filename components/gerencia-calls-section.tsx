"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  PhoneIncomingIcon,
  PhoneMissedIcon,
  UsersIcon,
  FileSpreadsheetIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react"
import type { CallsKpiData } from "@/lib/gerencia-kpi-types"

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

const barChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
} satisfies ChartConfig

const comparisonChartConfig = {
  received: { label: "Recebidas", color: "var(--color-chart-1)" },
  lost: { label: "Perdidas", color: "var(--color-chart-2)" },
  budgets: { label: "Orçamentos Televendas", color: "var(--color-chart-3)" },
} satisfies ChartConfig

export function GerenciaCallsSection({ data }: { data: CallsKpiData }) {
  const { summary, hourly, ranking, comparison } = data

  const topPeaks = React.useMemo(
    () =>
      [...hourly.rows]
        .sort((a, b) => b.totalInboundCount - a.totalInboundCount)
        .slice(0, 3),
    [hourly.rows],
  )

  const topAgents = ranking.rows.slice(0, 3)

  const lostPct =
    summary.totalInbound.count > 0
      ? ((summary.lost.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  const receivedPct =
    summary.totalInbound.count > 0
      ? ((summary.received.count / summary.totalInbound.count) * 100).toFixed(1)
      : "0"

  const barChartData = hourly.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
  }))

  const comparisonChartData = comparison.rows.map((r) => ({
    hour: `${r.hour}h`,
    received: r.receivedCount,
    lost: r.lostCount,
    budgets: r.telemarketingBudgetCount,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        <Card className="@container/card bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60">
          <CardHeader>
            <CardDescription>Ligações Perdidas</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.lost.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PhoneMissedIcon className="size-3" />
                {lostPct}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <TrendingDownIcon className="size-4" />
              Do total inbound
            </div>
            <div className="text-muted-foreground">Período consolidado</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
          <CardHeader>
            <CardDescription>Ligações Recebidas</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.received.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PhoneIncomingIcon className="size-3" />
                {receivedPct}%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <TrendingUpIcon className="size-4" />
              Do total inbound
            </div>
            <div className="text-muted-foreground">Período consolidado</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
          <CardHeader>
            <CardDescription>Ranking de Atendentes</CardDescription>
            <CardTitle className="text-lg font-semibold">Top 3</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <UsersIcon className="size-3" />
                Atendentes
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {topAgents.map((a, i) => (
              <div
                key={a.agentKey}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span className="truncate">
                  {i + 1}. {a.agentLabel}
                </span>
                <span className="font-medium">
                  {formatNumber(a.totalInboundCount)}
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>

        <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
          <CardHeader>
            <CardDescription>Orç. Abertos Televendas</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.telemarketingOpenBudgets.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <FileSpreadsheetIcon className="size-3" />
                Televendas
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Orçamentos abertos via ligação
            </div>
            <div className="text-muted-foreground">Canal Pedido Televendas</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
          <CardHeader>
            <CardDescription>Picos por Horário</CardDescription>
            <CardTitle className="text-lg font-semibold">
              Pico: {summary.peakHour.hour}h
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <ClockIcon className="size-3" />
                {formatNumber(summary.peakHour.totalInboundCount)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {topPeaks.map((p) => (
              <div
                key={p.hour}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span>{p.hour}:00</span>
                <span className="font-medium">
                  {formatNumber(p.totalInboundCount)} lig.
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Ligações por Hora</CardTitle>
            <CardDescription>Recebidas vs Perdidas — gráfico de barras</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="aspect-[2/1] w-full">
              <BarChart data={barChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Comparativo por Hora</CardTitle>
            <CardDescription>Ligações vs Orçamentos Televendas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={comparisonChartConfig} className="aspect-[2/1] w-full">
              <LineChart data={comparisonChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="received" stroke="var(--color-received)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lost" stroke="var(--color-lost)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
