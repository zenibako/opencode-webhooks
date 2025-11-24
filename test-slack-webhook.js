#!/usr/bin/env node

/**
 * Quick test script to verify Slack webhook works with debug mode
 * Run with: TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/... node test-slack-webhook.js
 */

import { WebhookPlugin, OpencodeEventType } from './dist/index.js';

const SLACK_WEBHOOK_URL = process.env.TEST_SLACK_WEBHOOK_URL;

if (!SLACK_WEBHOOK_URL) {
  console.error('❌ Error: TEST_SLACK_WEBHOOK_URL environment variable is not set\n');
  console.log('Usage:');
  console.log('  TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/triggers/... node test-slack-webhook.js\n');
  process.exit(1);
}

console.log('🧪 Testing Slack Webhook with Debug Mode\n');
console.log('Webhook URL:', SLACK_WEBHOOK_URL);
console.log('\n' + '='.repeat(60) + '\n');

const plugin = new WebhookPlugin({
  webhooks: [
    {
      url: SLACK_WEBHOOK_URL,
      events: [OpencodeEventType.SESSION_CREATED],
      transformPayload: (payload) => ({
        eventType: payload.eventType,
        sessionId: payload.sessionId || 'N/A',
        timestamp: payload.timestamp,
        message: `🧪 TEST: ${payload.eventType} event triggered`,
        eventInfo: `This is a test message from opencode-webhooks\n\nSession ID: ${payload.sessionId}\nTimestamp: ${payload.timestamp}`,
      }),
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      timeoutMs: 10000,
    },
  ],
  debug: true, // Enable debug mode to see logs
});

const payload = {
  sessionId: 'test-session-' + Date.now(),
  userId: 'test-user-123',
};

console.log('📤 Sending webhook with payload:', JSON.stringify(payload, null, 2));
console.log('\n' + '='.repeat(60) + '\n');

try {
  const results = await plugin.handleEvent(
    OpencodeEventType.SESSION_CREATED,
    payload
  );

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📥 Results:', JSON.stringify(results, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  if (results[0].success) {
    console.log('✅ SUCCESS! Webhook sent successfully!');
    console.log('   Status Code:', results[0].statusCode);
    console.log('   Attempts:', results[0].attempts);
    console.log('\n✅ Check your Slack channel for the test message!\n');
  } else {
    console.error('❌ FAILED! Webhook failed to send');
    console.error('   Error:', results[0].error);
    console.error('   Attempts:', results[0].attempts);
  }
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('\nFull error:', error);
}
