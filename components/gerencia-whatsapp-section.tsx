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
  MessageCircleIcon,
  MailIcon,
  UsersIcon,
  ClockIcon,
  TrendingUpIcon,
  TagIcon,
} from "lucide-react"
import type { WhatsAppKpiData } from "@/lib/gerencia-kpi-types"

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

const tagsBarConfig = {
  sessions: { label: "Sessões da Tag", color: "var(--color-chart-4)" },
} satisfies ChartConfig

const tagComparisonConfig = {
  tagSessions: { label: "Sessões da Tag", color: "var(--color-chart-4)" },
  budgets: { label: "Orçamentos Abertos", color: "var(--color-chart-3)" },
} satisfies ChartConfig

export function GerenciaWhatsAppSection({ data }: { data: WhatsAppKpiData }) {
  const { summary, ranking, sessionsHourly, messagesHourly, tagComparison } = data

  const topSessionPeaks = React.useMemo(
    () =>
      [...sessionsHourly.rows]
        .sort((a, b) => b.sessionsCount - a.sessionsCount)
        .slice(0, 3),
    [sessionsHourly.rows],
  )

  const topMessagePeaks = React.useMemo(
    () =>
      [...messagesHourly.rows]
        .sort((a, b) => b.receivedMessagesCount - a.receivedMessagesCount)
        .slice(0, 3),
    [messagesHourly.rows],
  )

  const topAgents = ranking.rows.slice(0, 3)

  const tagsBarPreviewData = sessionsHourly.rows
    .filter((r) => {
      const h = parseInt(r.hour, 10)
      return h >= 8 && h <= 18
    })
    .map((r) => ({ hour: `${r.hour}h`, sessions: r.sessionsCount }))

  const tagComparisonChartData = tagComparison.rows
    .filter((r) => {
      const h = parseInt(r.hour, 10)
      return h >= 8 && h <= 18
    })
    .map((r) => ({
      hour: `${r.hour}h`,
      tagSessions: r.tagSessionsCount,
      budgets: r.openBudgetsCount,
    }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        <Card className="@container/card bg-sky-50 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/60">
          <CardHeader>
            <CardDescription>Total de Conversas</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.totalConversations.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <MessageCircleIcon className="size-3" />
                Sessões
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <TrendingUpIcon className="size-4" />
              Conversas no período
            </div>
            <div className="text-muted-foreground">Período consolidado</div>
          </CardFooter>
        </Card>

        <Card className="@container/card bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60">
          <CardHeader>
            <CardDescription>Mensagens Recebidas</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {formatNumber(summary.receivedMessages.count)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <MailIcon className="size-3" />
                Recebidas
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              <TrendingUpIcon className="size-4" />
              Total recebidas
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
                  {formatNumber(a.sessionsCount)}
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>

        <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
          <CardHeader>
            <CardDescription>Picos de Sessões</CardDescription>
            <CardTitle className="text-lg font-semibold">Top 3 Horários</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <ClockIcon className="size-3" />
                Sessões
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {topSessionPeaks.map((p) => (
              <div
                key={p.hour}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span>{p.hour}:00</span>
                <span className="font-medium">
                  {formatNumber(p.sessionsCount)} sessões
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>

        <Card className="@container/card bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60">
          <CardHeader>
            <CardDescription>Picos de Mensagens</CardDescription>
            <CardTitle className="text-lg font-semibold">Top 3 Horários</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <ClockIcon className="size-3" />
                Mensagens
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {topMessagePeaks.map((p) => (
              <div
                key={p.hour}
                className="flex w-full justify-between gap-2 tabular-nums"
              >
                <span>{p.hour}:00</span>
                <span className="font-medium">
                  {formatNumber(p.receivedMessagesCount)} msg
                </span>
              </div>
            ))}
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="size-4" />
              Tags por Hora
            </CardTitle>
            <CardDescription>Sessões da tag Orçamento — gráfico de barras</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tagsBarConfig} className="aspect-[2/1] w-full">
              <BarChart data={tagsBarPreviewData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="size-4" />
              Tag vs Orçamentos
            </CardTitle>
            <CardDescription>Comparativo por hora — sessões da tag vs orçamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={tagComparisonConfig} className="aspect-[2/1] w-full">
              <LineChart data={tagComparisonChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="tagSessions" stroke="var(--color-tagSessions)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="budgets" stroke="var(--color-budgets)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
