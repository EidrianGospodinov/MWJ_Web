import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export type AdminGroup = 'SuperAdmin' | 'ContentAdmin' | 'RewardsAdmin';

const ADMIN_GROUPS: readonly AdminGroup[] = ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'];

function isAdminGroup(value: unknown): value is AdminGroup {
    return typeof value === 'string' && (ADMIN_GROUPS as readonly string[]).includes(value);
}

// null while loading, [] once resolved with no admin group membership.
export function useAdminGroups(): AdminGroup[] | null {
    const [groups, setGroups] = useState<AdminGroup[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchAuthSession()
            .then((session) => {
                const raw = session.tokens?.idToken?.payload['cognito:groups'];
                const list = Array.isArray(raw) ? raw.filter(isAdminGroup) : [];
                if (!cancelled) setGroups(list);
            })
            .catch(() => {
                if (!cancelled) setGroups([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return groups;
}
