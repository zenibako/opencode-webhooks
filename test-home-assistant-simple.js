/**
 * Simple Test Script for Home Assistant Integration
 * 
 * This script sends a test webhook directly to your Home Assistant instance
 * with the exact payload structure that the plugin will send.
 * 
 * Usage:
 *   1. Update HOME_ASSISTANT_URL and WEBHOOK_ID below
 *   2. Run: node test-home-assistant-simple.js
 */

const HOME_ASSISTANT_URL = 'http://homeassistant.local:8123';
const WEBHOOK_ID = 'opencode_done';
const WEBHOOK_URL = `${HOME_ASSISTANT_URL}/api/webhook/${WEBHOOK_ID}`;

// Test payload matching the new structure
const testPayload = {
  // Event identification
  event_type: 'opencode_agent_completed',
  
  // Session info
  session_id: 'test-session-123',
  session_title: 'Test Session - Home Assistant Integration',
  
  // Message content
  message_id: 'msg-test-456',
  message_preview: 'I have successfully completed the task you requested. Here are the results:\n\n1. Created the new feature\n2. Added comprehensive tests\n3. Updated documentation\n\nEverything is working perfectly!',
  message_full: 'I have successfully completed the task you requested. Here are the results:\n\n1. Created the new feature\n2. Added comprehensive tests\n3. Updated documentation\n\nEverything is working perfectly!',
  
  // Usage stats
  tokens_input: 1500,
  tokens_output: 800,
  tokens_total: 2300,
  cost: 0.0275,
  
  // Notification-ready fields
  notification_title: 'OpenCode: Test Session - Home Assistant Integration',
  notification_message: 'I have successfully completed the task you requested. Here are the results:\n\n1. Created the new feature\n2. Added comprehensive tests\n3. Updated documentation\n\nEverything is working perfectly!',
  
  // Metadata
  timestamp: new Date().toISOString(),
};

console.log('🏠 Testing Home Assistant Integration\n');
console.log(`Webhook URL: ${WEBHOOK_URL}\n`);
console.log('📦 Sending test payload...\n');
console.log(JSON.stringify(testPayload, null, 2));
console.log('\n🚀 Sending webhook...\n');

fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload),
})
  .then(response => {
    console.log(`✅ Response status: ${response.status} ${response.statusText}`);
    return response.text();
  })
  .then(body => {
    if (body) {
      console.log('📄 Response body:', body);
    }
    console.log('\n✅ Test complete!');
    console.log('\nCheck your Home Assistant for the notification:');
    console.log('  - Title: "OpenCode: Test Session - Home Assistant Integration"');
    console.log('  - Message: "I have successfully completed the task..."');
    console.log('  - Tokens: 2300 total (1500 input + 800 output)');
    console.log('  - Cost: $0.0275');
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Home Assistant not reachable at:', HOME_ASSISTANT_URL);
    console.error('  2. Webhook ID not set up in Home Assistant:', WEBHOOK_ID);
    console.error('  3. Network connectivity issues');
    process.exit(1);
  });
