import React from 'react';

export const ROWS_PER_PAGE_OPTIONS = [5, 10, 20];

export function usePagination<T>(items: T[], initialRowsPerPage = 10) {
    const [page, setPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(initialRowsPerPage);

    const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * rowsPerPage;
    const pageItems = items.slice(start, start + rowsPerPage);

    const changeRowsPerPage = (rows: number) => {
        setRowsPerPage(rows);
        setPage(1);
    };

    return {
        pageItems,
        page: safePage,
        pageCount,
        rowsPerPage,
        total: items.length,
        start,
        setPage,
        changeRowsPerPage,
    };
}
