import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    ListUsersInGroupCommand,
    AdminListGroupsForUserCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminEnableUserCommand,
    AdminDisableUserCommand,
    AdminDeleteUserCommand,
    type UserType,
} from '@aws-sdk/client-cognito-identity-provider';

const WEB_USER_POOL_ID = process.env.ADMIN_USER_POOL_ID!;
// The student mobile app is a separate Amplify project with its own Cognito
// pool — this lets the portal list/suspend/delete those accounts too.
const MOBILE_USER_POOL_ID = process.env.MOBILE_USER_POOL_ID;

const ADMIN_GROUPS = ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'] as const;
type AdminGroup = typeof ADMIN_GROUPS[number];
type Pool = 'web' | 'mobile';

const cognito = new CognitoIdentityProviderClient({});

function isAdminGroup(name: string): name is AdminGroup {
    return (ADMIN_GROUPS as readonly string[]).includes(name);
}

function isPool(value: unknown): value is Pool {
    return value === 'web' || value === 'mobile';
}

function poolId(pool: Pool): string {
    if (pool === 'web') return WEB_USER_POOL_ID;
    if (!MOBILE_USER_POOL_ID) throw new Error('Mobile user pool is not configured.');
    return MOBILE_USER_POOL_ID;
}

function mapRow(u: UserType, pool: Pool, group: AdminGroup | null) {
    const attrs: Record<string, string> = Object.fromEntries(
        (u.Attributes ?? []).map((a) => [a.Name!, a.Value ?? ''])
    );
    const enabled = u.Enabled ?? true;
    const fullName =
        [attrs['given_name'], attrs['family_name']].filter(Boolean).join(' ') ||
        attrs['name'] ||
        u.Username ||
        '';
    const status = !enabled
        ? 'Suspended'
        : u.UserStatus === 'UNCONFIRMED' || u.UserStatus === 'FORCE_CHANGE_PASSWORD'
        ? 'Pending'
        : 'Active';
    return {
        username: u.Username ?? '',
        email: attrs['email'] ?? '',
        fullName,
        enabled,
        status,
        joined: u.UserCreateDate ? new Date(u.UserCreateDate).toISOString() : null,
        group,
        pool,
    };
}

async function listAllUsers(poolIdValue: string): Promise<UserType[]> {
    const all: UserType[] = [];
    let token: string | undefined;
    do {
        const res = await cognito.send(
            new ListUsersCommand({ UserPoolId: poolIdValue, PaginationToken: token, Limit: 60 })
        );
        all.push(...(res.Users ?? []));
        token = res.PaginationToken;
    } while (token);
    return all;
}

async function usernamesInGroup(groupName: AdminGroup): Promise<Set<string>> {
    const set = new Set<string>();
    let token: string | undefined;
    do {
        const res = await cognito.send(
            new ListUsersInGroupCommand({ UserPoolId: WEB_USER_POOL_ID, GroupName: groupName, NextToken: token })
        );
        (res.Users ?? []).forEach((u) => u.Username && set.add(u.Username));
        token = res.NextToken;
    } while (token);
    return set;
}

// AppSync's direct Lambda resolver event for a custom query/mutation.
type AdminEvent = {
    fieldName: string;
    arguments: Record<string, unknown>;
    identity?: { username?: string; claims?: Record<string, unknown> };
};

export const handler = async (event: AdminEvent) => {
    const callerUsername = event.identity?.username;

    switch (event.fieldName) {
        case 'adminListUsers': {
            const [webUsers, superAdmins, contentAdmins, rewardsAdmins, mobileUsers] = await Promise.all([
                listAllUsers(WEB_USER_POOL_ID),
                usernamesInGroup('SuperAdmin'),
                usernamesInGroup('ContentAdmin'),
                usernamesInGroup('RewardsAdmin'),
                MOBILE_USER_POOL_ID ? listAllUsers(MOBILE_USER_POOL_ID) : Promise.resolve([]),
            ]);
            const groupSets: [AdminGroup, Set<string>][] = [
                ['SuperAdmin', superAdmins],
                ['ContentAdmin', contentAdmins],
                ['RewardsAdmin', rewardsAdmins],
            ];
            const groupOf = (username: string): AdminGroup | null =>
                groupSets.find(([, set]) => set.has(username))?.[0] ?? null;

            return [
                ...webUsers.map((u) => mapRow(u, 'web', groupOf(u.Username ?? ''))),
                ...mobileUsers.map((u) => mapRow(u, 'mobile', null)),
            ];
        }

        case 'adminSetUserGroup': {
            // Admin groups only exist on the web portal's own pool.
            const username = event.arguments.username as string;
            const rawGroup = event.arguments.group as string | null | undefined;
            if (rawGroup != null && !isAdminGroup(rawGroup)) {
                throw new Error(`Invalid group: ${rawGroup}`);
            }
            const group = (rawGroup ?? null) as AdminGroup | null;
            if (username === callerUsername && group !== 'SuperAdmin') {
                throw new Error('You cannot remove your own Super Admin access.');
            }

            const current = await cognito.send(
                new AdminListGroupsForUserCommand({ UserPoolId: WEB_USER_POOL_ID, Username: username })
            );
            const currentAdminGroups = (current.Groups ?? [])
                .map((g) => g.GroupName)
                .filter((g): g is AdminGroup => !!g && isAdminGroup(g));

            await Promise.all(
                currentAdminGroups
                    .filter((g) => g !== group)
                    .map((g) =>
                        cognito.send(
                            new AdminRemoveUserFromGroupCommand({ UserPoolId: WEB_USER_POOL_ID, Username: username, GroupName: g })
                        )
                    )
            );
            if (group && !currentAdminGroups.includes(group)) {
                await cognito.send(
                    new AdminAddUserToGroupCommand({ UserPoolId: WEB_USER_POOL_ID, Username: username, GroupName: group })
                );
            }
            return { success: true };
        }

        case 'adminSetUserStatus': {
            const username = event.arguments.username as string;
            const enabled = event.arguments.enabled as boolean;
            const rawPool = event.arguments.pool;
            const pool: Pool = isPool(rawPool) ? rawPool : 'web';
            if (pool === 'web' && username === callerUsername && !enabled) {
                throw new Error('You cannot suspend your own account.');
            }
            const targetPoolId = poolId(pool);
            await cognito.send(
                enabled
                    ? new AdminEnableUserCommand({ UserPoolId: targetPoolId, Username: username })
                    : new AdminDisableUserCommand({ UserPoolId: targetPoolId, Username: username })
            );
            return { success: true };
        }

        case 'adminDeleteUser': {
            const username = event.arguments.username as string;
            const rawPool = event.arguments.pool;
            const pool: Pool = isPool(rawPool) ? rawPool : 'web';
            if (pool === 'web' && username === callerUsername) {
                throw new Error('You cannot delete your own account.');
            }
            const targetPoolId = poolId(pool);
            await cognito.send(new AdminDeleteUserCommand({ UserPoolId: targetPoolId, Username: username }));
            return { success: true };
        }

        default:
            throw new Error(`Unknown field: ${event.fieldName}`);
    }
};
