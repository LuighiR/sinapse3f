import test from "node:test"
import assert from "node:assert/strict"

import { getNextSort, sortRows } from "./table-sorting.ts"

const rows = [
  { id: "1", date: "2026-04-20", customer: "Zeta", value: "15.5", status: "Em Aberto" },
  { id: "2", date: "2026-04-18", customer: "alpha", value: "100", status: null },
  { id: "3", date: "2026-04-19", customer: "Beta", value: "8", status: "Cancelado" },
  { id: "4", date: "2026-04-19", customer: "beta", value: "8", status: "Convertido" },
]

const accessors = {
  date: (row) => row.date,
  customer: (row) => row.customer,
  value: (row) => Number(row.value),
  status: (row) => row.status,
}

test("getNextSort starts ascending, toggles descending, and resets for a new column", () => {
  let sort = null

  sort = getNextSort(sort, "customer")
  assert.deepEqual(sort, { column: "customer", direction: "asc" })

  sort = getNextSort(sort, "customer")
  assert.deepEqual(sort, { column: "customer", direction: "desc" })

  sort = getNextSort(sort, "value")
  assert.deepEqual(sort, { column: "value", direction: "asc" })
})

test("sortRows orders strings with locale awareness and preserves stability for equal values", () => {
  const sorted = sortRows(rows, { column: "customer", direction: "asc" }, accessors)

  assert.deepEqual(
    sorted.map((row) => row.id),
    ["2", "3", "4", "1"],
  )
})

test("sortRows orders numeric values in descending order", () => {
  const sorted = sortRows(rows, { column: "value", direction: "desc" }, accessors)

  assert.deepEqual(
    sorted.map((row) => row.id),
    ["2", "1", "3", "4"],
  )
})

test("sortRows keeps empty values at the end", () => {
  const ascending = sortRows(rows, { column: "status", direction: "asc" }, accessors)
  const descending = sortRows(rows, { column: "status", direction: "desc" }, accessors)

  assert.equal(ascending.at(-1)?.id, "2")
  assert.equal(descending.at(-1)?.id, "2")
})
