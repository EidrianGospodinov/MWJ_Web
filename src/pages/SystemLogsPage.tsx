import React from 'react';
import {client} from '../client';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import './ContentManagerPage.css';
import './UserManagementPage.css';

type LogRow = {
    id: string;
    at: string;
    actor: string;
    section: string;
    action: string;
    itemName: string;
    detail: string;
};

const SECTION_FILTERS = [
    'All',
    'Accounts',
    'Content',
    'Rewards',
    'Societies',
    'Resources',
    'User Management',
    'Points',
];

export default function SystemLogsPage() {
    const [rows, setRows] = React.useState<LogRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');
    const [section, setSection] = React.useState('All');

    const fetchLogs = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const audit: LogRow[] = [];
            if (client.models.AuditLog) {
                let nextToken: string | null | undefined;
                do {
                    const {data, errors, nextToken: nt} = await client.models.AuditLog.list({
                        limit: 500,
                        nextToken,
                    });
                    if (errors?.length) throw new Error(errors[0].message);
                    data.forEach((r) => {
                        audit.push({
                            id: r.id,
                            at: r.createdAt ?? '',
                            actor: r.actor,
                            section: r.section,
                            action: r.action,
                            itemName: r.itemName,
                            detail: r.detail ?? '',
                        });
                    });
                    nextToken = nt;
                } while (nextToken);
            }

            const accounts: LogRow[] = [];
            const {data: users, errors: userErrors} = await client.queries.adminListUsers();
            if (userErrors?.length) throw new Error(userErrors[0].message);
            (users ?? [])
                .filter((u): u is NonNullable<typeof u> => !!u)
                .forEach((u) => {
                    accounts.push({
                        id: `account-${u.pool}-${u.username}`,
                        at: u.joined ?? '',
                        actor: 'self-registered',
                        section: 'Accounts',
                        action: 'account created',
                        itemName: u.email || u.username,
                        detail: `${u.pool === 'mobile' ? 'Mobile app' : 'Web portal'}${u.group ? ` · ${u.group}` : ''}${u.status === 'Pending' ? ' · unverified' : ''}`,
                    });
                });

            const merged = [...audit, ...accounts].sort(
                (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
            );
            setRows(merged);
        } catch (e: unknown) {
            setError(friendlyError(e, 'Could not load the system logs. Please try again.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const visibleRows = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (section !== 'All' && r.section !== section) return false;
            if (!q) return true;
            return [r.actor, r.section, r.action, r.itemName, r.detail]
                .some((v) => v.toLowerCase().includes(q));
        });
    }, [rows, search, section]);

    const logsPag = usePagination(visibleRows);

    const formatTime = (iso: string) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
            ? '—'
            : d.toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'});
    };

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">System Logs</h1>
            <span className="cm-hint">
                New account registrations and every change made from the admin portal.
            </span>

            {error && (
                <div className="cm-load-error">
                    {error}
                    <button
                        className="cm-load-error__retry"
                        onClick={() => { setError(null); fetchLogs(); }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="um-toolbar">
                <input
                    className="um-search"
                    type="search"
                    placeholder="Search by admin, action, item…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="um-field-select sl-section-select"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                >
                    {SECTION_FILTERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <button className="cm-refresh-btn" onClick={fetchLogs}>
                    Refresh
                </button>
                {(search || section !== 'All') && (
                    <span className="um-search-count">
                        {visibleRows.length} of {rows.length} shown
                    </span>
                )}
            </div>

            {loading ? (
                <p className="um-loading">Loading…</p>
            ) : (
                <>
                    <table className="rh-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>By</th>
                                <th>Section</th>
                                <th>Action</th>
                                <th>Item</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsPag.pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="um-empty">
                                        {rows.length === 0
                                            ? 'No activity recorded yet.'
                                            : 'No log entries match your filters.'}
                                    </td>
                                </tr>
                            ) : (
                                logsPag.pageItems.map((r) => (
                                    <tr key={r.id}>
                                        <td>{formatTime(r.at)}</td>
                                        <td>{r.actor}</td>
                                        <td>{r.section}</td>
                                        <td>{r.action}</td>
                                        <td className="rh-cell--title">{r.itemName}</td>
                                        <td>{r.detail || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <Pagination
                        page={logsPag.page}
                        pageCount={logsPag.pageCount}
                        rowsPerPage={logsPag.rowsPerPage}
                        total={logsPag.total}
                        start={logsPag.start}
                        pageSize={logsPag.pageItems.length}
                        onPageChange={logsPag.setPage}
                        onRowsPerPageChange={logsPag.changeRowsPerPage}
                    />
                </>
            )}
        </section>
    );
}
