/**
 * Real Home Assistant Webhook Integration Test
 * 
 * This test actually sends HTTP requests to a real Home Assistant webhook endpoint
 * to verify it works correctly with debug mode enabled.
 * 
 * Setup:
 * 1. In Home Assistant, create a new automation with webhook trigger
 * 2. Set webhook ID (e.g., "opencode_test")
 * 3. Get the webhook URL: http://homeassistant.local:8123/api/webhook/opencode_test
 * 
 * Run with: TEST_HOMEASSISTANT_WEBHOOK_URL=http://homeassistant.local:8123/api/webhook/opencode_test npm test -- tests/homeassistant-real.test.ts
 * Or skip with: npm test (tests are skipped if TEST_HOMEASSISTANT_WEBHOOK_URL is not set)
 */

import { WebhookPlugin } from '../src/index.js';
import { OpencodeEventType, BaseEventPayload } from '../src/types.js';

// Get webhook URL from environment variable
const HOMEASSISTANT_WEBHOOK_URL = process.env.TEST_HOMEASSISTANT_WEBHOOK_URL;

// Only run tests if webhook URL is provided
const describeReal = HOMEASSISTANT_WEBHOOK_URL ? describe : describe.skip;

describeReal('Real Home Assistant Webhook Integration', () => {
  // Use a longer timeout for real HTTP requests
  jest.setTimeout(30000);

  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should send real webhook to Home Assistant with debug enabled', async () => {
    // Temporarily restore console to see debug output
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [OpencodeEventType.SESSION_CREATED],
          transformPayload: (payload) => {
            const eventLabels: Record<string, string> = {
              'session.created': 'Session Started',
              'session.idle': 'Session Idle',
              'session.deleted': 'Session Ended',
              'session.error': 'Error Occurred',
            };

            return {
              event_type: payload.eventType,
              event_label: eventLabels[payload.eventType] || payload.eventType,
              severity: 'info',
              session_id: payload.sessionId || 'unknown',
              timestamp: payload.timestamp,
              notification_message: `🧪 TEST: ${eventLabels[payload.eventType] || payload.eventType}`,
              test_message: 'This is a test message from the opencode-webhooks integration test suite.',
              raw_payload: payload,
            };
          },
          retry: {
            maxAttempts: 3,
            delayMs: 1000,
          },
          timeoutMs: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      debug: true,
    });

    const payload: Partial<BaseEventPayload> = {
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user-123',
    };

    console.log('\n🚀 Sending real webhook to Home Assistant...\n');

    const results = await plugin.handleEvent(
      OpencodeEventType.SESSION_CREATED,
      payload
    );

    console.log('\n✅ Webhook sent! Results:', JSON.stringify(results, null, 2));

    // Verify the webhook was sent successfully
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].statusCode).toBe(200);

    console.log('\n✅ All assertions passed!\n');
    console.log('   Debug logs were printed to console (see output above)\n');
    console.log('   Check your Home Assistant for the triggered automation!\n');
  });

  it('should send multiple events to Home Assistant', async () => {
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [
            OpencodeEventType.SESSION_IDLE,
            OpencodeEventType.SESSION_ERROR,
            OpencodeEventType.FILE_EDITED,
          ],
          transformPayload: (payload) => {
            const eventLabels: Record<string, string> = {
              'session.idle': 'Session Idle',
              'session.error': 'Error Occurred',
              'file.edited': 'File Edited',
            };

            const severity = payload.eventType === 'session.error' ? 'error' : 'info';

            return {
              event_type: payload.eventType,
              event_label: eventLabels[payload.eventType] || payload.eventType,
              severity: severity,
              session_id: payload.sessionId || 'unknown',
              timestamp: payload.timestamp,
              notification_message: `🧪 TEST: ${eventLabels[payload.eventType] || payload.eventType}`,
              file_path: (payload as any).filePath,
              error: (payload as any).error,
              raw_payload: payload,
            };
          },
          timeoutMs: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      debug: true,
    });

    console.log('\n🚀 Sending SESSION_IDLE event...\n');
    const result1 = await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, {
      sessionId: 'test-session-idle',
    });
    
    expect(result1[0].success).toBe(true);

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n🚀 Sending SESSION_ERROR event...\n');
    const result2 = await plugin.handleEvent(OpencodeEventType.SESSION_ERROR, {
      sessionId: 'test-session-error',
      error: 'Test error message',
    });
    
    expect(result2[0].success).toBe(true);

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n🚀 Sending FILE_EDITED event...\n');
    const result3 = await plugin.handleEvent(OpencodeEventType.FILE_EDITED, {
      sessionId: 'test-session-file',
      filePath: '/test/file.ts',
    });
    
    expect(result3[0].success).toBe(true);

    console.log('\n✅ All 3 events sent successfully!\n');
    console.log('   Check your Home Assistant automation history!\n');
  });

  it('should send error event with severity to Home Assistant', async () => {
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [OpencodeEventType.SESSION_ERROR],
          transformPayload: (payload) => {
            const eventLabels: Record<string, string> = {
              'session.error': 'Error Occurred',
            };

            return {
              event_type: payload.eventType,
              event_label: eventLabels[payload.eventType] || payload.eventType,
              severity: 'error',
              session_id: payload.sessionId || 'unknown',
              timestamp: payload.timestamp,
              notification_message: `⚠️ OpenCode Error: ${(payload as any).error || 'Unknown'}`,
              error: (payload as any).error,
              test_message: 'This is a test error from the integration test suite.',
              raw_payload: payload,
            };
          },
          timeoutMs: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      debug: true,
    });

    console.log('\n🚀 Sending error event with severity...\n');

    const results = await plugin.handleEvent(OpencodeEventType.SESSION_ERROR, {
      sessionId: 'test-session-error-' + Date.now(),
      error: 'Test connection timeout error',
    });

    expect(results[0].success).toBe(true);
    expect(results[0].statusCode).toBe(200);

    console.log('\n✅ Error event sent successfully!\n');
    console.log('   This should trigger an error-level automation in Home Assistant.\n');
  });

  it('should send message event with content preview', async () => {
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [OpencodeEventType.MESSAGE_UPDATED],
          transformPayload: (payload) => {
            const messageContent = (payload as any).content || (payload as any).text || (payload as any).message || '';
            const preview = messageContent.substring(0, 100);
            const notificationMessage = preview + (messageContent.length > 100 ? '...' : '');

            return {
              event_type: payload.eventType,
              event_label: 'Message Updated',
              severity: 'info',
              session_id: payload.sessionId || 'unknown',
              timestamp: payload.timestamp,
              notification_message: notificationMessage || 'Message updated',
              message_content: messageContent || null,
              message_length: messageContent.length,
              raw_payload: payload,
            };
          },
          timeoutMs: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      debug: true,
    });

    console.log('\n🚀 Sending message event with content...\n');

    const results = await plugin.handleEvent(OpencodeEventType.MESSAGE_UPDATED, {
      sessionId: 'test-session-message-' + Date.now(),
      content: 'This is a test message with some content that will be previewed in Home Assistant.',
      messageId: 'msg-123',
    });

    expect(results[0].success).toBe(true);
    expect(results[0].statusCode).toBe(200);

    console.log('\n✅ Message event sent successfully!\n');
    console.log('   Check your Home Assistant for the message preview!\n');
  });

  it('should handle webhook with authentication header', async () => {
    // Note: This test assumes you have HA_TOKEN set if your instance requires auth
    const HA_TOKEN = process.env.TEST_HOMEASSISTANT_TOKEN;
    
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [OpencodeEventType.SESSION_CREATED],
          transformPayload: (payload) => ({
            event_type: payload.eventType,
            session_id: payload.sessionId || 'unknown',
            timestamp: payload.timestamp,
            notification_message: '🔐 Test with authentication',
          }),
          headers: {
            'Content-Type': 'application/json',
            ...(HA_TOKEN && { 'Authorization': `Bearer ${HA_TOKEN}` }),
          },
          timeoutMs: 10000,
        },
      ],
      debug: true,
    });

    console.log('\n🚀 Sending webhook with authentication header...\n');
    if (HA_TOKEN) {
      console.log('   Using authentication token from TEST_HOMEASSISTANT_TOKEN\n');
    } else {
      console.log('   No auth token set (TEST_HOMEASSISTANT_TOKEN not set)\n');
    }

    const results = await plugin.handleEvent(OpencodeEventType.SESSION_CREATED, {
      sessionId: 'test-session-auth-' + Date.now(),
    });

    expect(results[0].success).toBe(true);
    expect(results[0].statusCode).toBe(200);

    console.log('\n✅ Authenticated webhook sent successfully!\n');
  });

  it('should send command executed event', async () => {
    const plugin = new WebhookPlugin({
      webhooks: [
        {
          url: HOMEASSISTANT_WEBHOOK_URL!,
          events: [OpencodeEventType.COMMAND_EXECUTED],
          transformPayload: (payload) => ({
            event_type: payload.eventType,
            event_label: 'Command Executed',
            severity: 'info',
            session_id: payload.sessionId || 'unknown',
            timestamp: payload.timestamp,
            notification_message: `Command executed: ${(payload as any).command || 'unknown'}`,
            command: (payload as any).command,
            exit_code: (payload as any).exitCode,
            raw_payload: payload,
          }),
          timeoutMs: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ],
      debug: true,
    });

    console.log('\n🚀 Sending command executed event...\n');

    const results = await plugin.handleEvent(OpencodeEventType.COMMAND_EXECUTED, {
      sessionId: 'test-session-command-' + Date.now(),
      command: 'npm test',
      exitCode: 0,
    });

    expect(results[0].success).toBe(true);
    expect(results[0].statusCode).toBe(200);

    console.log('\n✅ Command event sent successfully!\n');
    console.log('   Check your Home Assistant for the command execution notification!\n');
  });
});

// Always run this test to show instructions
describe('Home Assistant Webhook Test Instructions', () => {
  it('should show how to run real Home Assistant tests', () => {
    const instructions = `
    
    ═══════════════════════════════════════════════════════════════
    
    To run REAL tests against your Home Assistant webhook:
    
    1. Set up webhook in Home Assistant:
       - Go to Settings → Automations & Scenes
       - Create new automation with webhook trigger
       - Set webhook ID (e.g., "opencode_test")
    
    2. Run tests:
    
    TEST_HOMEASSISTANT_WEBHOOK_URL=http://homeassistant.local:8123/api/webhook/opencode_test \\
      npm test -- tests/homeassistant-real.test.ts
    
    3. Optional: If your Home Assistant requires authentication:
    
    TEST_HOMEASSISTANT_WEBHOOK_URL=http://homeassistant.local:8123/api/webhook/opencode_test \\
    TEST_HOMEASSISTANT_TOKEN=your-long-lived-token \\
      npm test -- tests/homeassistant-real.test.ts
    
    This will:
    ✓ Actually send HTTP requests to your Home Assistant
    ✓ Test debug mode logging
    ✓ Verify payload transformations for HA format
    ✓ Test different event types and severities
    ✓ Trigger automations you can see in Home Assistant
    
    Tests included:
    • Basic webhook sending with debug mode
    • Multiple events sent sequentially
    • Error events with severity levels
    • Message events with content preview
    • Authenticated requests (optional)
    • Command execution events
    
    Current webhook URL: ${HOMEASSISTANT_WEBHOOK_URL || 'NOT SET (tests will be skipped)'}
    
    Example Home Assistant automation action:
    - service: notify.mobile_app
      data:
        title: "{{ trigger.json.event_label }}"
        message: "{{ trigger.json.notification_message }}"
    
    ═══════════════════════════════════════════════════════════════
    
    `;
    
    console.log(instructions);
    expect(true).toBe(true);
  });
});
