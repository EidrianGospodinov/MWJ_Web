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

const USER_POOL_ID = process.env.ADMIN_USER_POOL_ID!;
const ADMIN_GROUPS = ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'] as const;
type AdminGroup = typeof ADMIN_GROUPS[number];

const cognito = new CognitoIdentityProviderClient({});

function isAdminGroup(name: string): name is AdminGroup {
    return (ADMIN_GROUPS as readonly string[]).includes(name);
}

function mapRow(u: UserType, group: AdminGroup | null) {
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
    };
}

async function listAllUsers(): Promise<UserType[]> {
    const all: UserType[] = [];
    let token: string | undefined;
    do {
        const res = await cognito.send(
            new ListUsersCommand({ UserPoolId: USER_POOL_ID, PaginationToken: token, Limit: 60 })
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
            new ListUsersInGroupCommand({ UserPoolId: USER_POOL_ID, GroupName: groupName, NextToken: token })
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
            const [users, superAdmins, contentAdmins, rewardsAdmins] = await Promise.all([
                listAllUsers(),
                usernamesInGroup('SuperAdmin'),
                usernamesInGroup('ContentAdmin'),
                usernamesInGroup('RewardsAdmin'),
            ]);
            const groupSets: [AdminGroup, Set<string>][] = [
                ['SuperAdmin', superAdmins],
                ['ContentAdmin', contentAdmins],
                ['RewardsAdmin', rewardsAdmins],
            ];
            const groupOf = (username: string): AdminGroup | null =>
                groupSets.find(([, set]) => set.has(username))?.[0] ?? null;
            return users.map((u) => mapRow(u, groupOf(u.Username ?? '')));
        }

        case 'adminSetUserGroup': {
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
                new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
            );
            const currentAdminGroups = (current.Groups ?? [])
                .map((g) => g.GroupName)
                .filter((g): g is AdminGroup => !!g && isAdminGroup(g));

            await Promise.all(
                currentAdminGroups
                    .filter((g) => g !== group)
                    .map((g) =>
                        cognito.send(
                            new AdminRemoveUserFromGroupCommand({ UserPoolId: USER_POOL_ID, Username: username, GroupName: g })
                        )
                    )
            );
            if (group && !currentAdminGroups.includes(group)) {
                await cognito.send(
                    new AdminAddUserToGroupCommand({ UserPoolId: USER_POOL_ID, Username: username, GroupName: group })
                );
            }
            return { success: true };
        }

        case 'adminSetUserStatus': {
            const username = event.arguments.username as string;
            const enabled = event.arguments.enabled as boolean;
            if (username === callerUsername && !enabled) {
                throw new Error('You cannot suspend your own account.');
            }
            await cognito.send(
                enabled
                    ? new AdminEnableUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
                    : new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
            );
            return { success: true };
        }

        case 'adminDeleteUser': {
            const username = event.arguments.username as string;
            if (username === callerUsername) {
                throw new Error('You cannot delete your own account.');
            }
            await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
            return { success: true };
        }

        default:
            throw new Error(`Unknown field: ${event.fieldName}`);
    }
};
