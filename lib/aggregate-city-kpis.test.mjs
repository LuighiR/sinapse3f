import test from "node:test"
import assert from "node:assert/strict"
import { emptyCityKpi } from "./empty-city-kpi.ts"
import { aggregateCityKpis } from "./aggregate-city-kpis.ts"

test("sums budget totals across branches", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.budgets.total = { count: 2, value: "100" }
  a.budgets.open = { count: 1, value: "40" }
  a.budgets.won = { count: 1, value: "60" }
  a.sales.total = { count: 4, value: "200" }
  a.sales.active = { count: 3, value: "150" }
  a.sales.canceled = { count: 1, value: "50" }
  a.salesWithBudget = { active: { count: 2, value: "80" } }
  a.salesWithoutBudget = { active: { count: 1, value: "70" } }

  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.budgets.total = { count: 3, value: "50" }
  b.budgets.open = { count: 2, value: "30" }
  b.budgets.won = { count: 1, value: "20" }
  b.sales.total = { count: 1, value: "25" }
  b.sales.active = { count: 1, value: "25" }
  b.sales.canceled = { count: 0, value: "0" }
  b.salesWithBudget = { active: { count: 1, value: "25" } }
  b.salesWithoutBudget = { active: { count: 0, value: "0" } }

  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(g.budgets.total.count, 5)
  assert.equal(g.budgets.total.value, "150")
  assert.equal(g.budgets.open.count, 3)
  assert.equal(g.budgets.open.value, "70")
  assert.equal(g.budgets.won.count, 2)
  assert.equal(g.budgets.won.value, "80")
  assert.equal(g.sales.total.count, 5)
  assert.equal(g.sales.total.value, "225")
  assert.equal(g.sales.active.count, 4)
  assert.equal(g.sales.active.value, "175")
  assert.equal(g.sales.canceled.count, 1)
  assert.equal(g.sales.canceled.value, "50")
  assert.equal(g.salesWithBudget.active.count, 3)
  assert.equal(g.salesWithBudget.active.value, "105")
  assert.equal(g.salesWithoutBudget.active.count, 1)
  assert.equal(g.salesWithoutBudget.active.value, "70")
})

test("recalculates follow-up percentage from summed totals", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.followUp.total = { count: 10, value: "1000" }
  a.followUp.within24h = {
    total: { count: 4, value: "400" },
    converted: { count: 1, value: "100", percentage: "25.0" },
    lost: { count: 1, value: "100", percentage: "25.0" },
    open: { count: 2, value: "200", percentage: "50.0" },
  }

  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.followUp.total = { count: 6, value: "600" }
  b.followUp.within24h = {
    total: { count: 6, value: "600" },
    converted: { count: 3, value: "300", percentage: "50.0" },
    lost: { count: 1, value: "100", percentage: "16.7" },
    open: { count: 2, value: "200", percentage: "33.3" },
  }

  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(g.followUp.total.count, 16)
  assert.equal(g.followUp.total.value, "1600")
  assert.equal(g.followUp.within24h.total.count, 10)
  assert.equal(g.followUp.within24h.converted.count, 4)
  assert.equal(g.followUp.within24h.converted.percentage, "40.0")
  assert.equal(g.followUp.within24h.lost.count, 2)
  assert.equal(g.followUp.within24h.lost.percentage, "20.0")
  assert.equal(g.followUp.within24h.open.count, 4)
  assert.equal(g.followUp.within24h.open.percentage, "40.0")
})

test("recalculates averageTicket from total value and count", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.sales.total = { count: 2, value: "100" }
  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.sales.total = { count: 2, value: "100" }

  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(g.sales.total.count, 4)
  assert.equal(g.sales.total.value, "200")
  assert.equal(g.sales.averageTicket.value, "50")
})

test("merges hourly rows by hour and sets peakHour", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.calls.hourly = {
    period: a.calls.hourly.period,
    rows: [
      { hour: "09", receivedCount: 2, lostCount: 1, totalInboundCount: 3 },
      { hour: "10", receivedCount: 5, lostCount: 0, totalInboundCount: 5 },
    ],
  }
  a.calls.summary = {
    ...a.calls.summary,
    received: { count: 7 },
    lost: { count: 1 },
    totalInbound: { count: 8 },
  }

  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.calls.hourly = {
    period: b.calls.hourly.period,
    rows: [
      { hour: "09", receivedCount: 1, lostCount: 2, totalInboundCount: 3 },
      { hour: "11", receivedCount: 4, lostCount: 1, totalInboundCount: 5 },
    ],
  }
  b.calls.summary = {
    ...b.calls.summary,
    received: { count: 5 },
    lost: { count: 3 },
    totalInbound: { count: 8 },
  }

  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(g.calls.summary.received.count, 12)
  assert.equal(g.calls.summary.lost.count, 4)
  assert.equal(g.calls.summary.totalInbound.count, 16)
  assert.deepEqual(g.calls.hourly.rows, [
    { hour: "09", receivedCount: 3, lostCount: 3, totalInboundCount: 6 },
    { hour: "10", receivedCount: 5, lostCount: 0, totalInboundCount: 5 },
    { hour: "11", receivedCount: 4, lostCount: 1, totalInboundCount: 5 },
  ])
  assert.deepEqual(g.calls.summary.peakHour, { hour: "09", totalInboundCount: 6 })
})

test("tagComparison merges same tagId and clears when tagIds differ", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.whatsapp.tagComparison = {
    period: a.whatsapp.tagComparison.period,
    tagId: "tag-1",
    rows: [
      { hour: "09", tagSessionsCount: 2, openBudgetsCount: 1 },
      { hour: "10", tagSessionsCount: 3, openBudgetsCount: 0 },
    ],
  }
  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.whatsapp.tagComparison = {
    period: b.whatsapp.tagComparison.period,
    tagId: "tag-1",
    rows: [{ hour: "09", tagSessionsCount: 1, openBudgetsCount: 2 }],
  }

  const same = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  assert.equal(same.whatsapp.tagComparison.tagId, "tag-1")
  assert.deepEqual(same.whatsapp.tagComparison.rows, [
    { hour: "09", tagSessionsCount: 3, openBudgetsCount: 3 },
    { hour: "10", tagSessionsCount: 3, openBudgetsCount: 0 },
  ])

  const c = emptyCityKpi("2026-07-01", "2026-07-02")
  c.whatsapp.tagComparison = {
    period: c.whatsapp.tagComparison.period,
    tagId: "tag-2",
    rows: [{ hour: "09", tagSessionsCount: 9, openBudgetsCount: 9 }],
  }
  const diff = aggregateCityKpis([a, c], "2026-07-01", "2026-07-02")
  assert.equal(diff.whatsapp.tagComparison.tagId, "")
  assert.deepEqual(diff.whatsapp.tagComparison.rows, [])
})

test("empty list returns emptyCityKpi for the period", () => {
  const g = aggregateCityKpis([], "2026-07-01", "2026-07-02")
  const expected = emptyCityKpi("2026-07-01", "2026-07-02")
  assert.deepEqual(g, expected)
  assert.equal(g.budgets.period.key, "2026-07-01_2026-07-02")
})

test("recalculates averageDaily using inclusive calendar days", () => {
  const a = emptyCityKpi("2026-07-01", "2026-07-02")
  a.sales.total = { count: 2, value: "100" }
  const b = emptyCityKpi("2026-07-01", "2026-07-02")
  b.sales.total = { count: 2, value: "100" }

  const g = aggregateCityKpis([a, b], "2026-07-01", "2026-07-02")
  // 2026-07-01 → 2026-07-02 = 2 inclusive days; totals 4 / "200"
  assert.equal(g.sales.averageDaily.count, "2")
  assert.equal(g.sales.averageDaily.value, "100")
})
