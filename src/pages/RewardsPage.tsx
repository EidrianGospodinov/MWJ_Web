import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
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
    const [notifyEmailInput, setNotifyEmailInput] = React.useState('');
    const [savedRewards, setSavedRewards] = React.useState<Schema['Reward']['type'][]>([]);
    const [availableCodes, setAvailableCodes] = React.useState<Record<string, number>>({});
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [redemptions, setRedemptions] = React.useState<Schema['Redemption']['type'][]>([]);

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

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const addNotifyEmail = () => {
        const email = notifyEmailInput.trim().toLowerCase();
        if (!email) return;
        if (!EMAIL_RE.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        if (!notifyEmails.includes(email)) {
            setNotifyEmails([...notifyEmails, email]);
        }
        setNotifyEmailInput('');
    };

    const removeNotifyEmail = (email: string) => {
        setNotifyEmails(notifyEmails.filter((e) => e !== email));
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
        setNotifyEmailInput('');
        setEditingId(null);
    };

    const fetchRedemptions = async () => {
        if (!client.models.Redemption) return;
        const { data } = await client.models.Redemption.list();
        const sorted = [...data].sort(
            (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
        );
        setRedemptions(sorted);
    };

    const fetchRewards = async () => {
        if (!client.models.Reward) return;
        const {data} = await client.models.Reward.list();
        setSavedRewards(data);

        if (client.models.RewardCode) {
            const {data: codes} = await client.models.RewardCode.list();
            const counts: Record<string, number> = {};
            codes.forEach((code) => {
                if (code.rewardId && !code.isClaimed) {
                    counts[code.rewardId] = (counts[code.rewardId] ?? 0) + 1;
                }
            });
            setAvailableCodes(counts);
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
        setNotifyEmailInput('');
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

    return (
        <section className="content-area cm-page">
            <h1 className="cm-heading">Rewards</h1>

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

                    <div className="cm-card">
                        <span className="cm-section-label">Reward Thumbnail</span>
                        <ThumbnailUploader thumbnailKey={thumbnailKey} onChange={setThumbnailKey}/>
                    </div>

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-type">
                            Reward Type
                        </label>
                        <select
                            id="reward-type"
                            className="cm-title-input"
                            value={type}
                            onChange={(e) => setType(e.target.value as RewardType)}
                        >
                            <option value="Digital">Digital</option>
                            <option value="Physical">Physical</option>
                        </select>
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

                    <div className="cm-card">
                        <label className="cm-toggle">
                            <span className="cm-section-label">Limit to one per user</span>
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
                        <span className="cm-section-label">
                            Each user can redeem this reward only once, even if stock remains.
                        </span>
                    </div>
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

                    <div className="cm-card">
                        <label className="cm-section-label" htmlFor="reward-notify-email">
                            Claim Notification Emails
                        </label>
                        <div className="cm-email-row">
                            <input
                                id="reward-notify-email"
                                className="cm-title-input"
                                type="email"
                                placeholder="admin@westminster.ac.uk"
                                value={notifyEmailInput}
                                onChange={(e) => setNotifyEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addNotifyEmail();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="cm-action cm-action--add"
                                onClick={addNotifyEmail}
                            >
                                Add
                            </button>
                        </div>
                        {notifyEmails.length > 0 && (
                            <div className="cm-email-list">
                                {notifyEmails.map((email) => (
                                    <div key={email} className="cm-existing__row">
                                        <span className="cm-existing__title">{email}</span>
                                        <button
                                            type="button"
                                            className="cm-existing__delete"
                                            onClick={() => removeNotifyEmail(email)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span className="cm-section-label">
                            These addresses receive an email whenever a student claims this reward.
                        </span>
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
                <h2 className="cm-existing__heading">Redemption History</h2>
                {redemptions.length === 0 ? (
                    <p className="cm-empty-state">No redemptions yet.</p>
                ) : (
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
                            {redemptions.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.rewardTitle}</td>
                                    <td>{r.userEmail}</td>
                                    <td>{r.pointsCost} pts</td>
                                    <td>{new Date(r.redeemedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="cm-existing">
                <h2 className="cm-existing__heading">Existing Rewards</h2>
                {savedRewards.length === 0 ? (
                    <p className="cm-empty-state">No saved rewards yet.</p>
                ) : (
                    <div className="cm-existing__list">
                        {savedRewards.map((item) => (
                            <div key={item.id}
                                 className={`cm-existing__row${editingId === item.id ? ' cm-existing__row--editing' : ''}`}>
                                <div className="cm-existing__info">
                                    <span className="cm-existing__title">{item.title}</span>
                                    <span className="cm-existing__meta">
                                        {item.type ?? '—'}
                                        {' · '}
                                        {item.pointsCost == null ? 0 : item.pointsCost} pts
                                        {' · '}
                                        {stockLabel(item)}
                                        {item.oncePerUser ? ' · One per user' : ''}
                                        {item.notifyEmails?.length
                                            ? ` · ${item.notifyEmails.length} notified on claim`
                                            : ''}
                                    </span>
                                </div>
                                <div className="cm-existing__controls">
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
