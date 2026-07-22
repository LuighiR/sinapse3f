import { getCallsDrilldown, type CallsDrilldownRow, type KpiOpts } from "./api"

const PAGE_SIZE = 100

export async function fetchAllCallsDrilldown(
  opts: Omit<KpiOpts, "page" | "pageSize">,
): Promise<CallsDrilldownRow[]> {
  const rows: CallsDrilldownRow[] = []
  let page = 1
  let totalPages = 1
  do {
    const res = await getCallsDrilldown({
      ...opts,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    rows.push(...res.rows)
    totalPages = res.pagination.totalPages
    page += 1
  } while (page <= totalPages)
  return rows
}
