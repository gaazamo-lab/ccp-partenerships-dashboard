import { type ReactNode, useMemo } from 'react';

import {
  Button,
  Dropdown,
  Table,
  TableActions,
  type TableColumn,
  TableContent,
  TableFilter,
  TableFooter,
  TableHeader,
  TablePagination,
  TableSearch,
  useTableState,
} from '@rfdtech/components';

import { formatCount } from '../lib/format';
import { usePagedRows } from '../lib/usePagedRows';
import { EmptyState } from './EmptyState';

/** A dropdown filter declared next to the table it filters. */
export interface DataTableFilter<T> {
  /** URL param key. Must be unique within the table. */
  key: string;
  label: string;
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>;
  /** The row's value for this filter. A row matches when it equals the selection. */
  value: (row: T) => string | null | undefined;
}

interface DataTableEmpty {
  message: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

interface DataTableProps<T> {
  /** Namespaces this table's URL state; must be unique per mounted table. */
  paramPrefix: string;
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  /** Shown when the table holds no rows at all. */
  empty: DataTableEmpty;
  /** Fields matched against the search box. Omit to hide the search box. */
  searchFields?: (row: T) => Array<string | null | undefined>;
  searchPlaceholder?: string;
  filters?: DataTableFilter<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /**
   * Content for the right-hand side of the table header, beside the row count.
   * As a function it receives the rows currently matching the search and
   * filters, so an export action sends exactly what the user is looking at.
   */
  actions?: ReactNode | ((visible: T[]) => ReactNode);
  pageSize?: number;
  /** Hides the footer for short, fixed lists shown inside a card. */
  paginated?: boolean;
}

function toOptions(options: DataTableFilter<unknown>['options']) {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
}

function columnText<T>(row: T, column: TableColumn<T>): string {
  if (column.accessorFn) return String(column.accessorFn(row) ?? '');
  if (column.accessorKey) return String(row[column.accessorKey] ?? '');
  return '';
}

/**
 * The standard list surface: search, dropdown filters, a live row count,
 * sorting and pagination, wired to URL state so a filtered list survives a
 * refresh and can be shared as a link.
 *
 * Filtering, sorting and paging all happen here over the full data set.
 * `TableContent` sorts again internally, but only ever sees one page — sorting
 * before the slice is what keeps the order correct across pages.
 */
export function DataTable<T>({
  paramPrefix,
  columns,
  data,
  rowKey,
  empty,
  searchFields,
  searchPlaceholder = 'Search',
  filters = [],
  onRowClick,
  loading,
  actions,
  pageSize = 25,
  paginated = true,
}: DataTableProps<T>) {
  const table = useTableState({ paramPrefix, defaultPageSize: pageSize });
  const { search, filters: active, sort } = table;

  const matched = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      if (term && searchFields) {
        const haystack = searchFields(row)
          .filter((field): field is string => Boolean(field))
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return filters.every((filter) => {
        const selected = active[filter.key];
        if (!selected) return true;
        return filter.value(row) === selected;
      });
    });
  }, [data, search, searchFields, filters, active]);

  const sorted = useMemo(() => {
    if (!sort) return matched;
    const column = columns.find((entry) => entry.id === sort.column);
    if (!column) return matched;
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...matched].sort(
      (left, right) => columnText(left, column).localeCompare(columnText(right, column)) * direction,
    );
  }, [matched, sort, columns]);

  const paged = usePagedRows(sorted, table.page, table.pageSize);
  const rows = paginated ? paged.rows : sorted;

  const isFiltered = Boolean(search.trim()) || filters.some((filter) => active[filter.key]);

  // Nothing to show and nothing filtered out: the list itself is empty, so the
  // search and filter controls would only be noise. Offer the way in instead.
  if (!loading && data.length === 0) {
    return (
      <Table paramPrefix={paramPrefix} variant="soft">
        <EmptyState {...empty} />
      </Table>
    );
  }

  return (
    <Table paramPrefix={paramPrefix} variant="soft">
      <TableHeader>
        {searchFields ? (
          <TableSearch placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
        ) : null}
        {filters.length > 0 ? (
          <TableFilter onReset={table.resetAll} variant={filters.length <= 2 ? 'spread' : 'popover'}>
            {filters.map((filter) => (
              <Dropdown
                key={filter.key}
                // `TableFilter` collects its fields by name into the table's
                // URL state; an unnamed field filters nothing and is untouched
                // by Clear.
                name={filter.key}
                aria-label={filter.label}
                value={active[filter.key] || null}
                onValueChange={(next) => table.setFilter(filter.key, next ?? '')}
                placeholder={filter.label}
                clearable
                options={toOptions(filter.options as DataTableFilter<unknown>['options'])}
              />
            ))}
          </TableFilter>
        ) : null}
        <TableActions>
          {/* `TableFilter` already badges its trigger with the active count. */}
          <span className="text-sm font-medium text-foreground-muted">
            {isFiltered
              ? `${formatCount(sorted.length)} of ${formatCount(data.length)}`
              : formatCount(data.length)}{' '}
            record{data.length === 1 ? '' : 's'}
          </span>
          {typeof actions === 'function' ? actions(sorted) : actions}
        </TableActions>
      </TableHeader>

      <TableContent
        variant="soft"
        columns={columns}
        data={rows}
        rowKey={rowKey}
        loading={loading}
        onRowClick={onRowClick ? (row) => onRowClick(row) : undefined}
        emptyIcon={empty.icon}
        emptyText={
          isFiltered ? 'No records match these filters' : empty.message
        }
      />

      {isFiltered && sorted.length === 0 ? (
        <div className="flex justify-center pb-6">
          <Button variant="outline" size="sm" onClick={table.resetAll}>
            Clear search and filters
          </Button>
        </div>
      ) : null}

      {paginated && sorted.length > 0 ? (
        <TableFooter noBorder>
          {/* `TablePagination` keeps its own default, so it has to be told the
              same one `useTableState` was given — otherwise the selector reads
              "10 per page" while the table pages by something else. */}
          <TablePagination
            totalPages={paged.totalPages}
            totalItems={paged.totalItems}
            defaultPageSize={pageSize}
          />
        </TableFooter>
      ) : null}
    </Table>
  );
}
