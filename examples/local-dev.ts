/**
 * Local Development Example
 * 
 * This example shows how to use the plugin when developing locally
 * or when the repo is cloned to the plugins directory.
 * 
 * Setup Instructions:
 * 1. Clone this repo to ~/.config/opencode/plugin/opencode-webhooks/
 * 2. Copy this file to ~/.config/opencode/plugin/webhook.ts
 * 3. Update the WEBHOOK_URL below
 * 4. Restart OpenCode
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from './opencode-webhooks/src/index.js';

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_URL = 'https://your-webhook-endpoint.com/api/events';

// ============================================================================
// Plugin Setup
// ============================================================================

// Export the plugin with explicit type annotation for OpenCode
const LocalDevPlugin: Plugin = createWebhookPlugin({
  webhooks: [
    {
      url: WEBHOOK_URL,
      events: [
        'session.created',
        'session.idle',
        'session.deleted',
        'session.error',
        'session.resumed',
        'message.updated',
        'message.part.updated',
      ],
      
      // Optional: Extract message content
      transformPayload: (payload) => {
        const messageContent = payload.content || payload.text || payload.message;
        return {
          ...payload,
          messageContent: messageContent || null,
        };
      },
    },
  ],
  debug: true,
});

export default LocalDevPlugin;
