import React from 'react';
import {fetchUserAttributes, updateUserAttributes, getCurrentUser} from 'aws-amplify/auth';
import {useAdminGroups} from '../hooks/useAdminGroups';
import type {AdminGroup} from '../hooks/useAdminGroups';
import {friendlyError} from '../utils/errors';
import './AccountPages.css';

const GROUP_LABELS: Record<AdminGroup, string> = {
    SuperAdmin: 'Super Admin',
    ContentAdmin: 'Content Admin',
    RewardsAdmin: 'Rewards Admin',
};

function initials(first: string, last: string, email: string): string {
    const a = first.trim()[0] ?? '';
    const b = last.trim()[0] ?? '';
    const combined = `${a}${b}`.toUpperCase();
    if (combined) return combined;
    return (email.trim()[0] ?? '?').toUpperCase();
}

export default function ProfilePage() {
    const groups = useAdminGroups();

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [savedFirstName, setSavedFirstName] = React.useState('');
    const [savedLastName, setSavedLastName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [username, setUsername] = React.useState('');

    const loadProfile = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [attrs, current] = await Promise.all([
                fetchUserAttributes(),
                getCurrentUser().catch(() => null),
            ]);
            const first = attrs.given_name ?? '';
            const last = attrs.family_name ?? '';
            setFirstName(first);
            setLastName(last);
            setSavedFirstName(first);
            setSavedLastName(last);
            setEmail(attrs.email ?? current?.signInDetails?.loginId ?? '');
            setUsername(current?.username ?? '');
        } catch (e: unknown) {
            setError(friendlyError(e, 'Could not load your profile. Please try again.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { loadProfile(); }, [loadProfile]);

    const dirty = firstName !== savedFirstName || lastName !== savedLastName;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await updateUserAttributes({
                userAttributes: {
                    given_name: firstName.trim(),
                    family_name: lastName.trim(),
                },
            });
            setSavedFirstName(firstName.trim());
            setSavedLastName(lastName.trim());
            setFirstName(firstName.trim());
            setLastName(lastName.trim());
            setSuccess('Your name has been updated.');
        } catch (e: unknown) {
            setError(friendlyError(e, 'Updating your profile failed. Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setFirstName(savedFirstName);
        setLastName(savedLastName);
        setError(null);
        setSuccess(null);
    };

    const roleLabel = groups === null
        ? 'Loading…'
        : groups.length === 0
        ? 'No admin role'
        : groups.map((g) => GROUP_LABELS[g]).join(' · ');

    return (
        <section className="content-area acc-page">
            <h1 className="acc-heading">My Profile</h1>

            {error && <div className="acc-message acc-message--error">{error}</div>}
            {success && <div className="acc-message acc-message--success">{success}</div>}

            {loading ? (
                <p className="acc-loading">Loading…</p>
            ) : (
                <div className="acc-grid">
                    <div className="acc-card">
                        <div className="acc-identity">
                            <div className="acc-avatar">
                                {initials(savedFirstName, savedLastName, email)}
                            </div>
                            <div>
                                <div className="acc-identity__name">
                                    {[savedFirstName, savedLastName].filter(Boolean).join(' ') || 'Unnamed admin'}
                                </div>
                                <div className="acc-identity__email">{email}</div>
                                <span
                                    className={`acc-badge${groups?.length === 0 ? ' acc-badge--none' : ''}`}
                                >
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="acc-card">
                        <h2 className="acc-card__title">Your details</h2>
                        <p className="acc-card__desc">
                            Your name is shown next to content and rewards you create.
                        </p>

                        <div className="acc-field">
                            <label className="acc-label" htmlFor="profile-first">First name</label>
                            <input
                                id="profile-first"
                                className="acc-input"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First name"
                            />
                        </div>

                        <div className="acc-field">
                            <label className="acc-label" htmlFor="profile-last">Last name</label>
                            <input
                                id="profile-last"
                                className="acc-input"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last name"
                            />
                        </div>

                        <div className="acc-field">
                            <label className="acc-label" htmlFor="profile-email">Email</label>
                            <input
                                id="profile-email"
                                className="acc-input"
                                type="email"
                                value={email}
                                disabled
                            />
                            <span className="acc-card__desc">
                                Your email is your sign-in and cannot be changed here.
                            </span>
                        </div>

                        <div className="acc-actions">
                            <button
                                className="acc-btn"
                                onClick={handleReset}
                                disabled={saving || !dirty}
                            >
                                Cancel
                            </button>
                            <button
                                className="acc-btn acc-btn--primary"
                                onClick={handleSave}
                                disabled={saving || !dirty}
                            >
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>

                    <div className="acc-card">
                        <h2 className="acc-card__title">Account</h2>
                        <div>
                            <div className="acc-readonly-row">
                                <span className="acc-readonly-row__label">Admin role</span>
                                <span className="acc-readonly-row__value">{roleLabel}</span>
                            </div>
                            <div className="acc-readonly-row">
                                <span className="acc-readonly-row__label">Email</span>
                                <span className="acc-readonly-row__value">{email || '—'}</span>
                            </div>
                            <div className="acc-readonly-row">
                                <span className="acc-readonly-row__label">User ID</span>
                                <span className="acc-readonly-row__value">{username || '—'}</span>
                            </div>
                        </div>
                        <p className="acc-card__desc">
                            Only a Super Admin can change admin roles, from User Management.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
