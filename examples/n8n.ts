/**
 * n8n Workflow Automation Integration
 * 
 * This plugin sends OpenCode events to n8n via webhook triggers.
 * 
 * Setup Instructions:
 * 1. Copy this file to ~/.config/opencode/plugin/n8n.ts
 * 2. In n8n, create a new workflow:
 *    - Add a "Webhook" trigger node
 *    - Set HTTP Method to POST
 *    - Copy the "Production URL" or "Test URL"
 * 3. Update WEBHOOK_URL below with your n8n webhook URL
 * 4. Restart OpenCode
 * 
 * Example Workflow Actions:
 * - Send notifications to Slack/Discord/Email when sessions start or error
 * - Log events to a database or Google Sheets
 * - Trigger other automations based on OpenCode activity
 * - Create tickets in Jira/Linear when errors occur
 * 
 * Full guide: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

// ============================================================================
// Configuration
// ============================================================================

// Replace with your n8n webhook URL (Production or Test URL)
const WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/your-webhook-id';

// Optional: If your n8n instance requires authentication
// const N8N_AUTH_HEADER = 'Bearer your-auth-token';

// ============================================================================
// Plugin Setup
// ============================================================================

// Export the plugin with explicit type annotation for OpenCode
const N8nPlugin: Plugin = createWebhookPlugin({
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
        'message.updated',
        'message.part.updated',
        'file.edited',
        'command.executed',
      ],
      
      // Transform payload for n8n
      transformPayload: (payload) => {
        // Map event types to categories for easier filtering in n8n
        const eventCategories: Record<string, string> = {
          'session.created': 'session',
          'session.idle': 'session',
          'session.deleted': 'session',
          'session.error': 'session',
          'session.resumed': 'session',
          'message.updated': 'message',
          'message.part.updated': 'message',
          'file.edited': 'file',
          'command.executed': 'command',
        };

        // Map event types to friendly labels
        const eventLabels: Record<string, string> = {
          'session.created': 'Session Started',
          'session.idle': 'Session Idle',
          'session.deleted': 'Session Ended',
          'session.error': 'Error Occurred',
          'session.resumed': 'Session Resumed',
          'message.updated': 'Message Updated',
          'message.part.updated': 'Message Part Updated',
          'file.edited': 'File Edited',
          'command.executed': 'Command Executed',
        };

        // Determine severity for conditional routing in n8n
        const severity = payload.eventType === 'session.error' ? 'error' : 'info';
        
        // Extract message content if available
        const messageContent = payload.content || payload.text || payload.message || '';
        
        // Create a summary for notifications
        let summary = `OpenCode: ${eventLabels[payload.eventType] || payload.eventType}`;
        if (payload.error) {
          summary += ` - ${payload.error}`;
        }
        if (messageContent && payload.eventType.startsWith('message.')) {
          const preview = messageContent.substring(0, 100);
          summary = preview + (messageContent.length > 100 ? '...' : '');
        }

        // Return formatted payload for n8n
        // All fields are available in n8n via {{ $json.fieldName }}
        return {
          // Event metadata
          eventType: payload.eventType,
          eventLabel: eventLabels[payload.eventType] || payload.eventType,
          eventCategory: eventCategories[payload.eventType] || 'other',
          severity: severity,
          
          // Session info
          sessionId: payload.sessionId || null,
          
          // Timestamps
          timestamp: payload.timestamp,
          
          // Content
          summary: summary,
          messageContent: messageContent || null,
          
          // Include original payload for advanced workflows
          rawPayload: payload,
        };
      },
      
      // Optional: Custom headers (uncomment if using authentication)
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': N8N_AUTH_HEADER,
      },
      
      // Retry configuration
      retry: {
        maxAttempts: 3,
        delayMs: 2000,
      },
      
      timeoutMs: 10000,
    },
  ],
  
  // Enable debug logging (set to false in production)
  debug: false,
});

export default N8nPlugin;
