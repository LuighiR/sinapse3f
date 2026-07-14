import {
  getBranches,
  getBudgetSummary,
  getBudgetFollowUp,
  getSalesSummary,
  getCallsSummary,
  getCallsHourly,
  getCallsAgentsRanking,
  getCallsHourlyComparison,
  getWhatsAppCities,
  getWhatsAppSummary,
  getWhatsAppAgentsRanking,
  getWhatsAppSessionsHourly,
  getWhatsAppMessagesHourly,
  getWhatsAppTags,
  getWhatsAppTagComparison,
  type KpiOpts,
  type WhatsAppCity,
  type WhatsAppTagComparison,
} from "./api.ts"
import type {
  BranchKpiData,
  CallsKpiData,
  CityKpiData,
  GerenciaKpiBundle,
  WhatsAppCityKpiData,
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

/**
 * WhatsApp analytics: period + chatId + whatsappCityId.
 * Do not send branchId (API ignores it; city filter is whatsappCityId).
 */
function whatsappOpts(opts: KpiOpts): KpiOpts {
  return {
    token: opts.token,
    tenantId: opts.tenantId,
    from: opts.from,
    to: opts.to,
    ...(opts.chatId ? { chatId: opts.chatId } : {}),
    ...(opts.whatsappCityId ? { whatsappCityId: opts.whatsappCityId } : {}),
  }
}

function whatsappTagComparisonOpts(opts: KpiOpts): KpiOpts {
  return {
    ...whatsappOpts(opts),
    ...(opts.sellerId ? { sellerId: opts.sellerId } : {}),
  }
}

async function fetchCallsSection(opts: KpiOpts): Promise<CallsKpiData> {
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

async function fetchWhatsAppSection(opts: KpiOpts): Promise<WhatsAppKpiData> {
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
    throw e
  }
}

async function fetchWhatsAppSectionSafe(
  opts: KpiOpts,
): Promise<{ data: WhatsAppKpiData; failed: boolean }> {
  try {
    const data = await fetchWhatsAppSection(opts)
    return { data, failed: false }
  } catch {
    return {
      data: emptyCityKpi(opts.from, opts.to).whatsapp,
      failed: true,
    }
  }
}

/**
 * Commerce + calls for a branch/scope.
 * WhatsApp is fetched separately (by whatsapp cities), so this leaves WA empty.
 */
async function fetchScopeKpis(
  opts: KpiOpts,
  referenceAt: string,
): Promise<CityKpiData> {
  const cOpts = commerceOpts(opts)
  const emptyWa = emptyCityKpi(opts.from, opts.to).whatsapp

  const [budgets, sales, salesWithBudget, salesWithoutBudget, followUp, calls] =
    await Promise.all([
      getBudgetSummary(cOpts),
      getSalesSummary(cOpts),
      getSalesSummary({ ...cOpts, hasLinkedBudget: "true" }),
      getSalesSummary({ ...cOpts, hasLinkedBudget: "false" }),
      getBudgetFollowUp({ ...cOpts, referenceAt }),
      fetchCallsSection(opts),
    ])

  return {
    budgets,
    sales,
    salesWithBudget: { active: salesWithBudget.active },
    salesWithoutBudget: { active: salesWithoutBudget.active },
    followUp,
    calls,
    whatsapp: emptyWa,
  }
}

async function loadWhatsAppCities(opts: {
  token: string
  tenantId: string
}): Promise<{ cities: WhatsAppCity[]; loadFailed: boolean }> {
  try {
    const cities = await getWhatsAppCities({
      token: opts.token,
      tenantId: opts.tenantId,
      activeOnly: true,
    })
    if (!Array.isArray(cities)) {
      console.error("[Gerencia] whatsapp cities list: unexpected payload", cities)
      return { cities: [], loadFailed: true }
    }
    return { cities, loadFailed: false }
  } catch (e) {
    console.error("[Gerencia] whatsapp cities list", e)
    return { cities: [], loadFailed: true }
  }
}

async function fetchWhatsAppBundle(opts: {
  token: string
  tenantId: string
  from: string
  to: string
  chatId?: string
  sellerId?: string
}): Promise<{
  geralWhatsApp: WhatsAppKpiData
  whatsappCities: WhatsAppCityKpiData[]
  failedWhatsAppCityIds: string[]
  whatsappCitiesLoadFailed: boolean
  geralWhatsAppFailed: boolean
}> {
  const { token, tenantId, from, to, chatId, sellerId } = opts
  const baseWa: KpiOpts = {
    token,
    tenantId,
    from,
    to,
    ...(chatId ? { chatId } : {}),
    ...(sellerId ? { sellerId } : {}),
  }

  const { cities, loadFailed: whatsappCitiesLoadFailed } =
    await loadWhatsAppCities({ token, tenantId })

  const [geralResult, ...citySettled] = await Promise.all([
    fetchWhatsAppSectionSafe(baseWa),
    ...cities.map((city) =>
      fetchWhatsAppSectionSafe({
        ...baseWa,
        whatsappCityId: city.id,
      }).then((result) => ({ city, ...result })),
    ),
  ])

  const failedWhatsAppCityIds: string[] = []
  const whatsappCities: WhatsAppCityKpiData[] = []

  for (const item of citySettled) {
    whatsappCities.push({ city: item.city, data: item.data })
    if (item.failed) failedWhatsAppCityIds.push(item.city.id)
  }

  return {
    geralWhatsApp: geralResult.data,
    whatsappCities,
    failedWhatsAppCityIds,
    whatsappCitiesLoadFailed,
    geralWhatsAppFailed: geralResult.failed,
  }
}

/**
 * Same seller erpId is applied to every branch.
 * KPI `branchId` query param uses internal `branch.id`.
 * employee.branchId is primary only — do not skip other stores.
 * seller erpId 0 → skip all fetches.
 */
export function planDiretoriaBranches(
  employee: { erpId: number; branchId: number },
  branches: { id: number; name: string; clientId: string; erpId?: number }[],
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
  /** uuids de cidades WhatsApp cuja request de KPI falhou */
  failedWhatsAppCityIds: string[]
  /** listagem GET /whatsapp-cities falhou */
  whatsappCitiesLoadFailed: boolean
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

  const chatId = employee?.chatId || undefined
  const sellerIdForWa =
    employee && employee.erpId !== 0 ? String(employee.erpId) : undefined

  if (!employee) {
    const [branches, waBundle] = await Promise.all([
      getBranches({ token, tenantId }),
      fetchWhatsAppBundle({ token, tenantId, from, to }),
    ])

    const [geralScope, ...branchDataList] = await Promise.all([
      fetchScopeKpis(baseOpts, referenceAt),
      ...branches.map((branch) =>
        fetchScopeKpis(
          { ...baseOpts, branchId: String(branch.id) },
          referenceAt,
        ),
      ),
    ])

    const geral: CityKpiData = {
      ...geralScope,
      whatsapp: waBundle.geralWhatsApp,
    }

    const branchEntries: BranchKpiData[] = branches.map((branch, index) => ({
      branch,
      data: branchDataList[index],
    }))

    return {
      geral,
      branches: branchEntries,
      whatsappCities: waBundle.whatsappCities,
      failedBranchIds: [],
      failedWhatsAppCityIds: waBundle.failedWhatsAppCityIds,
      whatsappCitiesLoadFailed: waBundle.whatsappCitiesLoadFailed,
    }
  }

  const branches = await getBranches({ token, tenantId })
  const plan = planDiretoriaBranches(employee, branches)
  const failedBranchIds: number[] = []
  const successfulLinkedCities: CityKpiData[] = []

  const ramalOpts: Pick<
    KpiOpts,
    "extensionUuid" | "extensionNumber"
  > = {}
  if (employee.extensionUuid) ramalOpts.extensionUuid = employee.extensionUuid
  if (employee.extensionNumber) ramalOpts.extensionNumber = employee.extensionNumber

  const [settled, waBundle] = await Promise.all([
    Promise.allSettled(
      plan.map(async (item) => {
        if (item.skipFetch || item.sellerId === undefined) {
          return {
            branchId: item.branchId,
            data: emptyCityKpi(from, to),
            linked: false,
          }
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
    ),
    fetchWhatsAppBundle({
      token,
      tenantId,
      from,
      to,
      chatId,
      sellerId: sellerIdForWa,
    }),
  ])

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

  const geralAggregated = aggregateCityKpis(successfulLinkedCities, from, to)
  const geral: CityKpiData = {
    ...geralAggregated,
    whatsapp: waBundle.geralWhatsApp,
  }

  return {
    geral,
    branches: branchEntries,
    whatsappCities: waBundle.whatsappCities,
    failedBranchIds,
    failedWhatsAppCityIds: waBundle.failedWhatsAppCityIds,
    whatsappCitiesLoadFailed: waBundle.whatsappCitiesLoadFailed,
  }
}
