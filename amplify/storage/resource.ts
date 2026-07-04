import {defineStorage} from '@aws-amplify/backend';

// Admins signed into a Cognito group assume the group's IAM role (not the base
// authenticated role), so each group needs its own storage grant.
export const storage = defineStorage({
    name: 's3BlockStorage',
    access: (allow) => ({
        'images/*': [
            allow.authenticated.to(['read', 'write']),
            allow.groups(['SuperAdmin', 'ContentAdmin', 'RewardsAdmin']).to(['read', 'write']),
        ],
        'videos/*': [
            allow.authenticated.to(['read', 'write']),
            allow.groups(['SuperAdmin', 'ContentAdmin', 'RewardsAdmin']).to(['read', 'write']),
        ],
    })
})