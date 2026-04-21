"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { type SortState } from "@/lib/table-sorting"
import { TableHead } from "@/components/ui/table"

type SortableTableHeadProps<Column extends string> = {
  column: Column
  sort: SortState<Column>
  onToggle: (column: Column) => void
  className?: string
  align?: "left" | "right"
  children: React.ReactNode
}

export function SortableTableHead<Column extends string>({
  column,
  sort,
  onToggle,
  className,
  align = "left",
  children,
}: SortableTableHeadProps<Column>) {
  const isActive = sort?.column === column
  const direction = isActive ? sort.direction : undefined
  const ariaSort =
    direction === "asc"
      ? "ascending"
      : direction === "desc"
        ? "descending"
        : "none"

  return (
    <TableHead aria-sort={ariaSort} className={className}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1 text-left transition-colors hover:text-foreground",
          align === "right" && "justify-end text-right",
        )}
        onClick={() => onToggle(column)}
      >
        <span>{children}</span>
        {direction === "asc" ? (
          <ArrowUpIcon className="size-3.5 shrink-0" />
        ) : direction === "desc" ? (
          <ArrowDownIcon className="size-3.5 shrink-0" />
        ) : (
          <ArrowUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
    </TableHead>
  )
}
