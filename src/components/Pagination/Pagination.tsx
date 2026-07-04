import { ROWS_PER_PAGE_OPTIONS } from './usePagination';
import './Pagination.css';

type Props = {
    page: number;
    pageCount: number;
    rowsPerPage: number;
    total: number;
    start: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
};

export default function Pagination({
    page,
    pageCount,
    rowsPerPage,
    total,
    start,
    pageSize,
    onPageChange,
    onRowsPerPageChange,
}: Props) {
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    const end = Math.min(start + pageSize, total);

    return (
        <div className="pg-bar">
            <label className="pg-rows">
                Rows per page
                <select
                    value={rowsPerPage}
                    onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </label>
            <span className="pg-summary">
                {total === 0 ? '0 of 0' : `${start + 1}–${end} of ${total}`}
            </span>
            <div className="pg-pages">
                <button
                    className="pg-page"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    ‹
                </button>
                {pages.map((p) => (
                    <button
                        key={p}
                        className={`pg-page${p === page ? ' pg-page--active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    className="pg-page"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                >
                    ›
                </button>
            </div>
        </div>
    );
}
