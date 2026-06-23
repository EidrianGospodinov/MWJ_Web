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