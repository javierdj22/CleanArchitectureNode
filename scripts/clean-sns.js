
const AWS = require('aws-sdk');

const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE || 'deploy-local';
const stage = process.env.STAGE || 'dev';
const unique = process.env.UNIQUE || '001';
const topicName = `appointments_topic-${stage}-${unique}`;

console.log(`Using AWS profile: ${profile}, region: ${region}, topic: ${topicName}`);

try {
  // configure credentials from shared ini (profile)
  const credentials = new AWS.SharedIniFileCredentials({ profile });
  AWS.config.credentials = credentials;
  AWS.config.update({ region });

  const sns = new AWS.SNS();

  (async () => {
    // list topics (may be paginated)
    let nextToken = undefined;
    let found = null;
    do {
      const params = nextToken ? { NextToken: nextToken } : {};
      // eslint-disable-next-line no-await-in-loop
      const data = await sns.listTopics(params).promise();
      nextToken = data.NextToken;
      const topics = data.Topics || [];
      for (const t of topics) {
        if (t.TopicArn && t.TopicArn.endsWith(`:${topicName}`)) {
          found = t;
          break;
        }
      }
    } while (!found && nextToken);

    if (!found) {
      console.log(`Topic not found: ${topicName}`);
      process.exit(0);
    }

    console.log(`Found topic ARN: ${found.TopicArn}. Deleting...`);
    await sns.deleteTopic({ TopicArn: found.TopicArn }).promise();
    console.log(`Topic deleted: ${topicName}`);
    process.exit(0);
  })().catch(err => {
    console.error('Error deleting topic:', err && err.message ? err.message : err);
    process.exit(1);
  });
} catch (err) {
  console.error('Error initializing AWS SDK:', err && err.message ? err.message : err);
  process.exit(1);
}
