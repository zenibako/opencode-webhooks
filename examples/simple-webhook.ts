/**
 * Example: Simple webhook configuration
 *
 * This is the simplest possible webhook configuration.
 * It sends all session events to a generic webhook endpoint.
 */

import { createWebhookPlugin, OpencodeEventType } from '../src';

const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      // Your webhook URL
      url: 'https://your-webhook-endpoint.com/api/events',

      // Events to listen for
      events: [
        OpencodeEventType.SESSION_START,
        OpencodeEventType.SESSION_END,
        OpencodeEventType.SESSION_IDLE,
      ],

      // Optional: Add authentication header
      headers: {
        'Authorization': 'Bearer YOUR_API_TOKEN',
      },
    },
  ],

  // Enable debug logging to see what's happening
  debug: true,
});

export { webhookPlugin };
