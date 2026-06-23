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