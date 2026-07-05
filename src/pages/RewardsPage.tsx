import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import Pagination from '../components/Pagination/Pagination';
import {usePagination} from '../components/Pagination/usePagination';
import {friendlyError} from '../utils/errors';
import './ContentManagerPage.css';

type RewardType = 'Digital' | 'Physical';

export default function RewardsPage() {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [pointsCost, setPointsCost] = React.useState('');
    const [type, setType] = React.useState<RewardType>('Digital');
    const [inventoryCount, setInventoryCount] = React.useState('');
    const [isInfinite, setIsInfinite] = React.useState(false);
    const [oncePerUser, setOncePerUser] = React.useState(false);
    const [codesText, setCodesText] = React.useState('');
    const [pickupInstructions, setPickupInstructions] = React.useState('');
    const [thumbnailKey, setThumbnailKey] = React.useState<string | null>(null);
    const [notifyEmails, setNotifyEmails] = React.useState<string[]>([]);
    const [adminOptions, setAdminOptions] = React.useState<{email: string; group: string}[]>([]);
    const [adminLoadFailed, setAdminLoadFailed] = React.useState(false);
    const [savedRewards, setSavedRewards] = React.useState<Schema['Reward']['type'][]>([]);
    const [availableCodes, setAvailableCodes] = React.useState<Record<string, number>>({});
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [redemptions, setRedemptions] = React.useState<Schema['Redemption']['type'][]>([]);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    const parseCodes = (raw: string): string[] => {
        const seen = new Set<string>();
        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => {
                if (!line || seen.has(line)) return false;
                seen.add(line);
                return true;
            });
    };

    const toggleNotifyEmail = (email: string) => {
        setNotifyEmails((prev) =>
            prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
        );
    };

    const fetchAdmins = async () => {
        try {
            const {data, errors} = await client.queries.adminListUsers();
            if (errors?.length) throw new Error(errors[0].message);
            const seen = new Set<string>();
            const options = (data ?? [])
                .filter((r): r is NonNullable<typeof r> => !!r)
                .filter((r) =>
                    r.pool === 'web' &&
                    r.enabled !== false &&
                    (r.group === 'SuperAdmin' || r.group === 'RewardsAdmin') &&
                    !!r.email
                )
                .map((r) => ({email: r.email!.toLowerCase(), group: r.group!}))
                .filter((o) => (seen.has(o.email) ? false : (seen.add(o.email), true)));
            setAdminOptions(options);
            setAdminLoadFailed(false);
        } catch (err) {
            console.error('Could not load admin accounts', err);
            setAdminLoadFailed(true);
        }
    };

    const resetFields = () => {
        setTitle('');
        setDescription('');
        setPointsCost('');
        setType('Digital');
        setInventoryCount('');
        setIsInfinite(false);
        setOncePerUser(false);
        setCodesText('');
        setPickupInstructions('');
        setThumbnailKey(null);
        setNotifyEmails([]);
        setEditingId(null);
    };

    const fetchRedemptions = async () => {
        if (!client.models.Redemption) return;
        try {
            const { data, errors } = await client.models.Redemption.list();
            if (errors?.length) throw new Error(errors[0].message);
            const sorted = [...data].sort(
                (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
            );
            setRedemptions(sorted);
            setLoadError(null);
        } catch (err) {
            setLoadError(friendlyError(err, 'Could not load the redemption history. Try refreshing.'));
        }
    };

    const fetchRewards = async () => {
        if (!client.models.Reward) return;
        try {
            const {data, errors} = await client.models.Reward.list();
            if (errors?.length) throw new Error(errors[0].message);
            setSavedRewards(data);

            if (client.models.RewardCode) {
                const {data: codes, errors: codeErrors} = await client.models.RewardCode.list();
                if (codeErrors?.length) throw new Error(codeErrors[0].message);
                const counts: Record<string, number> = {};
                codes.forEach((code) => {
                    if (code.rewardId && !code.isClaimed) {
                        counts[code.rewardId] = (counts[code.rewardId] ?? 0) + 1;
                    }
                });
                setAvailableCodes(counts);
            }
        } catch (err) {
            setLoadError(friendlyError(err, 'Could not load the rewards. Try refreshing.'));
        }
    };

    const saveData = async () => {
        if (!title.trim()) {
            alert('Please enter a reward title before saving.');
            return;
        }
        if (!client.models.Reward) {
            alert('The Reward model is not deployed yet.');
            return;
        }

        const newCodes = type === 'Digital' ? parseCodes(codesText) : [];
        if (type === 'Digital' && !editingId && newCodes.length === 0) {
            alert('Please paste at least one promo code, one per line.');
            return;
        }

        try {
            const payload = {
                title,
                description,
                pointsCost: pointsCost === '' ? null : Number(pointsCost),
                type,
                isInfinite: type === 'Physical' ? isInfinite : false,
                inventoryCount:
                    type === 'Physical' && !isInfinite && inventoryCount !== ''
                        ? Number(inventoryCount)
                        : null,
                pickupInstructions: type === 'Physical' ? pickupInstructions : null,
                oncePerUser,
                thumbnailKey,
                notifyEmails,
            };

            let rewardId = editingId;
            if (editingId) {
                await client.models.Reward.update({id: editingId, ...payload});
            } else {
                const createdBy = await getCurrentUser()
                    .then((u) => u.signInDetails?.loginId ?? u.username)
                    .catch(() => undefined);
                const {data} = await client.models.Reward.create({...payload, createdBy});
                rewardId = data?.id ?? null;
            }

            if (type === 'Digital' && rewardId && newCodes.length > 0 && client.models.RewardCode) {
                await Promise.all(
                    newCodes.map((codeString) =>
                        client.models.RewardCode.create({
                            rewardId,
                            codeString,
                            isClaimed: false,
                        })
                    )
                );
            }

            resetFields();
            await fetchRewards();
        } catch (err) {
            console.error('Save failed', err);
            alert(friendlyError(err, 'Saving the reward failed. Please try again.'));
        }
    };

    const startEdit = (item: Schema['Reward']['type']) => {
        setTitle(item.title);
        setDescription(item.description ?? '');
        setPointsCost(item.pointsCost == null ? '' : String(item.pointsCost));
        setType((item.type as RewardType) ?? 'Digital');
        setInventoryCount(item.inventoryCount == null ? '' : String(item.inventoryCount));
        setIsInfinite(item.isInfinite ?? false);
        setOncePerUser(item.oncePerUser ?? false);
        setCodesText('');
        setPickupInstructions(item.pickupInstructions ?? '');
        setThumbnailKey(item.thumbnailKey ?? null);
        setNotifyEmails((item.notifyEmails ?? []).filter((e): e is string => !!e));
        setEditingId(item.id);
    };

    const deleteReward = async (id: string) => {
        if (!client.models.Reward) return;
        if (client.models.RewardCode) {
            const {data: codes} = await client.models.RewardCode.list({
                filter: {rewardId: {eq: id}},
            });
            await Promise.all(
                codes.map((code) => client.models.RewardCode.delete({id: code.id}))
            );
        }
        await client.models.Reward.delete({id});
        await fetchRewards();
    };

    React.useEffect(() => {
        fetchRewards();
        fetchRedemptions();
        fetchAdmins();
    }, []);

    const handleCancel = () => {
        resetFields();
    };

    const stockLabel = (item: Schema['Reward']['type']): string => {
        if (item.type === 'Digital') {
            return `${availableCodes[item.id] ?? 0} codes available`;
        }
        return item.isInfinite ? 'Infinite stock' : `${item.inventoryCount ?? 0} in stock`;
    };

    const redemptionsPag = usePagination(redemptions);
    const rewardsPag = usePagination(savedRewards);

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Rewards</h1>

            {loadError && (
                <div className="cm-load-error">
                    {loadError}
                    <button
                        className="cm-load-error__retry"
                        onClick={() => { setLoadError(null); fetchRewards(); fetchRedemptions(); }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="cm-body">

                <aside className="cm-left">
                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-title">
                            Reward Title
                        </label>
                        <input
                            id="reward-title"
                            className="cm-title-input"
                            type="text"
                            placeholder="Enter reward title…"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="cm-card cm-card--compact">
                        <span className="cm-section-label">Reward Type</span>
                        <div className="cm-segment" role="group" aria-label="Reward type">
                            {(['Digital', 'Physical'] as RewardType[]).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={`cm-segment__btn${type === option ? ' cm-segment__btn--active' : ''}`}
                                    onClick={() => setType(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        <label
                            className="cm-toggle cm-toggle--sm"
                            title="Each user can redeem this reward only once, even if stock remains."
                        >
                            <span className="cm-toggle__text">Limit to one per user</span>
                            <input
                                type="checkbox"
                                className="cm-toggle__input"
                                checked={oncePerUser}
                                onChange={(e) => setOncePerUser(e.target.checked)}
                            />
                            <span className="cm-toggle__track">
                                <span className="cm-toggle__thumb"/>
                            </span>
                        </label>
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-notify-emails">
                            Claim Notification Emails
                        </label>
                        {adminLoadFailed ? (
                            <span className="cm-hint">
                                Could not load the admin accounts. Refresh the page to try again.
                            </span>
                        ) : adminOptions.length === 0 ? (
                            <span className="cm-hint">
                                No Super Admin or Rewards Admin accounts were found.
                            </span>
                        ) : (
                            <select
                                id="reward-notify-emails"
                                className="cm-title-input"
                                value=""
                                onChange={(e) => e.target.value && toggleNotifyEmail(e.target.value)}
                            >
                                <option value="" disabled>Select an admin to notify…</option>
                                {adminOptions
                                    .filter((admin) => !notifyEmails.includes(admin.email))
                                    .map((admin) => (
                                        <option key={admin.email} value={admin.email}>
                                            {admin.email} — {admin.group === 'SuperAdmin' ? 'Super Admin' : 'Rewards Admin'}
                                        </option>
                                    ))}
                            </select>
                        )}
                        {notifyEmails.length > 0 && (
                            <div className="cm-email-list">
                                {notifyEmails.map((email) => (
                                    <div key={email} className="cm-existing__row">
                                        <span className="cm-existing__title">{email}</span>
                                        <button
                                            type="button"
                                            className="cm-existing__delete"
                                            onClick={() => toggleNotifyEmail(email)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span className="cm-hint">
                            Selected admins receive an email whenever a student claims this reward.
                        </span>
                    </div>

                    <div className="cm-card">
                        <span className="cm-section-label">Reward Thumbnail</span>
                        <ThumbnailUploader thumbnailKey={thumbnailKey} onChange={setThumbnailKey}/>
                    </div>

                    {type === 'Physical' && (
                        <div className="cm-card">
                            <label className="cm-toggle">
                                <span className="cm-section-label">Infinite Stock</span>
                                <input
                                    type="checkbox"
                                    className="cm-toggle__input"
                                    checked={isInfinite}
                                    onChange={(e) => setIsInfinite(e.target.checked)}
                                />
                                <span className="cm-toggle__track">
                                    <span className="cm-toggle__thumb"/>
                                </span>
                            </label>

                            {!isInfinite && (
                                <>
                                    <label className="cm-section-label" htmlFor="reward-inventory">
                                        Inventory Count
                                    </label>
                                    <input
                                        id="reward-inventory"
                                        className="cm-title-input"
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={inventoryCount}
                                        onChange={(e) => setInventoryCount(e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    )}

                </aside>

                <div className="cm-right">

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-description">
                            Description
                        </label>
                        <textarea
                            id="reward-description"
                            className="cm-title-input"
                            rows={4}
                            placeholder="Describe this reward…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-points">
                            Points Cost
                        </label>
                        <input
                            id="reward-points"
                            className="cm-title-input"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={pointsCost}
                            onChange={(e) => setPointsCost(e.target.value)}
                        />
                    </div>

                    {type === 'Digital' ? (
                        <div className="cm-card">
                            <label className="cm-section-label" htmlFor="reward-codes">
                                Promo Codes
                            </label>
                            <textarea
                                id="reward-codes"
                                className="cm-title-input"
                                rows={8}
                                placeholder="Paste one unique code per line…"
                                value={codesText}
                                onChange={(e) => setCodesText(e.target.value)}
                            />
                            <span className="cm-section-label">
                                {parseCodes(codesText).length} unique codes detected
                                {editingId ? ' · added to existing pool' : ''}
                            </span>
                        </div>
                    ) : (
                        <div className="cm-card">
                            <label className="cm-section-label" htmlFor="reward-pickup">
                                Pickup Instructions
                            </label>
                            <textarea
                                id="reward-pickup"
                                className="cm-title-input"
                                rows={4}
                                placeholder="Enter pickup instructions…"
                                value={pickupInstructions}
                                onChange={(e) => setPickupInstructions(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="cm-footer">
                <button className="cm-action cm-action--cancel" onClick={handleCancel}>
                    Cancel
                </button>
                <button className="cm-action cm-action--add" onClick={saveData}>
                    Add
                </button>
                <button className="cm-action cm-action--submit" onClick={saveData}>
                    {editingId ? 'Save Changes' : 'Preview & Submit'}
                </button>
            </div>

            <div className="cm-existing">
                <div className="cm-existing__header-row">
                    <h2 className="cm-existing__heading">Redemption History</h2>
                    <button className="cm-refresh-btn" onClick={fetchRedemptions}>
                        Refresh
                    </button>
                </div>
                {redemptions.length === 0 ? (
                    <p className="cm-empty-state">No redemptions yet.</p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Reward</th>
                                    <th>Student Email</th>
                                    <th>Points Spent</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {redemptionsPag.pageItems.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.rewardTitle}</td>
                                        <td>{r.userEmail}</td>
                                        <td>{r.pointsCost} pts</td>
                                        <td>{new Date(r.redeemedAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination
                            page={redemptionsPag.page}
                            pageCount={redemptionsPag.pageCount}
                            rowsPerPage={redemptionsPag.rowsPerPage}
                            total={redemptionsPag.total}
                            start={redemptionsPag.start}
                            pageSize={redemptionsPag.pageItems.length}
                            onPageChange={redemptionsPag.setPage}
                            onRowsPerPageChange={redemptionsPag.changeRowsPerPage}
                        />
                    </>
                )}
            </div>

            <div className="cm-existing">
                <h2 className="cm-existing__heading">Existing Rewards</h2>
                {savedRewards.length === 0 ? (
                    <p className="cm-empty-state">No saved rewards yet.</p>
                ) : (
                    <>
                        <table className="rh-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Points</th>
                                    <th>Stock</th>
                                    <th>Options</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rewardsPag.pageItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={editingId === item.id ? 'rh-row--editing' : ''}
                                    >
                                        <td className="rh-cell--title">{item.title}</td>
                                        <td>{item.type ?? '—'}</td>
                                        <td>{item.pointsCost == null ? 0 : item.pointsCost} pts</td>
                                        <td>{stockLabel(item)}</td>
                                        <td>
                                            {[
                                                item.oncePerUser ? 'One per user' : null,
                                                item.notifyEmails?.length
                                                    ? `${item.notifyEmails.length} notified on claim`
                                                    : null,
                                            ].filter(Boolean).join(' · ') || '—'}
                                        </td>
                                        <td>
                                            <div className="rh-actions">
                                                <button
                                                    className="cm-existing__edit"
                                                    onClick={() => startEdit(item)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="cm-existing__delete"
                                                    onClick={() => deleteReward(item.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination
                            page={rewardsPag.page}
                            pageCount={rewardsPag.pageCount}
                            rowsPerPage={rewardsPag.rowsPerPage}
                            total={rewardsPag.total}
                            start={rewardsPag.start}
                            pageSize={rewardsPag.pageItems.length}
                            onPageChange={rewardsPag.setPage}
                            onRowsPerPageChange={rewardsPag.changeRowsPerPage}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
