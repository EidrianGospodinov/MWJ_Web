import React from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminDeleteUserCommand,
    AdminUpdateUserAttributesCommand,
    AdminEnableUserCommand,
    AdminDisableUserCommand,
    type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import './UserManagementPage.css';

type TabKey = 'users' | 'admins';

type Row = {
    username: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    joined: string;
    enabled: boolean;
};

// Admins and mobile users share the same Cognito user pool; the tabs are
// distinguished client-side by custom:role (see ADMIN_ROLES / USER_ROLES).
const ADMIN_POOL = 'eu-west-2_j40RJRiTE';
const USER_POOL  = 'eu-west-2_j40RJRiTE';
const REGION     = 'eu-west-2';

const USER_ROLES  = ['Student', 'Society Lead'];
const ADMIN_ROLES = ['Super Admin', 'Content Admin', 'Rewards Admin'];
const STATUS_OPTIONS = ['Active', 'Suspended'];

const TABS: { key: TabKey; label: string }[] = [
    { key: 'users',  label: 'Users' },
    { key: 'admins', label: 'Admins' },
];

async function makeCognitoClient(): Promise<CognitoIdentityProviderClient> {
    const session = await fetchAuthSession();
    const creds = session.credentials!;
    return new CognitoIdentityProviderClient({
        region: REGION,
        credentials: {
            accessKeyId:     creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken:    creds.sessionToken,
        },
    });
}

function mapRow(u: UserType): Row {
    const attrs: Record<string, string> = Object.fromEntries(
        (u.Attributes ?? []).map(a => [a.Name!, a.Value ?? ''])
    );
    const enabled = u.Enabled ?? true;
    const fullName =
        [attrs['given_name'], attrs['family_name']].filter(Boolean).join(' ')
        || attrs['name']
        || u.Username
        || '';
    const status = !enabled
        ? 'Suspended'
        : u.UserStatus === 'UNCONFIRMED' || u.UserStatus === 'FORCE_CHANGE_PASSWORD'
        ? 'Pending'
        : 'Active';
    const joined = u.UserCreateDate
        ? new Date(u.UserCreateDate).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
          })
        : '–';
    return {
        username: u.Username ?? '',
        fullName,
        email:  attrs['email'] ?? '',
        role:   attrs['custom:role'] ?? '',
        status,
        joined,
        enabled,
    };
}

export default function UserManagementPage() {
    const [tab,            setTab]            = React.useState<TabKey>('users');
    const [rows,           setRows]           = React.useState<Row[]>([]);
    const [loading,        setLoading]        = React.useState(false);
    const [error,          setError]          = React.useState<string | null>(null);
    const [confirmTarget,  setConfirmTarget]  = React.useState<Row | null>(null);
    const [editTarget,     setEditTarget]     = React.useState<Row | null>(null);
    const [editStatus,     setEditStatus]     = React.useState('Active');
    const [editRole,       setEditRole]       = React.useState('');
    const [working,        setWorking]        = React.useState(false);
    const [selfUsername,   setSelfUsername]   = React.useState('');

    const poolId = tab === 'admins' ? ADMIN_POOL : USER_POOL;

    React.useEffect(() => {
        getCurrentUser()
            .then(u => setSelfUsername(u.username))
            .catch(() => {});
    }, []);

    const fetchRows = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const client = await makeCognitoClient();
            const res = await client.send(
                new ListUsersCommand({ UserPoolId: poolId, Limit: 60 })
            );
            // Both tabs read the same pool, so split by role: the Users tab
            // shows only explicit student roles; everyone else (admin roles or
            // no role yet) belongs to the Admins tab.
            const all = (res.Users ?? []).map(mapRow);
            setRows(
                all.filter(r =>
                    tab === 'users'
                        ? USER_ROLES.includes(r.role)
                        : !USER_ROLES.includes(r.role)
                )
            );
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, [poolId, tab]);

    React.useEffect(() => { fetchRows(); }, [fetchRows]);

    const openEdit = (row: Row) => {
        const roleOpts = tab === 'admins' ? ADMIN_ROLES : USER_ROLES;
        setEditTarget(row);
        setEditStatus(row.status === 'Suspended' ? 'Suspended' : 'Active');
        setEditRole(row.role || roleOpts[0]);
    };

    const handleSave = async () => {
        if (!editTarget) return;
        setWorking(true);
        setError(null);
        try {
            const client = await makeCognitoClient();
            if (editRole !== editTarget.role) {
                await client.send(new AdminUpdateUserAttributesCommand({
                    UserPoolId: poolId,
                    Username:   editTarget.username,
                    UserAttributes: [{ Name: 'custom:role', Value: editRole }],
                }));
            }
            if (editStatus === 'Suspended' && editTarget.enabled) {
                await client.send(new AdminDisableUserCommand({
                    UserPoolId: poolId,
                    Username:   editTarget.username,
                }));
            } else if (editStatus === 'Active' && !editTarget.enabled) {
                await client.send(new AdminEnableUserCommand({
                    UserPoolId: poolId,
                    Username:   editTarget.username,
                }));
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
            const client = await makeCognitoClient();
            await client.send(new AdminDeleteUserCommand({
                UserPoolId: poolId,
                Username:   confirmTarget.username,
            }));
            setConfirmTarget(null);
            await fetchRows();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
        } finally {
            setWorking(false);
        }
    };

    const roleOptions = tab === 'admins' ? ADMIN_ROLES : USER_ROLES;

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
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined date</th>
                            <th>2F Auth</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="um-empty">No users found.</td>
                            </tr>
                        ) : (
                            rows.map(row => (
                                <tr key={row.username}>
                                    <td>{row.fullName}</td>
                                    <td>{row.email}</td>
                                    <td>{row.role || '–'}</td>
                                    <td>{row.status}</td>
                                    <td>{row.joined}</td>
                                    <td>–</td>
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

                        <label className="um-field-label">Role</label>
                        <select
                            className="um-field-select"
                            value={editRole}
                            onChange={e => setEditRole(e.target.value)}
                        >
                            {roleOptions.map(r => (
                                <option key={r} value={r}>{r}</option>
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
