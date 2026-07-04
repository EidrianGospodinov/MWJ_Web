import type { DynamoDBStreamHandler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ddb = new DynamoDBClient({});
const ses = new SESv2Client({});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RedemptionImage = {
  userEmail: string;
  rewardId: string;
  rewardTitle: string;
  pointsCost: number;
  redeemedAt: string;
};

export const handler: DynamoDBStreamHandler = async (event) => {
  const rewardTableName = process.env.REWARD_TABLE_NAME;
  const sender = process.env.SES_SENDER_EMAIL;
  if (!rewardTableName || !sender) {
    console.error('Missing REWARD_TABLE_NAME or SES_SENDER_EMAIL env var; cannot notify.');
    return;
  }

  for (const record of event.Records) {
    // Errors are logged, never rethrown: a stream retry would re-send emails
    // for the records that already succeeded in this batch.
    try {
      if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) continue;

      const redemption = unmarshall(
        record.dynamodb.NewImage as Parameters<typeof unmarshall>[0]
      ) as RedemptionImage;

      const { Item } = await ddb.send(
        new GetItemCommand({
          TableName: rewardTableName,
          Key: { id: { S: redemption.rewardId } },
        })
      );
      if (!Item) {
        console.warn(`Reward ${redemption.rewardId} not found (deleted?); skipping notification.`);
        continue;
      }

      const notifyEmails = (unmarshall(Item).notifyEmails ?? []) as (string | null)[];
      const recipients = notifyEmails.filter(
        (email): email is string => !!email && EMAIL_RE.test(email)
      );
      if (recipients.length === 0) {
        console.log(`No notification recipients for reward ${redemption.rewardId}; skipping.`);
        continue;
      }

      const redeemedAtLabel = new Date(redemption.redeemedAt).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
      });

      const content = {
        Simple: {
          Subject: { Data: `Reward claimed: ${redemption.rewardTitle}` },
          Body: {
            Text: {
              Data:
                'A student has claimed a reward.\n\n' +
                `Student: ${redemption.userEmail}\n` +
                `Reward: ${redemption.rewardTitle}\n` +
                `Points spent: ${redemption.pointsCost}\n` +
                `Redeemed at: ${redeemedAtLabel}\n`,
            },
          },
        },
      };

      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          ses.send(
            new SendEmailCommand({
              FromEmailAddress: sender,
              Destination: { ToAddresses: [recipient] },
              Content: content,
            })
          )
        )
      );
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`SES send to ${recipients[i]} failed:`, result.reason);
        }
      });
      const sent = results.filter((r) => r.status === 'fulfilled').length;
      console.log(
        `Notified ${sent}/${recipients.length} recipient(s) for reward ${redemption.rewardId} (${redemption.rewardTitle}).`
      );
    } catch (err) {
      console.error('Failed to process redemption record', record.eventID, err);
    }
  }
};
