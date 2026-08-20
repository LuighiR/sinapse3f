import test from "node:test"
import assert from "node:assert/strict"
import { emptyCityKpi } from "./empty-city-kpi.ts"

test("emptyCityKpi zeros budgets sales followUp calls whatsapp", () => {
  const data = emptyCityKpi("2026-07-01", "2026-07-31")
  assert.equal(data.budgets.total.count, 0)
  assert.equal(data.budgets.total.value, "0")
  assert.equal(data.sales.active.count, 0)
  assert.equal(data.followUp.within24h.converted.percentage, "0")
  assert.equal(data.calls.summary.totalInbound.count, 0)
  assert.equal(data.calls.summary.lostWithoutEmployee.count, 0)
  assert.equal(data.calls.unansweredAnswered.count, 0)
  assert.equal(data.calls.hourly.rows.length, 0)
  assert.equal(data.whatsapp.summary.totalConversations.count, 0)
  assert.equal(data.whatsapp.tagComparison.tagId, "")
  assert.equal(data.budgets.period.from, "2026-07-01")
})
