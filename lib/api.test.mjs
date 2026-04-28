import test from "node:test"
import assert from "node:assert/strict"

test("getCallsAgentsRanking sends registeredEmployeesOnly true by default", async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      json: async () => ({ period: {}, rows: [] }),
    }
  }

  const { getCallsAgentsRanking } = await import("./api.ts")

  await getCallsAgentsRanking({
    token: "token",
    tenantId: "tenant",
    from: "2026-04-01",
    to: "2026-04-28",
  })

  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/kpis\/calls\/agents\/ranking\?/)
  assert.match(calls[0].url, /registeredEmployeesOnly=true/)
})

test("getCallsAgentsRanking can request ranking without registered employee filter", async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      json: async () => ({ period: {}, rows: [] }),
    }
  }

  const { getCallsAgentsRanking } = await import("./api.ts")

  await getCallsAgentsRanking({
    token: "token",
    tenantId: "tenant",
    from: "2026-04-01",
    to: "2026-04-28",
    registeredEmployeesOnly: false,
  })

  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/kpis\/calls\/agents\/ranking\?/)
  assert.match(calls[0].url, /registeredEmployeesOnly=false/)
})
