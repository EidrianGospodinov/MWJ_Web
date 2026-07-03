import { defineFunction } from '@aws-amplify/backend';

export const adminUsersFn = defineFunction({
    name: 'admin-users',
    entry: './handler.ts',
    timeoutSeconds: 30,
    resourceGroupName: 'data',
});
