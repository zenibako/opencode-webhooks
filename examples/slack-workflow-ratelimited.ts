/**
 * Slack Workflow Builder Integration with Rate Limiting
 * 
 * This example shows how to use rate limiting and batching to avoid
 * hitting Slack's 10 requests per minute limit.
 * 
 * Setup Instructions:
 * 1. Copy this file to ~/.config/opencode/plugin/slack-workflow.ts
 * 2. Update the WEBHOOK_URL below with your Slack workflow webhook URL
 * 3. Restart OpenCode
 * 
 * To get your webhook URL:
 * - Open Slack → Workflow Builder → Create workflow
 * - Choose "Webhook" as the trigger
 * - Add variables: summary, eventCount, batchStartTime, batchEndTime
 * - Add a "Send message" step using those variables
 * - Publish and copy the webhook URL
 * 
 * Full guide: https://slack.com/help/articles/360041352714
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin, OpencodeEventType } from 'opencode-webhooks';

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_URL = 'https://hooks.slack.com/triggers/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';

// ============================================================================
// Plugin Setup with Rate Limiting
// ============================================================================

const SlackWorkflowPlugin: Plugin = createWebhookPlugin({
  webhooks: [
    {
      url: WEBHOOK_URL,
      
      // Which events to send
      events: [
        OpencodeEventType.SESSION_CREATED,
        OpencodeEventType.SESSION_IDLE,
        OpencodeEventType.SESSION_DELETED,
        OpencodeEventType.SESSION_ERROR,
        OpencodeEventType.SESSION_RESUMED,
        OpencodeEventType.MESSAGE_UPDATED,
        OpencodeEventType.MESSAGE_PART_UPDATED,
        OpencodeEventType.FILE_EDITED,
      ],
      
      // Rate limiting configuration (Slack allows 10 requests per minute)
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
        maxBatchDelayMs: 10000, // Send batch after max 10 seconds
        
        // Custom markdown summary generator
        generateSummary: (events) => {
          const eventsByType = new Map<string, any[]>();
          
          // Group events by type
          for (const event of events) {
            const type = event.eventType;
            if (!eventsByType.has(type)) {
              eventsByType.set(type, []);
            }
            eventsByType.get(type)!.push(event);
          }
          
          // Build summary
          let summary = `# 🤖 OpenCode Activity Summary\n\n`;
          summary += `**${events.length} events** from ${events[0].timestamp} to ${events[events.length - 1].timestamp}\n\n`;
          
          // Session events
          const sessionEvents = [
            OpencodeEventType.SESSION_CREATED,
            OpencodeEventType.SESSION_IDLE,
            OpencodeEventType.SESSION_ERROR,
            OpencodeEventType.SESSION_RESUMED,
            OpencodeEventType.SESSION_DELETED,
          ];
          
          const sessionCount = sessionEvents
            .map(type => eventsByType.get(type)?.length || 0)
            .reduce((a, b) => a + b, 0);
          
          if (sessionCount > 0) {
            summary += `## 📊 Session Activity (${sessionCount})\n\n`;
            
            for (const [type, typeEvents] of eventsByType) {
              if (sessionEvents.includes(type as OpencodeEventType)) {
                const emoji = {
                  'session.created': '🆕',
                  'session.idle': '💤',
                  'session.error': '❌',
                  'session.resumed': '▶️',
                  'session.deleted': '🗑️',
                }[type] || '📢';
                
                summary += `- ${emoji} **${typeEvents.length}** ${type}\n`;
                
                // Show errors if any
                if (type === OpencodeEventType.SESSION_ERROR) {
                  for (const event of typeEvents.slice(0, 3)) {
                    if (event.error) {
                      summary += `  - \`${event.error}\`\n`;
                    }
                  }
                }
              }
            }
            summary += '\n';
          }
          
          // File events
          const fileEvents = eventsByType.get(OpencodeEventType.FILE_EDITED);
          if (fileEvents && fileEvents.length > 0) {
            summary += `## 📝 File Changes (${fileEvents.length})\n\n`;
            
            const files = new Set(fileEvents.map(e => e.filePath).filter(Boolean));
            const fileList = Array.from(files).slice(0, 10);
            
            for (const file of fileList) {
              summary += `- \`${file}\`\n`;
            }
            
            if (files.size > 10) {
              summary += `- ...and ${files.size - 10} more files\n`;
            }
            summary += '\n';
          }
          
          // Message events
          const messageEvents = [
            ...eventsByType.get(OpencodeEventType.MESSAGE_UPDATED) || [],
            ...eventsByType.get(OpencodeEventType.MESSAGE_PART_UPDATED) || [],
          ];
          
          if (messageEvents.length > 0) {
            summary += `## 💬 Messages (${messageEvents.length})\n\n`;
            summary += `- ${messageEvents.length} message updates\n\n`;
          }
          
          return summary;
        },
      },
      
      // Transform for individual events (when not batched)
      transformPayload: (payload) => {
        const eventEmojis: Record<string, string> = {
          'session.created': '🆕',
          'session.idle': '💤',
          'session.deleted': '🗑️',
          'session.error': '❌',
          'session.resumed': '▶️',
          'message.updated': '💬',
          'message.part.updated': '✏️',
          'file.edited': '📝',
        };

        const emoji = eventEmojis[payload.eventType] || '📢';
        
        // For batched payloads, just pass through
        if ('eventCount' in payload) {
          return {
            summary: (payload as any).summary,
            eventCount: (payload as any).eventCount,
            batchStartTime: (payload as any).batchStartTime,
            batchEndTime: (payload as any).batchEndTime,
            isBatch: true,
          };
        }
        
        // For individual events
        return {
          summary: `${emoji} **${payload.eventType}**\n\n` +
                   `Session: \`${payload.sessionId || 'N/A'}\`\n` +
                   `Time: ${payload.timestamp}` +
                   (payload.error ? `\n\nError: ${payload.error}` : ''),
          eventCount: 1,
          batchStartTime: payload.timestamp,
          batchEndTime: payload.timestamp,
          isBatch: false,
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
  debug: true,
});

export default SlackWorkflowPlugin;
