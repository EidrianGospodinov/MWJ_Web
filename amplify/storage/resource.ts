import {defineStorage} from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'imageStorage',
    access: (allow) => ({
        'images/*': [
            allow.authenticated.to(['read', 'write'])
        ],
        'profile-pictures/{entity_id}/*': [
            allow.entity('identity').to(['read', 'write', 'delete'])
        ],
        'picture-submissions/*': [
            allow.authenticated.to(['read','write']),
        ],
    })
})