import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { adminUsersFn } from "../functions/admin-users/resource";

const schema = a.schema({
  ContentManagement: a
    .model({
      title: a.string().required(),
      blocks: a.json().required(),
      visibility: a.string(),
      createdBy: a.string(),
      thumbnailKey: a.string(),
      isRecommended: a.boolean(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [allow.groups(["SuperAdmin", "ContentAdmin"])]),

  Reward: a
    .model({
      title: a.string().required(),
      description: a.string(),
      pointsCost: a.integer(),
      type: a.enum(["Digital", "Physical"]),
      inventoryCount: a.integer(),
      isInfinite: a.boolean(),
      oncePerUser: a.boolean(),
      pickupInstructions: a.string(),
      thumbnailKey: a.string(),
      createdBy: a.string(),
      codes: a.hasMany("RewardCode", "rewardId"),
    })
    .authorization((allow) => [allow.groups(["SuperAdmin", "RewardsAdmin"])]),

  RewardCode: a
    .model({
      rewardId: a.id(),
      reward: a.belongsTo("Reward", "rewardId"),
      codeString: a.string().required(),
      isClaimed: a.boolean().default(false),
    })
    .authorization((allow) => [allow.groups(["SuperAdmin", "RewardsAdmin"])]),

  Redemption: a
    .model({
      userId: a.string().required(),
      userEmail: a.string().required(),
      rewardId: a.string().required(),
      rewardTitle: a.string().required(),
      pointsCost: a.integer().required(),
      redeemedAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.groups(["SuperAdmin", "RewardsAdmin"])]),

  AdminUserRow: a.customType({
    username: a.string().required(),
    email: a.string(),
    fullName: a.string(),
    enabled: a.boolean(),
    status: a.string(),
    joined: a.string(),
    group: a.string(),
  }),

  adminListUsers: a
    .query()
    .returns(a.ref("AdminUserRow").array())
    .authorization((allow) => [allow.groups(["SuperAdmin"])])
    .handler(a.handler.function(adminUsersFn)),

  adminSetUserGroup: a
    .mutation()
    .arguments({ username: a.string().required(), group: a.string() })
    .returns(a.json())
    .authorization((allow) => [allow.groups(["SuperAdmin"])])
    .handler(a.handler.function(adminUsersFn)),

  adminSetUserStatus: a
    .mutation()
    .arguments({ username: a.string().required(), enabled: a.boolean().required() })
    .returns(a.json())
    .authorization((allow) => [allow.groups(["SuperAdmin"])])
    .handler(a.handler.function(adminUsersFn)),

  adminDeleteUser: a
    .mutation()
    .arguments({ username: a.string().required() })
    .returns(a.json())
    .authorization((allow) => [allow.groups(["SuperAdmin"])])
    .handler(a.handler.function(adminUsersFn)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
