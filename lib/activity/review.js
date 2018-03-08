const cache = require('../cache');
const { Review } = require('../messages/review');
const request = require('request');

module.exports = ({ models }) => {
  const { Subscription, SlackUser, GitHubUser } = models;

  return async (context, subscription, slack) => {

    if (
      context.payload.review.state === 'commented' &&
      context.payload.review.body === null
    ) {
      return;
    }

    console.log('context.payload', context.payload);

    const slackUser = await SlackUser.findOne({
      where: { githubId: context.payload.sender.id, slackWorkspaceId: subscription.slackWorkspaceId },
    });

    if (slackUser) {
      context.payload.slackUser = slackUser;

      request({
        uri: 'https://slackcoin.ngrok.io/api/notify',
        method: 'POST',
        json: true,
        body: {
          slackWorkspaceId: subscription.slackWorkspaceId,
          channelId: subscription.channelId,
          githubId: subscription.githubId,
        }
      });

    }

    // Get rendered message
    const message = {
      attachments: [
        new Review({ ...context.payload }).toJSON(),
      ],
    };

    const cacheKey = subscription.cacheKey(`review#${context.payload.review.id}`);
    const storedMetaData = await cache.get(cacheKey);

    if (storedMetaData) {
      const res = await slack.chat.update(storedMetaData.ts, storedMetaData.channel, '', message);
      context.log(res, 'Updated Slack message');
    } else if (context.payload.action === 'submitted') {
      const res = await slack.chat.postMessage(subscription.channelId, '', message);
      context.log(res, 'Posted Slack message');
      const messageMetaData = {
        channel: res.channel,
        ts: res.ts,
      };
      await cache.set(cacheKey, messageMetaData);
    }

  }

};
