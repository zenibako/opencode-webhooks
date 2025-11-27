/**
 * Local Test Script for Home Assistant Integration
 * 
 * This script simulates the agent completion middleware and sends a test
 * webhook to your Home Assistant instance.
 * 
 * Usage:
 *   1. Set your Home Assistant webhook URL below
 *   2. Run: npx tsx test-home-assistant-local.ts
 */

import { createAgentNotificationPlugin } from './src/index.js';

// ============================================================================
// Configuration - UPDATE THESE VALUES
// ============================================================================

const HOME_ASSISTANT_URL = 'http://homeassistant.local:8123';
const WEBHOOK_ID = 'opencode_done';

// Construct the webhook URL
const WEBHOOK_URL = `${HOME_ASSISTANT_URL}/api/webhook/${WEBHOOK_ID}`;

// ============================================================================
// Mock Plugin Context
// ============================================================================

const mockContext = {
  project: { id: 'test-project' },
  directory: '/Users/test/my-project',
  worktree: '/Users/test/my-project',
  client: {
    session: {
      get: async () => ({
        title: 'Test Session - Home Assistant Integration',
      }),
    },
  },
  $: () => {},
};

// ============================================================================
// Create Plugin and Simulate Event
// ============================================================================

async function testHomeAssistant() {
  console.log('🏠 Testing Home Assistant Integration\n');
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  // Create the plugin
  const plugin = createAgentNotificationPlugin({
    webhooks: [{
      url: WEBHOOK_URL,
      
      // Transform for Home Assistant - includes all useful fields
      transformPayload: (payload) => ({
        // Event identification
        event_type: 'opencode_agent_completed',
        
        // Session info
        session_id: payload.sessionId,
        session_title: payload.sessionTitle,
        
        // Message content
        message_id: payload.messageId,
        message_preview: payload.messageContent.substring(0, 500),
        message_full: payload.messageContent,
        
        // Usage stats (for advanced automations/tracking)
        tokens_input: payload.tokens?.input,
        tokens_output: payload.tokens?.output,
        tokens_total: payload.tokens ? payload.tokens.input + payload.tokens.output : undefined,
        cost: payload.cost,
        
        // Notification-ready fields (ready to use in Home Assistant notifications)
        notification_title: `OpenCode: ${payload.sessionTitle}`,
        notification_message: payload.messageContent.substring(0, 500),
        
        // Metadata
        timestamp: payload.timestamp,
      }),
      
      retry: {
        maxAttempts: 3,
        delayMs: 2000,
      },
      
      timeoutMs: 5000,
    }],
    
    debug: true,
  });

  // Initialize the plugin
  const hooks = await plugin(mockContext);

  console.log('✅ Plugin initialized\n');

  // Simulate a message part update event
  console.log('📝 Simulating message.part.updated event...');
  await hooks.event({
    event: {
      type: 'message.part.updated',
      properties: {
        part: {
          id: 'part-test-1',
          type: 'text',
          text: 'I have successfully completed the task you requested. Here are the results:\n\n1. Created the new feature\n2. Added comprehensive tests\n3. Updated documentation\n\nEverything is working perfectly!',
          sessionID: 'test-session-123',
          messageID: 'msg-test-456',
        },
      },
    },
  });

  console.log('✅ Message part tracked\n');

  // Simulate a message updated event (with tokens and cost)
  console.log('📊 Simulating message.updated event...');
  await hooks.event({
    event: {
      type: 'message.updated',
      properties: {
        info: {
          id: 'msg-test-456',
          role: 'assistant',
          sessionID: 'test-session-123',
          tokens: {
            input: 1500,
            output: 800,
            reasoning: 50,
            cache: { read: 0, write: 0 },
          },
          cost: 0.0275,
        },
      },
    },
  });

  console.log('✅ Message metadata tracked\n');

  // Simulate session idle event (this triggers the webhook)
  console.log('💤 Simulating session.idle event...');
  console.log('🚀 This will send the webhook to Home Assistant!\n');
  
  await hooks.event({
    event: {
      type: 'session.idle',
      properties: {
        sessionID: 'test-session-123',
      },
    },
  });

  console.log('\n✅ Test complete!');
  console.log('\nCheck your Home Assistant for the notification:');
  console.log('  - Title: "OpenCode: Test Session - Home Assistant Integration"');
  console.log('  - Message: "I have successfully completed the task..."');
  console.log('  - Tokens: 2300 total (1500 input + 800 output)');
  console.log('  - Cost: $0.0275');
}

// Run the test
testHomeAssistant().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
