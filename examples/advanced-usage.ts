/**
 * Example: Advanced webhook configuration with multiple events
 *
 * This example demonstrates advanced features:
 * - Multiple webhooks for different events
 * - Custom filtering logic
 * - Different webhook destinations
 * - Custom payload transformations
 */

import {
  createWebhookPlugin,
  OpencodeEventType,
  BaseEventPayload,
} from 'opencode-webhooks';

const webhookPlugin = createWebhookPlugin({
  webhooks: [
    // 1. Slack: Session idle notifications
    {
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      events: [OpencodeEventType.SESSION_IDLE],
      transformPayload: (payload) => ({
        text: `⏸️ Session ${payload.sessionId} is idle`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Session Idle*\nSession \`${payload.sessionId}\` has been idle since ${new Date(payload.timestamp).toLocaleTimeString()}`,
            },
          },
        ],
      }),
    },

    // 2. Slack: Session error notifications
    {
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      events: [OpencodeEventType.SESSION_ERROR],
      transformPayload: (payload) => ({
        text: '❌ Session Error',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '❌ Session Error',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${payload.error || 'No error details available'}\`\`\``,
            },
          },
        ],
      }),
    },

    // 3. Slack: Test notifications (using command executed for demonstration)
    {
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      events: [OpencodeEventType.COMMAND_EXECUTED],
      shouldSend: (payload) => payload.command?.includes('test') || false,
      transformPayload: (payload) => ({
        text: `🧪 Test command executed: ${payload.command}`,
      }),
    },

    // 4. Generic webhook: All session events
    {
      url: 'https://your-custom-webhook.example.com/api/opencode-events',
      events: [
        OpencodeEventType.SESSION_CREATED,
        OpencodeEventType.SESSION_DELETED,
        OpencodeEventType.SESSION_IDLE,
        OpencodeEventType.SESSION_STATUS,
      ],
      headers: {
        'Authorization': 'Bearer YOUR_API_TOKEN',
        'X-Event-Source': 'opencode',
      },
      // Send the raw payload as-is
      transformPayload: (payload) => payload,
    },

    // 5. Discord webhook: Error notifications
    {
      url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
      events: [OpencodeEventType.SESSION_ERROR],
      transformPayload: (payload) => ({
        content: '⚠️ An error occurred in Opencode',
        embeds: [
          {
            title: 'Error Details',
            description: payload.error || 'No error message available',
            color: 15158332, // Red color
            timestamp: payload.timestamp,
            fields: [
              {
                name: 'Session ID',
                value: payload.sessionId || 'Unknown',
                inline: true,
              },
              {
                name: 'User ID',
                value: payload.userId || 'Unknown',
                inline: true,
              },
            ],
          },
        ],
      }),
    },

    // 6. Filtered webhook: Only send if certain conditions are met
    {
      url: 'https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK',
      events: [OpencodeEventType.SESSION_ERROR],
      // Only send webhook if the error is critical
      shouldSend: (payload: BaseEventPayload) => {
        // Custom logic to determine if this is a critical error
        const errorMessage = (payload as any).error || '';
        const isCritical = errorMessage.toLowerCase().includes('critical') ||
                          errorMessage.toLowerCase().includes('fatal');
        return isCritical;
      },
      transformPayload: (payload) => ({
        text: '🚨 CRITICAL ERROR DETECTED',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 Critical Error Alert',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:* ${(payload as any).error}\n*Session:* ${payload.sessionId}`,
            },
          },
        ],
      }),
    },

    // 7. Microsoft Teams webhook
    {
      url: 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK',
      events: [
        OpencodeEventType.SESSION_COMPACTED,
      ],
      transformPayload: (payload) => ({
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: 'Session Compacted',
        themeColor: '00FF00',
        title: '✅ Session Compacted',
        sections: [
          {
            facts: [
              {
                name: 'Session ID',
                value: payload.sessionId || 'Unknown',
              },
              {
                name: 'Timestamp',
                value: new Date(payload.timestamp).toLocaleString(),
              },
            ],
          },
        ],
      }),
    },
  ],

  // Global configuration
  debug: true,
  defaultTimeoutMs: 10000,
  defaultRetry: {
    maxAttempts: 3,
    delayMs: 1000,
  },
});

export { webhookPlugin };
