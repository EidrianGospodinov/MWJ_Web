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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const WEB_USER_POOL_ID = process.env.ADMIN_USER_POOL_ID!;
const MOBILE_USER_POOL_ID = process.env.MOBILE_USER_POOL_ID;
const MOBILE_USERPROFILE_TABLE = process.env.MOBILE_USERPROFILE_TABLE;

const ADMIN_GROUPS = ['SuperAdmin', 'ContentAdmin', 'RewardsAdmin'] as const;
type AdminGroup = typeof ADMIN_GROUPS[number];
type Pool = 'web' | 'mobile';

const cognito = new CognitoIdentityProviderClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

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

function callerGroups(event: AdminEvent): string[] {
    const raw = event.identity?.claims?.['cognito:groups'];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string') return [raw];
    return [];
}

function mapRow(u: UserType, pool: Pool, group: AdminGroup | null, points: number | null) {
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
        points,
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

async function fetchPoints(usernames: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!MOBILE_USERPROFILE_TABLE || usernames.length === 0) return result;
    for (let i = 0; i < usernames.length; i += 100) {
        const chunk = usernames.slice(i, i + 100);
        const res = await ddb.send(
            new BatchGetCommand({
                RequestItems: {
                    [MOBILE_USERPROFILE_TABLE]: {
                        Keys: chunk.map((id) => ({ id })),
                        ProjectionExpression: 'id, points',
                    },
                },
            })
        );
        (res.Responses?.[MOBILE_USERPROFILE_TABLE] ?? []).forEach((item) => {
            if (typeof item.id === 'string') {
                result.set(item.id, typeof item.points === 'number' ? item.points : 0);
            }
        });
    }
    return result;
}

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
            const points = await fetchPoints(
                mobileUsers.map((u) => u.Username ?? '').filter(Boolean)
            );
            const groupSets: [AdminGroup, Set<string>][] = [
                ['SuperAdmin', superAdmins],
                ['ContentAdmin', contentAdmins],
                ['RewardsAdmin', rewardsAdmins],
            ];
            const groupOf = (username: string): AdminGroup | null =>
                groupSets.find(([, set]) => set.has(username))?.[0] ?? null;

            return [
                ...webUsers.map((u) => mapRow(u, 'web', groupOf(u.Username ?? ''), null)),
                ...mobileUsers.map((u) => mapRow(u, 'mobile', null, points.get(u.Username ?? '') ?? 0)),
            ];
        }

        case 'adminSetUserGroup': {
            if (!callerGroups(event).includes('SuperAdmin')) {
                throw new Error('Only a Super Admin can change admin groups.');
            }
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

        case 'adminAddPoints': {
            if (!MOBILE_USERPROFILE_TABLE) {
                throw new Error('Points storage is not configured.');
            }
            const username = event.arguments.username as string;
            const amount = event.arguments.amount as number;
            if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
                throw new Error('Amount must be a whole number between -100,000 and 100,000 (not zero).');
            }
            try {
                const res = await ddb.send(
                    new UpdateCommand({
                        TableName: MOBILE_USERPROFILE_TABLE,
                        Key: { id: username },
                        UpdateExpression: 'SET points = if_not_exists(points, :zero) + :amt',
                        ConditionExpression: 'attribute_exists(id)',
                        ExpressionAttributeValues: { ':amt': amount, ':zero': 0 },
                        ReturnValues: 'ALL_NEW',
                    })
                );
                let newBalance = typeof res.Attributes?.points === 'number' ? res.Attributes.points : 0;
                if (newBalance < 0) {
                    const fix = await ddb.send(
                        new UpdateCommand({
                            TableName: MOBILE_USERPROFILE_TABLE,
                            Key: { id: username },
                            UpdateExpression: 'SET points = :zero',
                            ExpressionAttributeValues: { ':zero': 0 },
                            ReturnValues: 'ALL_NEW',
                        })
                    );
                    newBalance = typeof fix.Attributes?.points === 'number' ? fix.Attributes.points : 0;
                }
                return { success: true, newBalance };
            } catch (err) {
                if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
                    throw new Error('This student has no app profile yet, so points cannot be adjusted.');
                }
                throw err;
            }
        }

        default:
            throw new Error(`Unknown field: ${event.fieldName}`);
    }
};
