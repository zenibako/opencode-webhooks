/**
 * Slack Workflow Builder Integration
 * 
 * This plugin sends OpenCode events to Slack via Workflow Builder webhooks.
 * 
 * Setup Instructions:
 * 1. Copy this file to ~/.config/opencode/plugin/slack-workflow.ts
 * 2. Update the WEBHOOK_URL below with your Slack workflow webhook URL
 * 3. Restart OpenCode
 * 
 * To get your webhook URL:
 * - Open Slack → Workflow Builder → Create workflow
 * - Choose "Webhook" as the trigger
 * - Add variables: eventType, sessionId, timestamp, message, eventInfo
 * - Add a "Send message" step using those variables
 * - Publish and copy the webhook URL
 * 
 * Full guide: https://slack.com/help/articles/360041352714
 */

import { createWebhookPlugin } from 'opencode-webhooks';

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_URL = 'https://hooks.slack.com/workflows/T00000000/A00000000/123456789/your-webhook-id';

// ============================================================================
// Plugin Setup
// ============================================================================

export default createWebhookPlugin({
  webhooks: [
    {
      url: WEBHOOK_URL,
      
      // Which events to send
      events: [
        'session.created',
        'session.idle',
        'session.deleted',
        'session.error',
        'session.resumed',
      ],
      
      // Transform for Slack Workflow Builder
      transformPayload: (payload) => {
        const eventEmojis: Record<string, string> = {
          'session.created': '🆕',
          'session.idle': '💤',
          'session.deleted': '🗑️',
          'session.error': '❌',
          'session.resumed': '▶️',
        };

        const eventDescriptions: Record<string, string> = {
          'session.created': 'A new OpenCode session has been created',
          'session.idle': 'The OpenCode session has become idle',
          'session.deleted': 'An OpenCode session has been deleted',
          'session.error': 'An error occurred in the OpenCode session',
          'session.resumed': 'The OpenCode session has resumed activity',
        };

        const emoji = eventEmojis[payload.eventType] || '📢';
        const description = eventDescriptions[payload.eventType] || 'OpenCode event triggered';
        const availableKeys = Object.keys(payload);
        
        // Flatten payload to top level for Slack Workflow Builder
        return {
          eventType: payload.eventType,
          sessionId: payload.sessionId || 'N/A',
          timestamp: payload.timestamp,
          message: `${emoji} ${payload.eventType}`,
          eventInfo: `${description}\n\nAvailable data: ${availableKeys.join(', ')}`,
          ...payload,
        };
      },
      
      // Retry configuration
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      
      timeoutMs: 5000,
    },
  ],
  
  // Enable debug logging (set to false in production)
  debug: false,
});
