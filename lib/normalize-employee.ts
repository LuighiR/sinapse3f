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
  /** Flat ERP id used as sellerId; employee belongs to a single branchId. */
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
 * Employee is scoped to a single residence/work branch.
 * Only that branch gets sellerId = erpId; other branches have no link.
 */
export function sellerIdForBranch(
  employee: Pick<NormalizedEmployee, "erpId" | "branchId">,
  branchId: number,
): number | undefined {
  if (employee.branchId !== branchId) return undefined
  if (!employee.erpId) return undefined
  return employee.erpId
}
