/** Filter and sort utilities for table data. */

export interface Filter {
  column: string;
  operator: "contains" | "equals" | "gt" | "lt" | "gte" | "lte" | "not_equals";
  value: string;
}

export interface Sort {
  column: string;
  direction: "asc" | "desc";
}

export function applyFilters(
  data: Record<string, unknown>[],
  filters: Filter[]
): Record<string, unknown>[] {
  if (!filters.length) return data;

  return data.filter((row) =>
    filters.every((f) => {
      const cellVal = row[f.column];
      const cell = cellVal == null ? "" : String(cellVal);
      const val = f.value;

      switch (f.operator) {
        case "contains":
          return cell.toLowerCase().includes(val.toLowerCase());
        case "equals":
          return cell.toLowerCase() === val.toLowerCase();
        case "not_equals":
          return cell.toLowerCase() !== val.toLowerCase();
        case "gt":
          return parseFloat(cell) > parseFloat(val);
        case "lt":
          return parseFloat(cell) < parseFloat(val);
        case "gte":
          return parseFloat(cell) >= parseFloat(val);
        case "lte":
          return parseFloat(cell) <= parseFloat(val);
        default:
          return true;
      }
    })
  );
}

export function applySort(
  data: Record<string, unknown>[],
  sort: Sort | null
): Record<string, unknown>[] {
  if (!sort) return data;

  return [...data].sort((a, b) => {
    const aVal = a[sort.column];
    const bVal = b[sort.column];
    const aStr = aVal == null ? "" : String(aVal);
    const bStr = bVal == null ? "" : String(bVal);

    // Try numeric comparison first
    const aNum = parseFloat(aStr.replace(/[^0-9.\-]/g, ""));
    const bNum = parseFloat(bStr.replace(/[^0-9.\-]/g, ""));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sort.direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    return sort.direction === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
}

export const OPERATOR_LABELS: Record<Filter["operator"], string> = {
  contains: "Contains",
  equals: "Equals",
  not_equals: "Not equals",
  gt: ">",
  lt: "<",
  gte: ">=",
  lte: "<=",
};
