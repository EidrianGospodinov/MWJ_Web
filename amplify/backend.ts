import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminUsersFn } from './functions/admin-users/resource';

import {storage} from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  adminUsersFn,
});

// The admin-users function is the only thing allowed to call Cognito admin
// APIs — it's invoked exclusively via SuperAdmin-gated GraphQL operations
// (see amplify/data/resource.ts), so no authenticated-user IAM role needs
// these permissions directly.
const adminUsersLambda = backend.adminUsersFn.resources.lambda as lambda.Function;
adminUsersLambda.addEnvironment('ADMIN_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
adminUsersLambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:ListUsersInGroup',
      'cognito-idp:AdminListGroupsForUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminRemoveUserFromGroup',
      'cognito-idp:AdminEnableUser',
      'cognito-idp:AdminDisableUser',
      'cognito-idp:AdminDeleteUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);

const s3Bucket = backend.storage.resources.bucket;
const cfnBucket = s3Bucket.node.defaultChild as s3.CfnBucket;

cfnBucket.accelerateConfiguration = {
  accelerationStatus: "Enabled"
}