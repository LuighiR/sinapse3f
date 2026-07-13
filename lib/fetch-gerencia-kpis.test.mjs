import test from "node:test"
import assert from "node:assert/strict"
import { planDiretoriaBranches } from "./fetch-gerencia-kpis.ts"

const branches = [
  { id: 1, name: "Loja 1", clientId: "c1", erpId: 1010 },
  { id: 2, name: "Loja 2", clientId: "c1", erpId: 2020 },
  { id: 3, name: "Loja 3", clientId: "c1", erpId: 3030 },
]

test("planDiretoriaBranches applies same seller erpId and keeps kpiBranchId", () => {
  const plan = planDiretoriaBranches({ erpId: 101, branchId: 1 }, branches)

  assert.deepEqual(plan, [
    { branchId: 1, kpiBranchId: 1010, sellerId: 101, skipFetch: false },
    { branchId: 2, kpiBranchId: 2020, sellerId: 101, skipFetch: false },
    { branchId: 3, kpiBranchId: 3030, sellerId: 101, skipFetch: false },
  ])
})

test("planDiretoriaBranches skips all branches when seller erpId is 0", () => {
  const plan = planDiretoriaBranches({ erpId: 0, branchId: 1 }, branches)

  assert.deepEqual(plan, [
    { branchId: 1, kpiBranchId: 1010, skipFetch: true },
    { branchId: 2, kpiBranchId: 2020, skipFetch: true },
    { branchId: 3, kpiBranchId: 3030, skipFetch: true },
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

test("fetchGerenciaKpis employee mode sends branch.erpId as branchId query param", async () => {
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

  // Must use ERP branch ids in query, not internal ids 1/2/3 alone without erp mapping
  for (const erpBranchId of [1010, 2020, 3030]) {
    const branchUrls = kpiUrls.filter((u) =>
      u.includes(`branchId=${erpBranchId}`),
    )
    assert.ok(
      branchUrls.length > 0,
      `expected requests for branch.erpId=${erpBranchId}`,
    )
    const commerce = branchUrls.filter(
      (u) => u.includes("/kpis/budgets/") || u.includes("/kpis/sales/"),
    )
    for (const u of commerce) {
      assert.match(u, /sellerId=101/)
    }
  }

  // Internal ids must not be used as KPI branchId when they differ from erpId
  for (const u of kpiUrls) {
    assert.doesNotMatch(u, /branchId=1(?:&|$)/)
    assert.doesNotMatch(u, /branchId=2(?:&|$)/)
    assert.doesNotMatch(u, /branchId=3(?:&|$)/)
  }

  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
})

test("fetchGerenciaKpis aggregates Geral using branch.erpId filters", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"

  globalThis.fetch = async (url) => {
    const href = String(url)
    const body = stubKpiJson(href, from, to)

    if (href.includes("/kpis/budgets/summary") && href.includes("branchId=1010")) {
      body.total = { count: 10, value: "100" }
      body.won = { count: 4, value: "40" }
      body.open = { count: 6, value: "60" }
    }
    if (href.includes("/kpis/budgets/summary") && href.includes("branchId=2020")) {
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

test("fetchGerenciaKpis gerencia mode also uses branch.erpId", async () => {
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

  await fetchGerenciaKpis({
    token: "tok",
    tenantId: "ten",
    from,
    to,
  })

  const scoped = urls.filter(
    (u) => u.includes("/kpis/") && u.includes("branchId="),
  )
  assert.ok(scoped.some((u) => u.includes("branchId=1010")))
  assert.ok(scoped.some((u) => u.includes("branchId=2020")))
  assert.ok(!scoped.some((u) => /branchId=1(?:&|$)/.test(u)))
})
