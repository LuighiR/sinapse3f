const TENANT_USER_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN"])
const EMPLOYEE_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"])

export function canManageTenantUsers(role?: string | null) {
  return role ? TENANT_USER_MANAGEMENT_ROLES.has(role.toUpperCase()) : false
}

export function canManageEmployees(role?: string | null) {
  return role ? EMPLOYEE_MANAGEMENT_ROLES.has(role.toUpperCase()) : false
}

export function canAccessConfiguracoes(role?: string | null) {
  return canManageTenantUsers(role) || canManageEmployees(role)
}

export function isTenantAdmin(role?: string | null) {
  return role?.toUpperCase() === "ADMIN"
}
