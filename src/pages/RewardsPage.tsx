import React from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {client} from '../client';
import type {Schema} from '../../amplify/data/resource';
import ThumbnailUploader from '../components/ThumbnailUploader/ThumbnailUploader';
import './ContentManagerPage.css';

type RewardType = 'Digital' | 'Physical';

export default function RewardsPage() {
    const [title, setTitle] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [pointsCost, setPointsCost] = React.useState('');
    const [type, setType] = React.useState<RewardType>('Digital');
    const [inventoryCount, setInventoryCount] = React.useState('');
    const [isInfinite, setIsInfinite] = React.useState(false);
    const [codesText, setCodesText] = React.useState('');
    const [pickupInstructions, setPickupInstructions] = React.useState('');
    const [thumbnailKey, setThumbnailKey] = React.useState<string | null>(null);
    const [savedRewards, setSavedRewards] = React.useState<Schema['Reward']['type'][]>([]);
    const [availableCodes, setAvailableCodes] = React.useState<Record<string, number>>({});
    const [editingId, setEditingId] = React.useState<string | null>(null);

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

    const resetFields = () => {
        setTitle('');
        setDescription('');
        setPointsCost('');
        setType('Digital');
        setInventoryCount('');
        setIsInfinite(false);
        setCodesText('');
        setPickupInstructions('');
        setThumbnailKey(null);
        setEditingId(null);
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
                thumbnailKey,
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
            alert('Save failed. Please try again.');
        }
    };

    const startEdit = (item: Schema['Reward']['type']) => {
        setTitle(item.title);
        setDescription(item.description ?? '');
        setPointsCost(item.pointsCost == null ? '' : String(item.pointsCost));
        setType((item.type as RewardType) ?? 'Digital');
        setInventoryCount(item.inventoryCount == null ? '' : String(item.inventoryCount));
        setIsInfinite(item.isInfinite ?? false);
        setCodesText('');
        setPickupInstructions(item.pickupInstructions ?? '');
        setThumbnailKey(item.thumbnailKey ?? null);
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
