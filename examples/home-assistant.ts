/**
 * Home Assistant Webhook Integration
 * 
 * This plugin sends OpenCode events to Home Assistant via webhook automation.
 * 
 * Setup Instructions:
 * 1. Copy this file to ~/.config/opencode/plugin/home-assistant.ts
 * 2. In Home Assistant, create a new automation:
 *    - Settings → Automations & Scenes → Create Automation
 *    - Add trigger: Webhook
 *    - Set a webhook ID (e.g., "opencode_events")
 *    - Copy the webhook URL
 * 3. Update WEBHOOK_URL below with your Home Assistant webhook URL
 * 4. Update HOME_ASSISTANT_TOKEN with a long-lived access token:
 *    - User Profile → Long-Lived Access Tokens → Create Token
 * 5. Restart OpenCode
 * 
 * Example Automation Actions:
 * - Send a notification when an error occurs
 * - Turn on a light when a session starts
 * - Log events to a sensor or history
 * - Trigger other automations based on OpenCode activity
 * 
 * Full guide: https://www.home-assistant.io/docs/automation/trigger/#webhook-trigger
 */

import { createWebhookPlugin } from 'opencode-webhooks';

// ============================================================================
// Configuration
// ============================================================================

const HOME_ASSISTANT_URL = 'http://homeassistant.local:8123';
const WEBHOOK_ID = 'opencode_events';

// Optional: Uncomment and set if you need authentication
// const HOME_ASSISTANT_TOKEN = 'your-long-lived-access-token-here';

// Construct the webhook URL
const WEBHOOK_URL = `${HOME_ASSISTANT_URL}/api/webhook/${WEBHOOK_ID}`;

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
        'message.updated',
        'message.part.updated',
        'file.edited',
        'command.executed',
      ],
      
      // Transform for Home Assistant
      transformPayload: (payload) => {
        // Map event types to friendly names for Home Assistant
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

        // Determine severity for conditional automations
        const severity = payload.eventType === 'session.error' ? 'error' : 'info';
        
        // Extract message content if available
        const messageContent = payload.content || payload.text || payload.message || '';
        
        // Create a notification-friendly message
        let notificationMessage = `OpenCode: ${eventLabels[payload.eventType] || payload.eventType}`;
        if (payload.error) {
          notificationMessage += ` - ${payload.error}`;
        }
        
        // Add message preview for message events
        if (messageContent && (payload.eventType === 'message.updated' || payload.eventType === 'message.part.updated')) {
          const preview = messageContent.substring(0, 100);
          notificationMessage = preview + (messageContent.length > 100 ? '...' : '');
        }

        // Return formatted payload for Home Assistant
        return {
          event_type: payload.eventType,
          event_label: eventLabels[payload.eventType] || payload.eventType,
          severity: severity,
          session_id: payload.sessionId || 'unknown',
          timestamp: payload.timestamp,
          notification_message: notificationMessage,
          messageContent: messageContent || null,
          // Include original payload for advanced automations
          raw_payload: payload,
        };
      },
      
      // Optional: Custom headers (uncomment if using authentication)
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
      },
      
      // Retry configuration
      retry: {
        maxAttempts: 3,
        delayMs: 2000,
      },
      
      timeoutMs: 5000,
    },
  ],
  
  // Enable debug logging (set to false in production)
  debug: false,
});
