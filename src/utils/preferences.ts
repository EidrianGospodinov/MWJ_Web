const ROWS_KEY = 'mwj.rowsPerPage';

export const DEFAULT_ROWS_PER_PAGE = 10;

export function getRowsPerPagePreference(): number {
    try {
        const raw = localStorage.getItem(ROWS_KEY);
        const parsed = raw === null ? NaN : Number(raw);
        return [5, 10, 20].includes(parsed) ? parsed : DEFAULT_ROWS_PER_PAGE;
    } catch {
        return DEFAULT_ROWS_PER_PAGE;
    }
}

export function setRowsPerPagePreference(rows: number): void {
    try {
        localStorage.setItem(ROWS_KEY, String(rows));
    } catch {
        return;
    }
}
