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
} from "@/lib/api"
import type {
  BranchKpiData,
  CallsKpiData,
  CityKpiData,
  GerenciaKpiBundle,
  WhatsAppKpiData,
} from "@/lib/gerencia-kpi-types"

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

export async function fetchGerenciaKpis(opts: {
  token: string
  tenantId: string
  from: string
  to: string
}): Promise<GerenciaKpiBundle> {
  const { token, tenantId, from, to } = opts
  const referenceAt = `${to}T23:59:59-03:00`
  const baseOpts: KpiOpts = { token, tenantId, from, to }

  const branches = await getBranches({ token, tenantId })

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

  return { geral, branches: branchEntries }
}
