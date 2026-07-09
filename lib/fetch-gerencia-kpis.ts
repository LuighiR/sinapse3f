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

async function fetchScopeKpis(
  opts: KpiOpts,
  referenceAt: string,
): Promise<CityKpiData> {
  const [
    budgets,
    sales,
    salesWithBudget,
    salesWithoutBudget,
    followUp,
    callsSummary,
    callsHourly,
    callsRanking,
    callsComparison,
    waSummary,
    waRanking,
    waSessionsHourly,
    waMessagesHourly,
    waTags,
  ] = await Promise.all([
    getBudgetSummary(opts),
    getSalesSummary(opts),
    getSalesSummary({ ...opts, hasLinkedBudget: "true" }),
    getSalesSummary({ ...opts, hasLinkedBudget: "false" }),
    getBudgetFollowUp({ ...opts, referenceAt }),
    getCallsSummary(opts),
    getCallsHourly(opts),
    getCallsAgentsRanking(opts),
    getCallsHourlyComparison(opts),
    getWhatsAppSummary(opts),
    getWhatsAppAgentsRanking(opts),
    getWhatsAppSessionsHourly(opts),
    getWhatsAppMessagesHourly(opts),
    getWhatsAppTags(opts),
  ])

  const tagId = waTags.tags[0]?.tagId
  let tagComparison = emptyTagComparison(opts.from, opts.to)
  if (tagId) {
    try {
      tagComparison = await getWhatsAppTagComparison({ ...opts, tagId })
    } catch (e) {
      console.error("[Gerencia] whatsapp tag comparison", e)
    }
  }

  const calls: CallsKpiData = {
    summary: callsSummary,
    hourly: callsHourly,
    ranking: callsRanking,
    comparison: callsComparison,
  }

  const whatsapp: WhatsAppKpiData = {
    summary: waSummary,
    ranking: waRanking,
    sessionsHourly: waSessionsHourly,
    messagesHourly: waMessagesHourly,
    tagComparison,
  }

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
