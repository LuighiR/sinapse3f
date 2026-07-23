import test from "node:test"
import assert from "node:assert/strict"
import {
  buildEmployeesQuery,
  clearableOptionalString,
  buildCreateEmployeeBody,
  buildUpdateEmployeeBody,
} from "./employee-admin.ts"

test("buildEmployeesQuery includes includeInactive search branchId", () => {
  const qs = buildEmployeesQuery({
    includeInactive: true,
    search: "fabiano",
    branchId: 2,
  }).toString()
  assert.match(qs, /includeInactive=true/)
  assert.match(qs, /search=fabiano/)
  assert.match(qs, /branchId=2/)
})

test("buildEmployeesQuery omits empty filters", () => {
  const qs = buildEmployeesQuery({}).toString()
  assert.equal(qs, "")
})

test("clearableOptionalString maps empty to null", () => {
  assert.equal(clearableOptionalString(""), null)
  assert.equal(clearableOptionalString("  "), null)
  assert.equal(clearableOptionalString("101"), "101")
})

test("buildCreateEmployeeBody trims and clears empties", () => {
  const body = buildCreateEmployeeBody({
    name: " Nova ",
    branchId: 1,
    erpId: 10,
    extensionNumber: "",
    extensionUuid: "  ",
    chatId: "a@b.com",
    isNonCommercial: true,
    isActive: true,
  })
  assert.deepEqual(body, {
    name: "Nova",
    branchId: 1,
    erpId: 10,
    extensionNumber: null,
    extensionUuid: null,
    chatId: "a@b.com",
    isNonCommercial: true,
    isActive: true,
  })
})

test("buildUpdateEmployeeBody only includes changed fields and clears empties", () => {
  const current = {
    name: "Old",
    branchId: 1,
    erpId: 10,
    extensionNumber: "101",
    extensionUuid: "uuid",
    chatId: "old@x.com",
    isNonCommercial: false,
    isActive: true,
  }
  const body = buildUpdateEmployeeBody(current, {
    name: "New",
    branchId: 1,
    erpId: 10,
    extensionNumber: "",
    extensionUuid: "uuid",
    chatId: "old@x.com",
    isNonCommercial: false,
    isActive: false,
  })
  assert.deepEqual(body, {
    name: "New",
    extensionNumber: null,
    isActive: false,
  })
})
