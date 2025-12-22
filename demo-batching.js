#!/usr/bin/env node

/**
 * Demo script to show rate limiting and queuing in action
 * Run with: TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/... node demo-batching.js
 */

import { WebhookPlugin, OpencodeEventType } from './dist/index.js';

const SLACK_WEBHOOK_URL = process.env.TEST_SLACK_WEBHOOK_URL;

if (!SLACK_WEBHOOK_URL) {
  console.error('❌ Error: TEST_SLACK_WEBHOOK_URL environment variable is not set\n');
  console.log('Usage:');
  console.log('  TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/triggers/... node demo-batching.js\n');
  process.exit(1);
}

console.log('🧪 Rate Limiting & Queuing Demo\n');
console.log('This demo shows how the plugin queues events to avoid rate limits.\n');
console.log('Slack allows 10 requests per minute, so we\'ll simulate sending 15 events.\n');
console.log('='.repeat(70) + '\n');

const plugin = new WebhookPlugin({
  webhooks: [
    {
      url: SLACK_WEBHOOK_URL,
      events: [
        OpencodeEventType.SESSION_CREATED,
        OpencodeEventType.SESSION_ERROR,
        OpencodeEventType.FILE_EDITED,
      ],
      
      // Configure rate limiting (10 requests per minute)
      rateLimit: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
      },
      
      transformPayload: (payload) => {
        return {
          summary: `Event: ${payload.eventType}\nSession: ${payload.sessionId}\nTime: ${payload.timestamp}`,
          eventType: payload.eventType,
          sessionId: payload.sessionId,
          timestamp: payload.timestamp,
        };
      },
      
      retry: {
        maxAttempts: 2,
        delayMs: 1000,
      },
      timeoutMs: 10000,
    },
  ],
  debug: true,
  
  async onResult(_event, results) {
    for (const result of results) {
      if (result.rateLimitDelayed) {
        console.log(`   🔄 Event was queued and sent after rate limit cooldown`);
      }
    }
  },
});

async function runDemo() {
  console.log('📤 Sending 15 events...\n');
  
  const results = [];
  
  // Send 15 events in quick succession
  for (let i = 0; i < 15; i++) {
    const eventType = i % 3 === 0 
      ? OpencodeEventType.SESSION_CREATED
      : i % 3 === 1
      ? OpencodeEventType.SESSION_ERROR
      : OpencodeEventType.FILE_EDITED;
    
    const payload = {
      sessionId: `session-${i + 1}`,
      ...(eventType === OpencodeEventType.SESSION_ERROR && { error: `Error ${i + 1}` }),
      ...(eventType === OpencodeEventType.FILE_EDITED && { filePath: `/test/file-${i + 1}.ts` }),
    };
    
    console.log(`Event ${i + 1}/15: ${eventType}`);
    const result = await plugin.handleEvent(eventType, payload);
    results.push(...result);
    
    // Small delay between events
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
  console.log('📊 Summary:\n');
  
  const immediatelySent = results.filter(r => !r.rateLimitDelayed && r.success && r.attempts > 0).length;
  const queued = results.filter(r => r.rateLimitDelayed === undefined).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Sent immediately: ${immediatelySent} (under rate limit)`);
  console.log(`📦 Queued for later: ${queued} (over rate limit)`);
  console.log(`❌ Failed: ${failed}`);
  
  console.log('\n' + '='.repeat(70) + '\n');
  console.log('ℹ️  Note: Queued events will be sent after the rate limit window resets (60 seconds)');
  console.log('   Each queued event will be sent individually with its original data.\n');
  console.log('   Check your Slack channel in ~60 seconds for the queued events!\n');
  
  // Wait for queue to flush
  console.log('⏳ Waiting 65 seconds for queue to flush...\n');
  await new Promise(resolve => setTimeout(resolve, 65000));
  
  console.log('✅ Demo complete! Check your Slack channel for all messages.\n');
  
  // Cleanup
  plugin.destroy();
  process.exit(0);
}

runDemo().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
