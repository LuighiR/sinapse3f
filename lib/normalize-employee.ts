export interface EmployeeErpUser {
  id: number
  erpId: number
  branchId: number
}

export interface EmployeeLike {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpUsers?: EmployeeErpUser[]
  erpId?: number
}

export interface NormalizedEmployee {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
  erpUsers: EmployeeErpUser[]
  erpId: number
}

export function normalizeEmployee(raw: EmployeeLike): NormalizedEmployee {
  const erpUsers = Array.isArray(raw.erpUsers) ? raw.erpUsers : []
  const erpId = raw.erpId ?? erpUsers[0]?.erpId ?? 0
  return { ...raw, erpUsers, erpId }
}

export function sellerIdForBranch(
  employee: { erpUsers: { erpId: number; branchId: number }[] },
  branchId: number,
): number | undefined {
  return employee.erpUsers.find((u) => u.branchId === branchId)?.erpId
}
