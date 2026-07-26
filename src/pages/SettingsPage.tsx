import React from 'react';
import {updatePassword, signOut} from 'aws-amplify/auth';
import {ROWS_PER_PAGE_OPTIONS} from '../components/Pagination/usePagination';
import {getRowsPerPagePreference, setRowsPerPagePreference} from '../utils/preferences';
import {friendlyError} from '../utils/errors';
import './AccountPages.css';

export default function SettingsPage() {
    const [rowsPerPage, setRowsPerPage] = React.useState(() => getRowsPerPagePreference());
    const [prefSaved, setPrefSaved] = React.useState(false);

    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [pwWorking, setPwWorking] = React.useState(false);
    const [pwError, setPwError] = React.useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = React.useState<string | null>(null);

    const [signingOut, setSigningOut] = React.useState(false);

    const chooseRows = (rows: number) => {
        setRowsPerPage(rows);
        setRowsPerPagePreference(rows);
        setPrefSaved(true);
        window.setTimeout(() => setPrefSaved(false), 2500);
    };

    const canSubmitPassword =
        currentPassword !== '' && newPassword !== '' && confirmPassword !== '';

    const handleChangePassword = async () => {
        setPwError(null);
        setPwSuccess(null);
        if (newPassword !== confirmPassword) {
            setPwError('The new passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setPwError('Your new password must be at least 8 characters long.');
            return;
        }
        if (newPassword === currentPassword) {
            setPwError('Your new password must be different from the current one.');
            return;
        }
        setPwWorking(true);
        try {
            await updatePassword({oldPassword: currentPassword, newPassword});
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPwSuccess('Your password has been changed.');
        } catch (e: unknown) {
            setPwError(friendlyError(e, 'Changing your password failed. Check your current password and try again.'));
        } finally {
            setPwWorking(false);
        }
    };

    const handleSignOutEverywhere = async () => {
        if (!window.confirm('Sign out of this portal on all devices? You will need to sign in again.')) {
            return;
        }
        setSigningOut(true);
        try {
            await signOut({global: true});
        } catch {
            await signOut().catch(() => {});
        } finally {
            setSigningOut(false);
        }
    };

    return (
        <section className="content-area acc-page">
            <h1 className="acc-heading">Settings</h1>

            <div className="acc-grid">
                <div className="acc-card">
                    <h2 className="acc-card__title">Table preferences</h2>
                    <p className="acc-card__desc">
                        How many rows to show per page across Content, Rewards, Societies, Resources and System Logs.
                    </p>
                    <div className="acc-segment">
                        {ROWS_PER_PAGE_OPTIONS.map((rows) => (
                            <button
                                key={rows}
                                type="button"
                                className={`acc-segment__btn${rowsPerPage === rows ? ' acc-segment__btn--active' : ''}`}
                                onClick={() => chooseRows(rows)}
                            >
                                {rows}
                            </button>
                        ))}
                    </div>
                    {prefSaved && (
                        <div className="acc-message acc-message--success">
                            Saved. New tables will open with {rowsPerPage} rows per page.
                        </div>
                    )}
                    <p className="acc-card__desc">
                        This is stored in this browser only.
                    </p>
                </div>

                <div className="acc-card">
                    <h2 className="acc-card__title">Change password</h2>
                    <p className="acc-card__desc">
                        Use at least 8 characters. You stay signed in on this device.
                    </p>

                    {pwError && <div className="acc-message acc-message--error">{pwError}</div>}
                    {pwSuccess && <div className="acc-message acc-message--success">{pwSuccess}</div>}

                    <div className="acc-field">
                        <label className="acc-label" htmlFor="set-current-pw">Current password</label>
                        <input
                            id="set-current-pw"
                            className="acc-input"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="acc-field">
                        <label className="acc-label" htmlFor="set-new-pw">New password</label>
                        <input
                            id="set-new-pw"
                            className="acc-input"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="acc-field">
                        <label className="acc-label" htmlFor="set-confirm-pw">Confirm new password</label>
                        <input
                            id="set-confirm-pw"
                            className="acc-input"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    <div className="acc-actions">
                        <button
                            className="acc-btn acc-btn--primary"
                            onClick={handleChangePassword}
                            disabled={pwWorking || !canSubmitPassword}
                        >
                            {pwWorking ? 'Updating…' : 'Update password'}
                        </button>
                    </div>
                </div>

                <div className="acc-card">
                    <h2 className="acc-card__title">Sessions</h2>
                    <p className="acc-card__desc">
                        Signing out everywhere ends your session on every browser and device you have used.
                    </p>
                    <div className="acc-actions">
                        <button
                            className="acc-btn acc-btn--danger"
                            onClick={handleSignOutEverywhere}
                            disabled={signingOut}
                        >
                            {signingOut ? 'Signing out…' : 'Sign out of all devices'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
