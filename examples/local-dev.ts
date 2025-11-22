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

import { createWebhookPlugin } from './opencode-webhooks/src/index.ts';

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
      events: [
        'session.created',
        'session.idle',
        'session.deleted',
        'session.error',
        'session.resumed',
      ],
    },
  ],
  debug: true,
});
