import test from "node:test"
import assert from "node:assert/strict"
import { normalizeEmployee } from "./normalize-employee.ts"

test("fills erpId from erpUsers[0] when flat erpId missing", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpUsers: [{ id: 10, erpId: 111, branchId: 1 }],
  })
  assert.equal(emp.erpId, 111)
  assert.equal(emp.erpUsers.length, 1)
})

test("keeps flat erpId when present", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 999,
    erpUsers: [{ id: 10, erpId: 111, branchId: 1 }],
  })
  assert.equal(emp.erpId, 999)
})

test("defaults erpUsers to [] and erpId to 0", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
  })
  assert.deepEqual(emp.erpUsers, [])
  assert.equal(emp.erpId, 0)
})
