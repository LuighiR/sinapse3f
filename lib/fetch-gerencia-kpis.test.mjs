import test from "node:test"
import assert from "node:assert/strict"
import { planDiretoriaBranches } from "./fetch-gerencia-kpis.ts"

const branches = [
  { id: 1, name: "Loja 1", clientId: "c1" },
  { id: 2, name: "Loja 2", clientId: "c1" },
  { id: 3, name: "Loja 3", clientId: "c1" },
]

const whatsappCities = [
  { id: "city-pelotas", name: "Pelotas", isActive: true },
  { id: "city-sm", name: "Santa Maria", isActive: true },
]

test("planDiretoriaBranches applies same seller erpId to all branches", () => {
  const plan = planDiretoriaBranches({ erpId: 101, branchId: 1 }, branches)

  assert.deepEqual(plan, [
    { branchId: 1, sellerId: 101, skipFetch: false },
    { branchId: 2, sellerId: 101, skipFetch: false },
    { branchId: 3, sellerId: 101, skipFetch: false },
  ])
})

test("planDiretoriaBranches skips all branches when seller erpId is 0", () => {
  const plan = planDiretoriaBranches({ erpId: 0, branchId: 1 }, branches)

  assert.deepEqual(plan, [
    { branchId: 1, skipFetch: true },
    { branchId: 2, skipFetch: true },
    { branchId: 3, skipFetch: true },
  ])
})

function emptyPeriod(from, to) {
  return { from, to, key: `${from}_${to}` }
}

function zeroCountValue() {
  return { count: 0, value: "0" }
}

function stubKpiJson(url, from, to) {
  const period = emptyPeriod(from, to)
  if (url.includes("/companies/current/branches")) {
    return branches
  }
  if (url.includes("/whatsapp-cities")) {
    return whatsappCities
  }
  if (url.includes("/kpis/budgets/summary")) {
    return {
      period,
      total: zeroCountValue(),
      open: zeroCountValue(),
      won: zeroCountValue(),
      lost: zeroCountValue(),
    }
  }
  if (url.includes("/kpis/sales/summary")) {
    return {
      period,
      total: zeroCountValue(),
      active: zeroCountValue(),
      canceled: zeroCountValue(),
      averageDaily: { count: "0", value: "0" },
      averageTicket: { value: "0" },
    }
  }
  if (url.includes("/kpis/budgets/follow-up")) {
    return {
      period,
      total: zeroCountValue(),
      within24h: {
        total: zeroCountValue(),
        converted: { count: 0, value: "0", percentage: "0" },
        lost: { count: 0, value: "0", percentage: "0" },
        open: { count: 0, value: "0", percentage: "0" },
      },
      after24h: {
        total: zeroCountValue(),
        converted: { count: 0, value: "0", percentage: "0" },
        lost: { count: 0, value: "0", percentage: "0" },
        open: { count: 0, value: "0", percentage: "0" },
      },
    }
  }
  if (url.includes("/kpis/calls/summary")) {
    return {
      period,
      received: { count: 0 },
      lost: { count: 0 },
      totalInbound: { count: 0 },
      telemarketingOpenBudgets: { count: 0 },
      peakHour: { hour: "", totalInboundCount: 0 },
    }
  }
  if (
    url.includes("/kpis/calls/hourly") ||
    url.includes("/kpis/calls/agents/ranking") ||
    url.includes("/kpis/calls/hourly/comparison") ||
    url.includes("/kpis/whatsapp/agents/ranking") ||
    url.includes("/kpis/whatsapp/sessions/hourly") ||
    url.includes("/kpis/whatsapp/messages/hourly") ||
    url.includes("/kpis/whatsapp/tags/hourly/comparison")
  ) {
    return { period, rows: [], tagId: "" }
  }
  if (url.includes("/kpis/whatsapp/summary")) {
    return {
      period,
      totalConversations: { count: 0 },
      receivedMessages: { count: 0 },
    }
  }
  if (url.includes("/kpis/whatsapp/tags")) {
    return { tags: [] }
  }
  return {}
}

test("fetchGerenciaKpis employee mode sends internal branch.id as branchId", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"
  const urls = []

  globalThis.fetch = async (url) => {
    const href = String(url)
    urls.push(href)
    return {
      ok: true,
      json: async () => stubKpiJson(href, from, to),
    }
  }

  const { fetchGerenciaKpis } = await import("./fetch-gerencia-kpis.ts")

  const result = await fetchGerenciaKpis({
    token: "tok",
    tenantId: "ten",
    from,
    to,
    employee: {
      id: 1,
      name: "Joaozinho",
      branchId: 1,
      extensionNumber: "100",
      extensionUuid: "uuid-100",
      chatId: "chat-1",
      erpId: 101,
    },
  })

  const kpiUrls = urls.filter((u) => u.includes("/kpis/"))
  assert.ok(kpiUrls.length > 0, "expected KPI requests")

  for (const branchId of [1, 2, 3]) {
    const branchUrls = kpiUrls.filter((u) => u.includes(`branchId=${branchId}`))
    assert.ok(branchUrls.length > 0, `expected requests for branch.id=${branchId}`)
    const commerce = branchUrls.filter(
      (u) => u.includes("/kpis/budgets/") || u.includes("/kpis/sales/"),
    )
    for (const u of commerce) {
      assert.match(u, /sellerId=101/)
    }
  }

  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
})

test("fetchGerenciaKpis aggregates Geral across internal branch ids", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"

  globalThis.fetch = async (url) => {
    const href = String(url)
    const body = stubKpiJson(href, from, to)

    if (href.includes("/kpis/budgets/summary") && href.includes("branchId=1")) {
      body.total = { count: 10, value: "100" }
      body.won = { count: 4, value: "40" }
      body.open = { count: 6, value: "60" }
    }
    if (href.includes("/kpis/budgets/summary") && href.includes("branchId=2")) {
      body.total = { count: 5, value: "50" }
      body.won = { count: 2, value: "20" }
      body.open = { count: 3, value: "30" }
    }

    return {
      ok: true,
      json: async () => body,
    }
  }

  const { fetchGerenciaKpis } = await import("./fetch-gerencia-kpis.ts")

  const result = await fetchGerenciaKpis({
    token: "tok",
    tenantId: "ten",
    from,
    to,
    employee: {
      id: 1,
      name: "Joaozinho",
      branchId: 1,
      extensionNumber: "100",
      extensionUuid: "uuid-100",
      chatId: "chat-1",
      erpId: 101,
    },
  })

  assert.deepEqual(result.failedBranchIds, [])
  assert.equal(result.geral.budgets.total.count, 15)
  assert.equal(result.geral.budgets.total.value, "150")
  assert.equal(result.branches.find((b) => b.branch.id === 1)?.data.budgets.total.count, 10)
  assert.equal(result.branches.find((b) => b.branch.id === 2)?.data.budgets.total.count, 5)
})

test("fetchGerenciaKpis WhatsApp uses cities + whatsappCityId without branchId", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"
  const urls = []

  globalThis.fetch = async (url) => {
    const href = String(url)
    urls.push(href)
    return {
      ok: true,
      json: async () => stubKpiJson(href, from, to),
    }
  }

  const { fetchGerenciaKpis } = await import("./fetch-gerencia-kpis.ts")

  const result = await fetchGerenciaKpis({
    token: "tok",
    tenantId: "ten",
    from,
    to,
    employee: {
      id: 1,
      name: "Joaozinho",
      branchId: 1,
      extensionNumber: "100",
      extensionUuid: "uuid-100",
      chatId: "agent@example.com",
      erpId: 101,
    },
  })

  assert.ok(
    urls.some((u) => u.includes("/whatsapp-cities") && u.includes("activeOnly=true")),
    "expected whatsapp-cities list",
  )

  const waUrls = urls.filter((u) => u.includes("/kpis/whatsapp/"))
  assert.ok(waUrls.length > 0, "expected WhatsApp KPI requests")

  for (const u of waUrls) {
    assert.ok(!u.includes("branchId="), `WA must not send branchId: ${u}`)
    assert.match(u, /chatId=agent%40example\.com|chatId=agent@example\.com/)
  }

  const summaryUrls = waUrls.filter((u) => u.includes("/kpis/whatsapp/summary"))
  const geralSummary = summaryUrls.filter((u) => !u.includes("whatsappCityId="))
  const citySummaries = summaryUrls.filter((u) => u.includes("whatsappCityId="))

  assert.equal(geralSummary.length, 1, "one consolidated WA summary without city")
  assert.equal(citySummaries.length, 2, "one WA summary per active city")
  assert.ok(citySummaries.some((u) => u.includes("whatsappCityId=city-pelotas")))
  assert.ok(citySummaries.some((u) => u.includes("whatsappCityId=city-sm")))

  assert.equal(result.whatsappCities.length, 2)
  assert.equal(result.whatsappCities[0].city.name, "Pelotas")
  assert.deepEqual(result.failedWhatsAppCityIds, [])
  assert.equal(result.whatsappCitiesLoadFailed, false)
})

test("fetchGerenciaKpis overview WhatsApp cities without chatId", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"
  const urls = []

  globalThis.fetch = async (url) => {
    const href = String(url)
    urls.push(href)
    return {
      ok: true,
      json: async () => stubKpiJson(href, from, to),
    }
  }

  const { fetchGerenciaKpis } = await import("./fetch-gerencia-kpis.ts")

  const result = await fetchGerenciaKpis({
    token: "tok",
    tenantId: "ten",
    from,
    to,
  })

  const waUrls = urls.filter((u) => u.includes("/kpis/whatsapp/"))
  for (const u of waUrls) {
    assert.ok(!u.includes("chatId="), `overview WA must not send chatId: ${u}`)
    assert.ok(!u.includes("branchId="), `WA must not send branchId: ${u}`)
  }

  assert.equal(result.whatsappCities.length, 2)
  assert.deepEqual(result.failedWhatsAppCityIds, [])
})
