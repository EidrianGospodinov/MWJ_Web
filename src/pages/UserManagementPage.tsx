import React from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { client } from '../client';
import type { AdminGroup } from '../hooks/useAdminGroups';
import { useAdminGroups } from '../hooks/useAdminGroups';
import { friendlyError } from '../utils/errors';
import './UserManagementPage.css';

type TabKey = 'users' | 'admins';

type Pool = 'web' | 'mobile';

type Row = {
    username: string;
    fullName: string;
    email: string;
    group: AdminGroup | null;
    status: string;
    joined: string;
    enabled: boolean;
    pool: Pool;
    points: number | null;
};

const POOL_LABELS: Record<Pool, string> = {
    web: 'Web portal',
    mobile: 'Mobile app',
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

type PointsMode = 'add' | 'deduct';

export default function UserManagementPage() {
    const groups = useAdminGroups();
    const isSuperAdmin = (groups ?? []).includes('SuperAdmin');

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
    const [pointsTarget, setPointsTarget] = React.useState<Row | null>(null);
    const [pointsAmount, setPointsAmount] = React.useState('');
    const [pointsMode, setPointsMode] = React.useState<PointsMode>('add');
    const [pointsStep, setPointsStep] = React.useState<1 | 2>(1);
    const [pointsError, setPointsError] = React.useState<string | null>(null);

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
                    pool: (r.pool as Pool) ?? 'web',
                    points: r.points ?? null,
                }));
            setRows(all.filter((r) => (tab === 'users' ? r.group === null : r.group !== null)));
        } catch (e: unknown) {
            setError(friendlyError(e, 'Could not load the user list. Please try again.'));
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

    const openPoints = (row: Row) => {
        setPointsTarget(row);
        setPointsAmount('');
        setPointsMode('add');
        setPointsStep(1);
        setPointsError(null);
    };

    const closePoints = () => {
        if (working) return;
        setPointsTarget(null);
    };

    const parsedAmount = Number(pointsAmount);
    const amountValid = Number.isInteger(parsedAmount) && parsedAmount > 0 && parsedAmount <= 100000;

    const handlePointsContinue = () => {
        setPointsError(null);
        if (!amountValid) {
            setPointsError('Enter a whole number of points between 1 and 100,000.');
            return;
        }
        setPointsStep(2);
    };

    const handlePointsConfirm = async () => {
        if (!pointsTarget || !amountValid) return;
        setWorking(true);
        setPointsError(null);
        try {
            const signed = pointsMode === 'add' ? parsedAmount : -parsedAmount;
            const { errors } = await client.mutations.adminAddPoints({
                username: pointsTarget.username,
                amount: signed,
            });
            if (errors?.length) throw new Error(errors[0].message);
            setPointsTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setPointsError(friendlyError(e, 'The points update failed. Please try again.'));
            setPointsStep(1);
        } finally {
            setWorking(false);
        }
    };

    const handleSave = async () => {
        if (!editTarget) return;
        setWorking(true);
        setError(null);
        try {
            if (editTarget.pool === 'web' && editGroup !== (editTarget.group ?? 'None')) {
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
                    pool: editTarget.pool,
                });
                if (errors?.length) throw new Error(errors[0].message);
            }
            setEditTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setError(friendlyError(e, 'Saving the changes failed. Please try again.'));
        } finally {
            setWorking(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmTarget) return;
        setWorking(true);
        setError(null);
        try {
            const { errors } = await client.mutations.adminDeleteUser({
                username: confirmTarget.username,
                pool: confirmTarget.pool,
            });
            if (errors?.length) throw new Error(errors[0].message);
            setConfirmTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setError(friendlyError(e, 'Deleting the user failed. Please try again.'));
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
                            <th>Account</th>
                            <th>Admin group</th>
                            <th>Points</th>
                            <th>Status</th>
                            <th>Joined date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="um-empty">No users found.</td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={`${row.pool}:${row.username}`}>
                                    <td>{row.fullName}</td>
                                    <td>{row.email}</td>
                                    <td>{POOL_LABELS[row.pool]}</td>
                                    <td>{row.group ? GROUP_LABELS[row.group] : '–'}</td>
                                    <td>{row.pool === 'mobile' ? (row.points ?? 0) : '–'}</td>
                                    <td>{row.status}</td>
                                    <td>{row.joined}</td>
                                    <td>
                                        {row.pool === 'mobile' && (
                                            <button
                                                className="um-action"
                                                onClick={() => openPoints(row)}
                                            >
                                                Points
                                            </button>
                                        )}
                                        {isSuperAdmin && (
                                            <>
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
                                            </>
                                        )}
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

            {pointsTarget && (
                <div className="um-overlay" onClick={closePoints}>
                    <div className="um-modal" onClick={e => e.stopPropagation()}>
                        <h2 className="um-modal-title">
                            {pointsStep === 1 ? 'Adjust Points' : 'Confirm Points Change'}
                        </h2>
                        <p className="um-modal-sub">
                            {pointsTarget.fullName || pointsTarget.email}
                            {' · '}Current balance: {pointsTarget.points ?? 0} points
                        </p>

                        {pointsError && <div className="um-error">{pointsError}</div>}

                        {pointsStep === 1 ? (
                            <>
                                <label className="um-field-label">Action</label>
                                <select
                                    className="um-field-select"
                                    value={pointsMode}
                                    onChange={e => setPointsMode(e.target.value as PointsMode)}
                                >
                                    <option value="add">Add points</option>
                                    <option value="deduct">Deduct points</option>
                                </select>

                                <label className="um-field-label">Amount</label>
                                <input
                                    className="um-field-select"
                                    type="number"
                                    min={1}
                                    max={100000}
                                    step={1}
                                    placeholder="e.g. 50"
                                    value={pointsAmount}
                                    onChange={e => setPointsAmount(e.target.value)}
                                />

                                <div className="um-modal-actions">
                                    <button className="um-btn" onClick={closePoints} disabled={working}>
                                        Cancel
                                    </button>
                                    <button
                                        className="um-btn um-btn--primary"
                                        onClick={handlePointsContinue}
                                        disabled={working || pointsAmount === ''}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="um-dialog-msg">
                                    You are about to <strong>{pointsMode === 'add' ? 'add' : 'deduct'} {parsedAmount} points</strong>
                                    {' '}{pointsMode === 'add' ? 'to' : 'from'}{' '}
                                    <strong>{pointsTarget.fullName || pointsTarget.email}</strong>.
                                    New balance will be{' '}
                                    <strong>
                                        {Math.max(0, (pointsTarget.points ?? 0) + (pointsMode === 'add' ? parsedAmount : -parsedAmount))} points
                                    </strong>.
                                </p>
                                <div className="um-modal-actions">
                                    <button
                                        className="um-btn"
                                        onClick={() => setPointsStep(1)}
                                        disabled={working}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className="um-btn um-btn--primary"
                                        onClick={handlePointsConfirm}
                                        disabled={working}
                                    >
                                        {working ? 'Applying…' : 'Confirm'}
                                    </button>
                                </div>
                            </>
                        )}
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
                        {editTarget.pool === 'web' ? (
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
                        ) : (
                            <p className="um-modal-sub">Not applicable — this is a mobile app account.</p>
                        )}

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
