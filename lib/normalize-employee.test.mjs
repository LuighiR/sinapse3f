import test from "node:test"
import assert from "node:assert/strict"
import { normalizeEmployee, sellerIdForBranch } from "./normalize-employee.ts"

test("keeps flat erpId and branchId", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 2,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 42754,
  })
  assert.equal(emp.erpId, 42754)
  assert.equal(emp.branchId, 2)
})

test("defaults erpId to 0 when missing", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
  })
  assert.equal(emp.erpId, 0)
})

test("sellerIdForBranch only returns erpId for employee.branchId", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Shaiane",
    branchId: 2,
    extensionNumber: "9000",
    extensionUuid: "uuid",
    chatId: "shaiane@x.com",
    erpId: 42754,
  })
  assert.equal(sellerIdForBranch(emp, 2), 42754)
  assert.equal(sellerIdForBranch(emp, 1), undefined)
  assert.equal(sellerIdForBranch(emp, 3), undefined)
})
