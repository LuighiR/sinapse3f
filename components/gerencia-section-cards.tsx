"use client"

import * as React from "react"
import { format } from "date-fns"
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
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FileSpreadsheetIcon,
  ShoppingCartIcon,
  ClockIcon,
  Building2Icon,
} from "lucide-react"
import type { BudgetSummary, FollowUpSummary, SalesSummary } from "@/lib/api"
import {
  CITIES,
  CITY_DATA,
  GERAL_DATA,
  type CityKpiData,
} from "@/lib/mock-gerencia-data"
import {
  GerenciaCallsSection,
  GerenciaCallsSectionHeader,
} from "@/components/gerencia-calls-section"
import {
  GerenciaWhatsAppSection,
  GerenciaWhatsAppSectionHeader,
} from "@/components/gerencia-whatsapp-section"

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

function CityBlock({
  title,
  subtitle,
  data,
}: {
  title: string
  subtitle?: string
  data: CityKpiData
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <BudgetCards data={data.budgets} />
    </div>
  )
}

function CityFollowUpBlock({ title, data }: { title: string; data: FollowUpSummary }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <FollowUpCards data={data} />
    </div>
  )
}

function CitySalesBlock({
  title,
  data,
}: {
  title: string
  data: CityKpiData
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-muted-foreground" />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <SalesCards
        sales={data.sales}
        salesWithBudget={data.salesWithBudget}
        salesWithoutBudget={data.salesWithoutBudget}
      />
    </div>
  )
}

export function GerenciaSectionCards() {
  const periodLabel = format(new Date(), "MMMM yyyy", { locale: ptBR })

  return (
    <div className="flex flex-col gap-8 px-4 lg:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-muted-foreground capitalize">
          Visão consolidada · {periodLabel}
        </p>
        <Badge variant="secondary">Mock</Badge>
      </div>

      {/* Orçamentos */}
      <div className="flex flex-col gap-6" id="orcamentos">
        <div className="flex items-center gap-2">
          <FileSpreadsheetIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Orçamentos</h2>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </h3>
          <BudgetCards data={GERAL_DATA.budgets} />
        </div>

        {CITIES.map((city) => (
          <CityBlock
            key={`budget-${city}`}
            title={city}
            data={CITY_DATA[city]}
          />
        ))}
      </div>

      {/* Follow-up */}
      <div className="flex flex-col gap-6" id="follow-up">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Follow-up de Orçamentos</h2>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </h3>
          <FollowUpCards data={GERAL_DATA.followUp} />
        </div>

        {CITIES.map((city) => (
          <CityFollowUpBlock
            key={`followup-${city}`}
            title={city}
            data={CITY_DATA[city].followUp}
          />
        ))}
      </div>

      {/* Vendas */}
      <div className="flex flex-col gap-6" id="vendas">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Vendas</h2>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </h3>
          <SalesCards
            sales={GERAL_DATA.sales}
            salesWithBudget={GERAL_DATA.salesWithBudget}
            salesWithoutBudget={GERAL_DATA.salesWithoutBudget}
          />
        </div>

        {CITIES.map((city) => (
          <CitySalesBlock
            key={`sales-${city}`}
            title={city}
            data={CITY_DATA[city]}
          />
        ))}
      </div>

      {/* Ligações */}
      <div className="flex flex-col gap-6" id="ligacoes">
        <GerenciaCallsSectionHeader />

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </h3>
          <GerenciaCallsSection data={GERAL_DATA.calls} />
        </div>

        {CITIES.map((city) => (
          <div
            key={`calls-${city}`}
            className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 lg:p-5"
          >
            <div className="flex items-center gap-2">
              <Building2Icon className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">{city}</h3>
            </div>
            <GerenciaCallsSection data={CITY_DATA[city].calls} />
          </div>
        ))}
      </div>

      {/* WhatsApp */}
      <div className="flex flex-col gap-6" id="whatsapp">
        <GerenciaWhatsAppSectionHeader />

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Geral
          </h3>
          <GerenciaWhatsAppSection data={GERAL_DATA.whatsapp} />
        </div>

        {CITIES.map((city) => (
          <div
            key={`whatsapp-${city}`}
            className="flex flex-col gap-4 rounded-lg border border-dashed border-muted-foreground/25 p-4 lg:p-5"
          >
            <div className="flex items-center gap-2">
              <Building2Icon className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">{city}</h3>
            </div>
            <GerenciaWhatsAppSection data={CITY_DATA[city].whatsapp} />
          </div>
        ))}
      </div>
    </div>
  )
}
