import { useMemo } from 'react';

/**
 * `TableContent` renders exactly the rows it is given and `TablePagination`
 * only writes URL params — neither slices. Lists held in memory are paged here
 * so the pagination controls actually do something.
 */
export function usePagedRows<T>(rows: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      totalPages,
      totalItems: rows.length,
    };
  }, [rows, page, pageSize]);
}
