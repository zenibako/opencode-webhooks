/**
 * Example: Send Slack notification when session is idle
 *
 * This example demonstrates how to use the webhook plugin to send a
 * Slack notification when an Opencode session becomes idle.
 */

import { createWebhookPlugin, OpencodeEventType, SlackMessage } from '../src';

// Replace with your actual Slack webhook URL
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

/**
 * Create the webhook plugin with Slack integration
 */
const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      // Slack webhook URL
      url: SLACK_WEBHOOK_URL,

      // Listen for session idle events
      events: [OpencodeEventType.SESSION_IDLE],

      // Transform the event payload into Slack message format
      transformPayload: (payload) => {
        const slackMessage: SlackMessage = {
          text: '⏸️ Session Idle Notification',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⏸️ Opencode Session is Idle',
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Session ID:*\n${payload.sessionId || 'Unknown'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${new Date(payload.timestamp).toLocaleString()}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Your Opencode session has been idle for a while. Consider saving your work or resuming activity.',
              },
            },
          ],
        };
        return slackMessage;
      },

      // Optional: Add custom headers
      headers: {
        'X-Custom-Header': 'opencode-webhook',
      },

      // Optional: Configure retry behavior
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },

      // Optional: Set timeout
      timeoutMs: 5000,
    },
  ],

  // Enable debug logging
  debug: true,
});

/**
 * Usage with Opencode:
 *
 * import opencode from 'opencode';
 * import { webhookPlugin } from './examples/slack-idle-notification';
 *
 * // Register the plugin
 * opencode.use(webhookPlugin);
 *
 * // The plugin will now automatically send Slack notifications
 * // when the session becomes idle
 */

export { webhookPlugin };
