import test from "node:test"
import assert from "node:assert/strict"
import {
  canManageTenantUsers,
  canManageEmployees,
  canAccessConfiguracoes,
} from "./tenant-permissions.ts"

test("canManageTenantUsers only OWNER and ADMIN", () => {
  assert.equal(canManageTenantUsers("OWNER"), true)
  assert.equal(canManageTenantUsers("ADMIN"), true)
  assert.equal(canManageTenantUsers("MANAGER"), false)
  assert.equal(canManageTenantUsers("VIEWER"), false)
  assert.equal(canManageTenantUsers(null), false)
})

test("canManageEmployees OWNER ADMIN MANAGER", () => {
  assert.equal(canManageEmployees("OWNER"), true)
  assert.equal(canManageEmployees("ADMIN"), true)
  assert.equal(canManageEmployees("MANAGER"), true)
  assert.equal(canManageEmployees("VIEWER"), false)
  assert.equal(canManageEmployees(undefined), false)
})

test("canAccessConfiguracoes is OR of the two", () => {
  assert.equal(canAccessConfiguracoes("MANAGER"), true)
  assert.equal(canAccessConfiguracoes("ADMIN"), true)
  assert.equal(canAccessConfiguracoes("VIEWER"), false)
})
