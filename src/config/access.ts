import type { Tab } from '../types';
import type { AdminGroup } from '../hooks/useAdminGroups';

export const TAB_ACCESS: Record<Tab, AdminGroup[]> = {
    Dashboard: ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'],
    User: ['SuperAdmin', 'RewardsAdmin'],
    Content: ['SuperAdmin', 'ContentAdmin'],
    Rewards: ['SuperAdmin', 'RewardsAdmin'],
    SystemLogs: ['SuperAdmin'],
    UserLogs: ['SuperAdmin'],
    Analytics: ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'],
    Profile: ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'],
    Settings: ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'],
    Resources: ['SuperAdmin', 'ContentAdmin'],
    Societies: ['SuperAdmin', 'ContentAdmin'],
};

export function canAccessTab(tab: Tab, groups: AdminGroup[]): boolean {
    return TAB_ACCESS[tab].some((g) => groups.includes(g));
}

export function firstAccessibleTab(groups: AdminGroup[]): Tab | null {
    return (Object.keys(TAB_ACCESS) as Tab[]).find((tab) => canAccessTab(tab, groups)) ?? null;
}
