const TENANT_USER_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN"])

export function canManageTenantUsers(role?: string | null) {
  return role ? TENANT_USER_MANAGEMENT_ROLES.has(role.toUpperCase()) : false
}

export function isTenantAdmin(role?: string | null) {
  return role?.toUpperCase() === "ADMIN"
}
