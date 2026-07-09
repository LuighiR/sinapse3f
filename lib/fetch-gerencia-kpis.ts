import {
  getBranches,
  getBudgetSummary,
  getBudgetFollowUp,
  getSalesSummary,
  getCallsSummary,
  getCallsHourly,
  getCallsAgentsRanking,
  getCallsHourlyComparison,
  getWhatsAppSummary,
  getWhatsAppAgentsRanking,
  getWhatsAppSessionsHourly,
  getWhatsAppMessagesHourly,
  getWhatsAppTags,
  getWhatsAppTagComparison,
  type KpiOpts,
  type WhatsAppTagComparison,
} from "./api.ts"
import type {
  BranchKpiData,
  CallsKpiData,
  CityKpiData,
  GerenciaKpiBundle,
  WhatsAppKpiData,
} from "./gerencia-kpi-types.ts"
import { aggregateCityKpis } from "./aggregate-city-kpis.ts"
import { emptyCityKpi } from "./empty-city-kpi.ts"
import {
  sellerIdForBranch,
  type NormalizedEmployee,
} from "./normalize-employee.ts"

function emptyTagComparison(from: string, to: string): WhatsAppTagComparison {
  return {
    period: { from, to, key: `${from}_${to}` },
    tagId: "",
    rows: [],
  }
}

function basePeriodOpts(opts: KpiOpts): KpiOpts {
  return {
    token: opts.token,
    tenantId: opts.tenantId,
    from: opts.from,
    to: opts.to,
    ...(opts.branchId ? { branchId: opts.branchId } : {}),
  }
}

/** Budgets/sales/follow-up: branchId + sellerId only (never ramal/chatId). */
function commerceOpts(opts: KpiOpts): KpiOpts {
  return {
    ...basePeriodOpts(opts),
    ...(opts.sellerId ? { sellerId: opts.sellerId } : {}),
  }
}

/** Calls: branchId + extension filters only (sellerId does not filter calls). */
function callsOpts(opts: KpiOpts): KpiOpts {
  return {
    ...basePeriodOpts(opts),
    ...(opts.extensionUuid ? { extensionUuid: opts.extensionUuid } : {}),
    ...(opts.extensionNumber ? { extensionNumber: opts.extensionNumber } : {}),
  }
}

/** WhatsApp analytics: branchId + chatId (sellerId only on tag comparison). */
function whatsappOpts(opts: KpiOpts): KpiOpts {
  return {
    ...basePeriodOpts(opts),
    ...(opts.chatId ? { chatId: opts.chatId } : {}),
  }
}

function whatsappTagComparisonOpts(opts: KpiOpts): KpiOpts {
  return {
    ...whatsappOpts(opts),
    ...(opts.sellerId ? { sellerId: opts.sellerId } : {}),
  }
}

async function fetchCallsSection(
  opts: KpiOpts,
): Promise<CallsKpiData> {
  const cOpts = callsOpts(opts)
  const empty = emptyCityKpi(opts.from, opts.to).calls
  try {
    const [summary, hourly, ranking, comparison] = await Promise.all([
      getCallsSummary(cOpts),
      getCallsHourly(cOpts),
      getCallsAgentsRanking(cOpts),
      getCallsHourlyComparison(cOpts),
    ])
    return { summary, hourly, ranking, comparison }
  } catch (e) {
    console.error("[Gerencia] calls KPIs", e)
    return empty
  }
}

async function fetchWhatsAppSection(
  opts: KpiOpts,
): Promise<WhatsAppKpiData> {
  const wOpts = whatsappOpts(opts)
  const empty = emptyCityKpi(opts.from, opts.to).whatsapp
  try {
    const [summary, ranking, sessionsHourly, messagesHourly, waTags] =
      await Promise.all([
        getWhatsAppSummary(wOpts),
        getWhatsAppAgentsRanking(wOpts),
        getWhatsAppSessionsHourly(wOpts),
        getWhatsAppMessagesHourly(wOpts),
        getWhatsAppTags(wOpts),
      ])

    const tagId = waTags.tags[0]?.tagId
    let tagComparison = emptyTagComparison(opts.from, opts.to)
    if (tagId) {
      try {
        tagComparison = await getWhatsAppTagComparison({
          ...whatsappTagComparisonOpts(opts),
          tagId,
        })
      } catch (e) {
        console.error("[Gerencia] whatsapp tag comparison", e)
      }
    }

    return {
      summary,
      ranking,
      sessionsHourly,
      messagesHourly,
      tagComparison,
    }
  } catch (e) {
    console.error("[Gerencia] whatsapp KPIs", e)
    return empty
  }
}

async function fetchScopeKpis(
  opts: KpiOpts,
  referenceAt: string,
): Promise<CityKpiData> {
  const cOpts = commerceOpts(opts)

  // Commerce failures fail the whole scope (branch marked failed upstream).
  // Calls/WhatsApp failures degrade to empty sections so budgets/sales still show.
  const [budgets, sales, salesWithBudget, salesWithoutBudget, followUp, calls, whatsapp] =
    await Promise.all([
      getBudgetSummary(cOpts),
      getSalesSummary(cOpts),
      getSalesSummary({ ...cOpts, hasLinkedBudget: "true" }),
      getSalesSummary({ ...cOpts, hasLinkedBudget: "false" }),
      getBudgetFollowUp({ ...cOpts, referenceAt }),
      fetchCallsSection(opts),
      fetchWhatsAppSection(opts),
    ])

  return {
    budgets,
    sales,
    salesWithBudget: { active: salesWithBudget.active },
    salesWithoutBudget: { active: salesWithoutBudget.active },
    followUp,
    calls,
    whatsapp,
  }
}

export function planDiretoriaBranches(
  employee: { erpUsers: { erpId: number; branchId: number }[] },
  branches: { id: number; name: string; clientId: string }[],
): { branchId: number; sellerId?: number; skipFetch: boolean }[] {
  return branches.map((branch) => {
    const sellerId = sellerIdForBranch(employee, branch.id)
    if (sellerId === undefined) {
      return { branchId: branch.id, skipFetch: true }
    }
    return { branchId: branch.id, sellerId, skipFetch: false }
  })
}

export type FetchGerenciaKpisResult = GerenciaKpiBundle & {
  /** branchIds com vinculo ERP cuja request de KPI falhou (cidade veio zerada) */
  failedBranchIds: number[]
}

export async function fetchGerenciaKpis(opts: {
  token: string
  tenantId: string
  from: string
  to: string
  employee?: NormalizedEmployee | null
}): Promise<FetchGerenciaKpisResult> {
  const { token, tenantId, from, to, employee } = opts
  const referenceAt = `${to}T23:59:59-03:00`
  const baseOpts: KpiOpts = { token, tenantId, from, to }

  const branches = await getBranches({ token, tenantId })

  if (!employee) {
    const [geral, ...branchDataList] = await Promise.all([
      fetchScopeKpis(baseOpts, referenceAt),
      ...branches.map((branch) =>
        fetchScopeKpis(
          { ...baseOpts, branchId: String(branch.id) },
          referenceAt,
        ),
      ),
    ])

    const branchEntries: BranchKpiData[] = branches.map((branch, index) => ({
      branch,
      data: branchDataList[index],
    }))

    return { geral, branches: branchEntries, failedBranchIds: [] }
  }

  const plan = planDiretoriaBranches(employee, branches)
  const failedBranchIds: number[] = []
  const successfulLinkedCities: CityKpiData[] = []

  const ramalOpts: Pick<
    KpiOpts,
    "extensionUuid" | "extensionNumber" | "chatId"
  > = {}
  if (employee.extensionUuid) ramalOpts.extensionUuid = employee.extensionUuid
  if (employee.extensionNumber) ramalOpts.extensionNumber = employee.extensionNumber
  if (employee.chatId) ramalOpts.chatId = employee.chatId

  const settled = await Promise.allSettled(
    plan.map(async (item) => {
      if (item.skipFetch || item.sellerId === undefined) {
        return { branchId: item.branchId, data: emptyCityKpi(from, to), linked: false }
      }
      const data = await fetchScopeKpis(
        {
          ...baseOpts,
          ...ramalOpts,
          branchId: String(item.branchId),
          sellerId: String(item.sellerId),
        },
        referenceAt,
      )
      return { branchId: item.branchId, data, linked: true }
    }),
  )

  const dataByBranchId = new Map<number, CityKpiData>()
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    const branchId = plan[i].branchId
    if (result.status === "fulfilled") {
      dataByBranchId.set(branchId, result.value.data)
      if (result.value.linked) {
        successfulLinkedCities.push(result.value.data)
      }
    } else {
      dataByBranchId.set(branchId, emptyCityKpi(from, to))
      if (!plan[i].skipFetch) {
        failedBranchIds.push(branchId)
      }
    }
  }

  const branchEntries: BranchKpiData[] = branches.map((branch) => ({
    branch,
    data: dataByBranchId.get(branch.id) ?? emptyCityKpi(from, to),
  }))

  const geral = aggregateCityKpis(successfulLinkedCities, from, to)

  return { geral, branches: branchEntries, failedBranchIds }
}
