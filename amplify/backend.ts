import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminUsersFn } from './functions/admin-users/resource';
import { rewardClaimNotifierFn } from './functions/reward-claim-notifier/resource';

import {storage} from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  adminUsersFn,
  rewardClaimNotifierFn,
});

const MOBILE_USER_POOL_ID = 'eu-west-2_1IwFesGiC';
const MOBILE_USER_POOL_ARN = `arn:aws:cognito-idp:eu-west-2:207763041295:userpool/${MOBILE_USER_POOL_ID}`;
const MOBILE_USERPROFILE_TABLE = 'UserProfile-5jhqsrle3negtogqfc3wuessqy-NONE';
const MOBILE_USERPROFILE_TABLE_ARN = `arn:aws:dynamodb:eu-west-2:207763041295:table/${MOBILE_USERPROFILE_TABLE}`;

const adminUsersLambda = backend.adminUsersFn.resources.lambda as lambda.Function;
adminUsersLambda.addEnvironment('ADMIN_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
adminUsersLambda.addEnvironment('MOBILE_USER_POOL_ID', MOBILE_USER_POOL_ID);
adminUsersLambda.addEnvironment('MOBILE_USERPROFILE_TABLE', MOBILE_USERPROFILE_TABLE);
adminUsersLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:AdminEnableUser',
      'cognito-idp:AdminDisableUser',
      'cognito-idp:AdminDeleteUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn, MOBILE_USER_POOL_ARN],
  })
);
adminUsersLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsersInGroup',
      'cognito-idp:AdminListGroupsForUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminRemoveUserFromGroup',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
adminUsersLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:GetItem', 'dynamodb:BatchGetItem', 'dynamodb:UpdateItem'],
    resources: [MOBILE_USERPROFILE_TABLE_ARN],
  })
);

// Reward claim notifications: whenever a Redemption row is inserted (by any
// client — the student claim flow lives outside this repo), a stream-triggered
// Lambda emails everyone on the claimed reward's notifyEmails list via SES.
const notifierLambda = backend.rewardClaimNotifierFn.resources.lambda as lambda.Function;
const redemptionTable = backend.data.resources.tables['Redemption'];
const rewardTable = backend.data.resources.tables['Reward'];

notifierLambda.addEventSource(
  new DynamoEventSource(redemptionTable, {
    startingPosition: lambda.StartingPosition.LATEST,
    batchSize: 10,
    retryAttempts: 1,
    filters: [lambda.FilterCriteria.filter({ eventName: lambda.FilterRule.isEqual('INSERT') })],
  })
);

notifierLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:GetItem'],
    resources: [rewardTable.tableArn],
  })
);
notifierLambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail'],
    resources: ['*'],
  })
);
notifierLambda.addEnvironment('REWARD_TABLE_NAME', rewardTable.tableName);
// Placeholder until the real Westminster sender is verified in SES.
notifierLambda.addEnvironment('SES_SENDER_EMAIL', 'rewards@westminster.ac.uk');

const s3Bucket = backend.storage.resources.bucket;
const cfnBucket = s3Bucket.node.defaultChild as s3.CfnBucket;

cfnBucket.accelerateConfiguration = {
  accelerationStatus: "Enabled"
}