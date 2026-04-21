export type SortDirection = "asc" | "desc"

export type SortState<Column extends string> = {
  column: Column
  direction: SortDirection
} | null

type SortableValue = string | number | boolean | Date | null | undefined

export type SortAccessorMap<Row, Column extends string> = Record<
  Column,
  (row: Row) => SortableValue
>

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
})

function compareValues(left: SortableValue, right: SortableValue) {
  if (left instanceof Date || right instanceof Date) {
    return new Date(left as Date | string | number).getTime() - new Date(right as Date | string | number).getTime()
  }

  if (typeof left === "boolean" || typeof right === "boolean") {
    return Number(Boolean(left)) - Number(Boolean(right))
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }

  return collator.compare(String(left), String(right))
}

function isEmptyValue(value: SortableValue) {
  return value === null || value === undefined || value === ""
}

export function getNextSort<Column extends string>(
  current: SortState<Column>,
  column: Column,
): SortState<Column> {
  if (!current || current.column !== column) {
    return { column, direction: "asc" }
  }

  return {
    column,
    direction: current.direction === "asc" ? "desc" : "asc",
  }
}

export function sortRows<Row, Column extends string>(
  rows: Row[],
  sort: SortState<Column>,
  accessors: SortAccessorMap<Row, Column>,
) {
  if (!sort) return rows

  const factor = sort.direction === "asc" ? 1 : -1
  const accessor = accessors[sort.column]

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = accessor(left.row)
      const rightValue = accessor(right.row)
      const leftEmpty = isEmptyValue(leftValue)
      const rightEmpty = isEmptyValue(rightValue)

      if (leftEmpty && rightEmpty) {
        return left.index - right.index
      }

      if (leftEmpty) return 1
      if (rightEmpty) return -1

      const result = compareValues(leftValue, rightValue)

      if (result !== 0) return result * factor

      return left.index - right.index
    })
    .map((entry) => entry.row)
}
