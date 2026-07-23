export function buildEmployeesQuery(opts: {
  includeInactive?: boolean
  search?: string
  branchId?: number
}): URLSearchParams {
  const p = new URLSearchParams()
  if (opts.includeInactive) p.set("includeInactive", "true")
  const search = opts.search?.trim()
  if (search) p.set("search", search)
  if (opts.branchId != null) p.set("branchId", String(opts.branchId))
  return p
}

export function clearableOptionalString(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export type EmployeeFormFields = {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string
  extensionUuid: string
  chatId: string
  isNonCommercial: boolean
  isActive: boolean
}

export function buildCreateEmployeeBody(form: EmployeeFormFields) {
  return {
    name: form.name.trim(),
    branchId: form.branchId,
    erpId: form.erpId,
    extensionNumber: clearableOptionalString(form.extensionNumber),
    extensionUuid: clearableOptionalString(form.extensionUuid),
    chatId: clearableOptionalString(form.chatId),
    isNonCommercial: form.isNonCommercial,
    isActive: form.isActive,
  }
}

export type EmployeeSnapshot = {
  name: string
  branchId: number
  erpId: number
  extensionNumber: string | null
  extensionUuid: string | null
  chatId: string | null
  isNonCommercial: boolean
  isActive: boolean
}

export function buildUpdateEmployeeBody(
  current: EmployeeSnapshot,
  form: EmployeeFormFields,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  const name = form.name.trim()
  if (name !== current.name) body.name = name
  if (form.branchId !== current.branchId) body.branchId = form.branchId
  if (form.erpId !== current.erpId) body.erpId = form.erpId

  const extensionNumber = clearableOptionalString(form.extensionNumber)
  if (extensionNumber !== (current.extensionNumber ?? null)) {
    body.extensionNumber = extensionNumber
  }
  const extensionUuid = clearableOptionalString(form.extensionUuid)
  if (extensionUuid !== (current.extensionUuid ?? null)) {
    body.extensionUuid = extensionUuid
  }
  const chatId = clearableOptionalString(form.chatId)
  if (chatId !== (current.chatId ?? null)) body.chatId = chatId

  if (form.isNonCommercial !== current.isNonCommercial) {
    body.isNonCommercial = form.isNonCommercial
  }
  if (form.isActive !== current.isActive) body.isActive = form.isActive
  return body
}
