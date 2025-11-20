/**
 * Example: How to integrate the webhook plugin with Opencode
 *
 * This example shows how you would use the webhook plugin
 * in your Opencode configuration file.
 */

// In your Opencode project (e.g., opencode.config.ts)

import { createWebhookPlugin, OpencodeEventType, BaseEventPayload } from 'opencode-webhooks';

// Create the plugin instance
const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      url: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      events: [OpencodeEventType.SESSION_IDLE],
      transformPayload: (payload: BaseEventPayload) => ({
        text: `⏸️ Session ${payload.sessionId} is now idle`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Session has been idle since ${new Date(payload.timestamp).toLocaleTimeString()}`,
            },
          },
        ],
      }),
    },
  ],
  debug: process.env.NODE_ENV === 'development',
});

// Export your Opencode configuration
export default {
  plugins: [
    webhookPlugin,
    // ... other plugins
  ],
  // ... other configuration
};

// Also export the plugin for testing
export { webhookPlugin };

/**
 * Alternative: Direct registration with Opencode instance
 */

// import opencode from 'opencode';
//
// opencode.use(webhookPlugin);
//
// // Now the plugin will automatically handle events
// // You can manually trigger events for testing:
// opencode.emit('session:idle', {
//   sessionId: 'test-session-123',
//   userId: 'user-456',
// });
