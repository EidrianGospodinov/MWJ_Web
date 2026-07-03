import { defineFunction } from '@aws-amplify/backend';

export const rewardClaimNotifierFn = defineFunction({
  name: 'reward-claim-notifier',
  entry: './handler.ts',
  timeoutSeconds: 60,
  // Colocate with the data stack: the stream event source and table env vars
  // reference data resources, and a cross-stack reference here causes a
  // circular-dependency deploy failure.
  resourceGroupName: 'data',
});
