import test from "node:test"
import assert from "node:assert/strict"
import { planDiretoriaBranches } from "./fetch-gerencia-kpis.ts"

const branches = [
  { id: 1, name: "Loja 1", clientId: "c1" },
  { id: 2, name: "Loja 2", clientId: "c1" },
  { id: 3, name: "Loja 3", clientId: "c1" },
]

test("planDiretoriaBranches skips branch without erpUser link", () => {
  const plan = planDiretoriaBranches(
    {
      erpUsers: [
        { erpId: 101, branchId: 1 },
        { erpId: 202, branchId: 2 },
      ],
    },
    branches,
  )

  assert.deepEqual(plan, [
    { branchId: 1, sellerId: 101, skipFetch: false },
    { branchId: 2, sellerId: 202, skipFetch: false },
    { branchId: 3, skipFetch: true },
  ])
})

test("planDiretoriaBranches skips all branches when erpUsers empty", () => {
  const plan = planDiretoriaBranches({ erpUsers: [] }, branches)

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
    url.includes("/kpis/calls/hourly-comparison") ||
    url.includes("/kpis/whatsapp/agents/ranking") ||
    url.includes("/kpis/whatsapp/sessions/hourly") ||
    url.includes("/kpis/whatsapp/messages/hourly") ||
    url.includes("/kpis/whatsapp/tags/comparison")
  ) {
    return { period, rows: [] }
  }
  if (url.includes("/kpis/whatsapp/summary")) {
    return {
      period,
      totalConversations: { count: 0 },
      receivedMessages: { count: 0 },
    }
  }
  if (url.includes("/kpis/whatsapp/tags")) {
    return { period, tags: [] }
  }
  return {}
}

test("fetchGerenciaKpis employee mode sends sellerId per linked branch and skips unlinked", async () => {
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
      erpUsers: [
        { id: 10, erpId: 101, branchId: 1 },
        { id: 11, erpId: 202, branchId: 2 },
      ],
      erpId: 101,
    },
  })

  const kpiUrls = urls.filter((u) => u.includes("/kpis/"))
  assert.ok(kpiUrls.length > 0, "expected KPI requests for linked branches")

  for (const u of kpiUrls) {
    assert.doesNotMatch(u, /branchId=3/, "unlinked branch must not be requested")
    // company-wide geral has neither branchId nor sellerId
    if (!u.includes("branchId=")) {
      assert.fail(`unexpected company-wide KPI URL: ${u}`)
    }
  }

  const branch1 = kpiUrls.filter((u) => u.includes("branchId=1"))
  const branch2 = kpiUrls.filter((u) => u.includes("branchId=2"))
  assert.ok(branch1.length > 0)
  assert.ok(branch2.length > 0)
  for (const u of branch1) {
    assert.match(u, /sellerId=101/)
  }
  for (const u of branch2) {
    assert.match(u, /sellerId=202/)
  }

  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
  assert.equal(result.geral.budgets.total.count, 0)
})

test("fetchGerenciaKpis employee with empty erpUsers makes no /kpis/ requests", async () => {
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
      erpUsers: [],
      erpId: null,
    },
  })

  const kpiUrls = urls.filter((u) => u.includes("/kpis/"))
  assert.equal(kpiUrls.length, 0, "employee with no erpUsers must not hit /kpis/")
  assert.ok(
    urls.some((u) => u.includes("/companies/current/branches")),
    "branches endpoint may still be called",
  )
  assert.equal(result.branches.length, 3)
  assert.deepEqual(result.failedBranchIds, [])
  assert.equal(result.geral.budgets.total.count, 0)
})

test("fetchGerenciaKpis excludes rejected linked branch from Geral aggregation", async () => {
  const from = "2026-07-01"
  const to = "2026-07-31"
  const urls = []

  globalThis.fetch = async (url) => {
    const href = String(url)
    urls.push(href)

    if (href.includes("/kpis/") && href.includes("branchId=1")) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "fail" }),
      }
    }

    const body = stubKpiJson(href, from, to)
    if (href.includes("/kpis/budgets/summary") && href.includes("branchId=2")) {
      body.total = { count: 5, value: "500" }
      body.won = { count: 2, value: "200" }
      body.open = { count: 2, value: "200" }
      body.lost = { count: 1, value: "100" }
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
      erpUsers: [
        { id: 10, erpId: 101, branchId: 1 },
        { id: 11, erpId: 202, branchId: 2 },
      ],
      erpId: 101,
    },
  })

  assert.deepEqual(result.failedBranchIds, [1])
  assert.equal(
    result.geral.budgets.total.count,
    5,
    "Geral must aggregate only successful linked branch (branch 2)",
  )
  assert.equal(result.geral.budgets.won.count, 2)

  const failedBranch = result.branches.find((b) => b.branch.id === 1)
  assert.ok(failedBranch)
  assert.equal(failedBranch.data.budgets.total.count, 0)

  const okBranch = result.branches.find((b) => b.branch.id === 2)
  assert.ok(okBranch)
  assert.equal(okBranch.data.budgets.total.count, 5)
})
