import {defineStorage} from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 's3BlockStorage',
    access: (allow) => ({
        'images/*': [
            allow.authenticated.to(['read', 'write'])
        ],
        'videos/*': [
            allow.authenticated.to(['read', 'write'])
        ],
    })
})