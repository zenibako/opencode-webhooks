/**
 * Custom Webhook Integration
 * 
 * This plugin sends OpenCode events to any custom webhook endpoint.
 * 
 * Setup Instructions:
 * 1. Copy this file to ~/.config/opencode/plugin/custom-webhook.ts
 * 2. Update the WEBHOOK_URL below with your webhook endpoint
 * 3. Customize the events, transformPayload, or other options as needed
 * 4. Restart OpenCode
 */

import { createWebhookPlugin } from 'opencode-webhooks';

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_URL = 'https://your-webhook-endpoint.com/api/events';

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
      
      // Optional: Transform the payload before sending
      // transformPayload: (payload) => {
      //   return {
      //     ...payload,
      //     customField: 'custom value',
      //   };
      // },
      
      // Optional: Filter events
      // shouldSend: (payload) => {
      //   // Only send error events
      //   return payload.eventType === 'session.error';
      // },
      
      // Optional: Custom headers
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN',
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
