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

test("sellerIdForBranch returns same erpId for every branch", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Shaiane",
    branchId: 2,
    extensionNumber: "9000",
    extensionUuid: "uuid",
    chatId: "shaiane@x.com",
    erpId: 42754,
  })
  assert.equal(sellerIdForBranch(emp, 1), 42754)
  assert.equal(sellerIdForBranch(emp, 2), 42754)
  assert.equal(sellerIdForBranch(emp, 3), 42754)
})

test("sellerIdForBranch returns undefined when erpId is 0", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Sem ERP",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 0,
  })
  assert.equal(sellerIdForBranch(emp, 1), undefined)
})

test("keeps isActive when provided", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 1,
    isActive: false,
  })
  assert.equal(emp.isActive, false)
})

test("defaults isActive to true when missing", () => {
  const emp = normalizeEmployee({
    id: 1,
    name: "Joao",
    branchId: 1,
    extensionNumber: null,
    extensionUuid: null,
    chatId: null,
    erpId: 1,
  })
  assert.equal(emp.isActive, true)
})
