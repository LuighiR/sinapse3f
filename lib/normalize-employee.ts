export interface EmployeeLike {
  id: number
  name: string
  branchId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial?: boolean
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
  /** Flat ERP id used as sellerId on every branch KPI request. */
  erpId: number
}

export function normalizeEmployee(raw: EmployeeLike): NormalizedEmployee {
  return {
    id: raw.id,
    name: raw.name,
    branchId: raw.branchId,
    extensionNumber: raw.extensionNumber ?? null,
    extensionUuid: raw.extensionUuid ?? null,
    chatId: raw.chatId ?? null,
    ...(raw.isNonCommercial !== undefined
      ? { isNonCommercial: raw.isNonCommercial }
      : {}),
    erpId: raw.erpId ?? 0,
  }
}

/**
 * Flat erpId used as sellerId on every branch.
 * employee.branchId is only the primary/residence branch — sales may exist on other stores.
 */
export function sellerIdForBranch(
  employee: Pick<NormalizedEmployee, "erpId">,
  _branchId: number,
): number | undefined {
  if (!employee.erpId) return undefined
  return employee.erpId
}
