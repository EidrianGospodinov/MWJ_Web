import React from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../client';
import type { AdminGroup } from '../hooks/useAdminGroups';
import './UserManagementPage.css';

type TabKey = 'users' | 'admins';

type Row = {
    username: string;
    fullName: string;
    email: string;
    group: AdminGroup | null;
    status: string;
    joined: string;
    enabled: boolean;
};

const GROUP_LABELS: Record<AdminGroup, string> = {
    SuperAdmin: 'Super Admin',
    ContentAdmin: 'Content Admin',
    RewardsAdmin: 'Rewards Admin',
};

const GROUP_OPTIONS: { value: AdminGroup | 'None'; label: string }[] = [
    { value: 'None', label: 'None (standard user)' },
    { value: 'SuperAdmin', label: 'Super Admin' },
    { value: 'ContentAdmin', label: 'Content Admin' },
    { value: 'RewardsAdmin', label: 'Rewards Admin' },
];

const STATUS_OPTIONS = ['Active', 'Suspended'];

const TABS: { key: TabKey; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'admins', label: 'Admins' },
];

export default function UserManagementPage() {
    const [tab, setTab] = React.useState<TabKey>('users');
    const [rows, setRows] = React.useState<Row[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [confirmTarget, setConfirmTarget] = React.useState<Row | null>(null);
    const [editTarget, setEditTarget] = React.useState<Row | null>(null);
    const [editStatus, setEditStatus] = React.useState('Active');
    const [editGroup, setEditGroup] = React.useState<AdminGroup | 'None'>('None');
    const [working, setWorking] = React.useState(false);
    const [selfUsername, setSelfUsername] = React.useState('');

    React.useEffect(() => {
        getCurrentUser()
            .then((u) => setSelfUsername(u.username))
            .catch(() => {});
    }, []);

    const fetchRows = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, errors } = await client.queries.adminListUsers();
            if (errors?.length) throw new Error(errors[0].message);
            const all: Row[] = (data ?? [])
                .filter((r): r is NonNullable<typeof r> => r !== null)
                .map((r) => ({
                    username: r.username,
                    fullName: r.fullName ?? '',
                    email: r.email ?? '',
                    group: (r.group as AdminGroup | null) ?? null,
                    status: r.status ?? '',
                    joined: r.joined ? new Date(r.joined).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                    }) : '–',
                    enabled: r.enabled ?? true,
                }));
            setRows(all.filter((r) => (tab === 'users' ? r.group === null : r.group !== null)));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    React.useEffect(() => { fetchRows(); }, [fetchRows]);

    const openEdit = (row: Row) => {
        setEditTarget(row);
        setEditStatus(row.status === 'Suspended' ? 'Suspended' : 'Active');
        setEditGroup(row.group ?? 'None');
    };

    const handleSave = async () => {
        if (!editTarget) return;
        setWorking(true);
        setError(null);
        try {
            if (editGroup !== (editTarget.group ?? 'None')) {
                const { errors } = await client.mutations.adminSetUserGroup({
                    username: editTarget.username,
                    group: editGroup === 'None' ? null : editGroup,
                });
                if (errors?.length) throw new Error(errors[0].message);
            }
            const wantEnabled = editStatus === 'Active';
            if (wantEnabled !== editTarget.enabled) {
                const { errors } = await client.mutations.adminSetUserStatus({
                    username: editTarget.username,
                    enabled: wantEnabled,
                });
                if (errors?.length) throw new Error(errors[0].message);
            }
            setEditTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Update failed.');
        } finally {
            setWorking(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmTarget) return;
        setWorking(true);
        setError(null);
        try {
            const { errors } = await client.mutations.adminDeleteUser({ username: confirmTarget.username });
            if (errors?.length) throw new Error(errors[0].message);
            setConfirmTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
        } finally {
            setWorking(false);
        }
    };

    return (
        <section className="content-area um-page">
            <h1 className="um-heading">User Management</h1>

            {error && <div className="um-error">{error}</div>}

            <div className="um-tabs">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`um-tab${tab === key ? ' um-tab--active' : ''}`}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="um-loading">Loading…</p>
            ) : (
                <table className="um-table">
                    <thead>
                        <tr>
                            <th>Full name</th>
                            <th>Email</th>
                            <th>Admin group</th>
                            <th>Status</th>
                            <th>Joined date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="um-empty">No users found.</td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.username}>
                                    <td>{row.fullName}</td>
                                    <td>{row.email}</td>
                                    <td>{row.group ? GROUP_LABELS[row.group] : '–'}</td>
                                    <td>{row.status}</td>
                                    <td>{row.joined}</td>
                                    <td>
                                        <button
                                            className="um-action"
                                            onClick={() => openEdit(row)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="um-action um-action--danger"
                                            disabled={row.username === selfUsername}
                                            onClick={() => setConfirmTarget(row)}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}

            {confirmTarget && (
                <div className="um-overlay" onClick={() => !working && setConfirmTarget(null)}>
                    <div className="um-dialog" onClick={e => e.stopPropagation()}>
                        <p className="um-dialog-msg">
                            Delete <strong>{confirmTarget.fullName || confirmTarget.email}</strong>?
                            This cannot be undone.
                        </p>
                        <div className="um-dialog-actions">
                            <button
                                className="um-btn"
                                onClick={() => setConfirmTarget(null)}
                                disabled={working}
                            >
                                Cancel
                            </button>
                            <button
                                className="um-btn um-btn--danger"
                                onClick={handleDelete}
                                disabled={working}
                            >
                                {working ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editTarget && (
                <div className="um-overlay" onClick={() => !working && setEditTarget(null)}>
                    <div className="um-modal" onClick={e => e.stopPropagation()}>
                        <h2 className="um-modal-title">Edit User</h2>
                        <p className="um-modal-sub">
                            {editTarget.fullName || editTarget.email}
                        </p>

                        <label className="um-field-label">Status</label>
                        <select
                            className="um-field-select"
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <label className="um-field-label">Admin group</label>
                        <select
                            className="um-field-select"
                            value={editGroup}
                            onChange={e => setEditGroup(e.target.value as AdminGroup | 'None')}
                            disabled={editTarget.username === selfUsername}
                        >
                            {GROUP_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>

                        <div className="um-modal-actions">
                            <button
                                className="um-btn"
                                onClick={() => setEditTarget(null)}
                                disabled={working}
                            >
                                Cancel
                            </button>
                            <button
                                className="um-btn um-btn--primary"
                                onClick={handleSave}
                                disabled={working}
                            >
                                {working ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
