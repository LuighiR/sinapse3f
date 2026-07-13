import test from "node:test"
import assert from "node:assert/strict"
import { planDiretoriaBranches } from "./fetch-gerencia-kpis.ts"

const branches = [
  { id: 1, name: "Loja 1", clientId: "c1" },
  { id: 2, name: "Loja 2", clientId: "c1" },
  { id: 3, name: "Loja 3", clientId: "c1" },
]

test("planDiretoriaBranches applies same erpId to all branches", () => {
  const plan = planDiretoriaBranches({ erpId: 101, branchId: 1 }, branches)

  assert.deepEqual(plan, [
    { branchId: 1, sellerId: 101, skipFetch: false },
    { branchId: 2, sellerId: 101, skipFetch: false },
    { branchId: 3, sellerId: 101, skipFetch: false },
  ])
})

test("planDiretoriaBranches skips all branches when erpId is 0", () => {
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

test("fetchGerenciaKpis employee mode fetches all branches with same sellerId", async () => {
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
    assert.ok(branchUrls.length > 0, `expected requests for branch ${branchId}`)
    const commerce = branchUrls.filter(
      (u) => u.includes("/kpis/budgets/") || u.includes("/kpis/sales/"),
    )
    for (const u of commerce) {
      assert.match(u, /sellerId=101/)
      assert.doesNotMatch(u, /extensionUuid=/)
      assert.doesNotMatch(u, /chatId=/)
    }
  }

  const calls = kpiUrls.filter((u) => u.includes("/kpis/calls/"))
  for (const u of calls) {
    assert.doesNotMatch(u, /sellerId=/)
    assert.match(u, /extensionUuid=uuid-100/)
  }

  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
})

test("fetchGerenciaKpis employee with erpId 0 makes no /kpis/ requests", async () => {
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
      name: "Sem ERP",
      branchId: 1,
      extensionNumber: "100",
      extensionUuid: "uuid-100",
      chatId: "chat-1",
      erpId: 0,
    },
  })

  const kpiUrls = urls.filter((u) => u.includes("/kpis/"))
  assert.equal(kpiUrls.length, 0, "employee with erpId 0 must not hit /kpis/")
  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
  assert.equal(result.geral.budgets.total.count, 0)
})

test("fetchGerenciaKpis aggregates Geral across all branches for same sellerId", async () => {
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
  assert.equal(result.branches.find((b) => b.branch.id === 3)?.data.budgets.total.count, 0)
})

test("fetchGerenciaKpis keeps budgets when calls/whatsapp fail for a branch", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"

  globalThis.fetch = async (url) => {
    const href = String(url)

    if (href.includes("/companies/current/branches")) {
      return {
        ok: true,
        json: async () => [{ id: 2, name: "Pelotas", clientId: "c1" }],
      }
    }

    if (href.includes("/kpis/calls/") || href.includes("/kpis/whatsapp/")) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid filter combo" }),
      }
    }

    const body = stubKpiJson(href, from, to)
    if (href.includes("/kpis/budgets/summary")) {
      body.total = { count: 109, value: "229460.9900" }
      body.open = { count: 66, value: "172629.1700" }
      body.won = { count: 43, value: "56831.8200" }
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
      name: "Shaiane",
      branchId: 2,
      extensionNumber: "9000",
      extensionUuid: "565d1428-8a07-493c-bfab-a0741a1c8d13",
      chatId: "vendas03pelotas@ferracosul.com.br",
      erpId: 42754,
    },
  })

  assert.deepEqual(result.failedBranchIds, [])
  assert.equal(result.branches[0].data.budgets.total.count, 109)
  assert.equal(result.geral.budgets.total.count, 109)
})
