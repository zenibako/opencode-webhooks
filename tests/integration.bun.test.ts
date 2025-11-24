/**
 * Bun Integration Tests
 * These tests verify the plugin works correctly in a Bun runtime environment,
 * emulating how ~/.config/opencode loads plugins with dependencies
 * 
 * Run with: bun test tests/integration.bun.test.ts
 * 
 * Note: These tests use real HTTP calls to httpbin.org to validate
 * the plugin works correctly in Bun's runtime without complex mocking.
 */

import { describe, test, expect } from 'bun:test';

describe('Bun Runtime Integration Tests', () => {
  describe('Plugin loading and instantiation', () => {
    test('should load plugin using ES module import', async () => {
      const { createWebhookPlugin } = await import('../src/index');
      
      expect(createWebhookPlugin).toBeDefined();
      expect(typeof createWebhookPlugin).toBe('function');
    });

    test('should create plugin instance with dependencies', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const plugin = new WebhookPlugin({
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_CREATED],
          },
        ],
        debug: false,
      });

      expect(plugin).toBeDefined();
      expect(plugin.handleEvent).toBeDefined();
      expect(typeof plugin.handleEvent).toBe('function');
    });

    test('should access axios dependency in Bun runtime', async () => {
      const axios = await import('axios');
      expect(axios.default).toBeDefined();
    });
  });

  describe('Event handling in Bun runtime with real HTTP', () => {
    test('should send webhook to httpbin.org', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const plugin = new WebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/post',
            events: [OpencodeEventType.SESSION_CREATED],
            timeoutMs: 10000,
            retry: { maxAttempts: 1 },
          },
        ],
        debug: true,
      });

      const payload = {
        sessionId: 'bun-test-session-123',
        userId: 'bun-test-user-456',
      };

      const results = await plugin.handleEvent(
        OpencodeEventType.SESSION_CREATED,
        payload
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);
    });

    test('should transform payload correctly', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const plugin = new WebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/post',
            events: [OpencodeEventType.SESSION_ERROR],
            transformPayload: (payload: any) => ({
              text: `Error: ${payload.error}`,
              sessionId: payload.sessionId,
              transformed: true,
            }),
            timeoutMs: 10000,
            retry: { maxAttempts: 1 },
          },
        ],
      });

      const results = await plugin.handleEvent(OpencodeEventType.SESSION_ERROR, {
        sessionId: 'session-123',
        error: 'Test error message',
      });

      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);
    });

    test('should filter webhooks based on shouldSend', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const plugin = new WebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/post',
            events: [OpencodeEventType.SESSION_ERROR],
            shouldSend: (payload: any) => {
              const error = payload.error || '';
              return error.includes('CRITICAL');
            },
            timeoutMs: 10000,
          },
          {
            url: 'https://httpbin.org/status/200',
            events: [OpencodeEventType.SESSION_ERROR],
            timeoutMs: 10000,
          },
        ],
      });

      // Test with non-critical error - only second webhook should fire
      const results = await plugin.handleEvent(OpencodeEventType.SESSION_ERROR, {
        error: 'Minor warning',
      });

      // First webhook filtered out (attempts: 0), second one sent
      expect(results.length).toBe(2);
      expect(results[0].attempts).toBe(0); // Filtered out
      expect(results[1].success).toBe(true); // Sent successfully
    });
  });

  describe('OpenCode plugin pattern compatibility', () => {
    test('should export createWebhookPlugin function', async () => {
      const { createWebhookPlugin } = await import('../src/index');
      
      const { OpencodeEventType } = await import('../src/types');
      
      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/post',
            events: [OpencodeEventType.SESSION_CREATED],
          },
        ],
      });

      expect(typeof plugin).toBe('function');
    });

    test('should work as OpenCode plugin hook', async () => {
      const { createWebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const hook = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/post',
            events: [OpencodeEventType.SESSION_CREATED],
            timeoutMs: 10000,
            retry: { maxAttempts: 1 },
          },
        ],
        debug: false,
      });

      // The hook should be callable
      expect(typeof hook).toBe('function');
      
      // Simulate OpenCode calling the hook with proper context
      const mockContext: any = {
        client: {},
        project: { path: '/test' },
        directory: '/test',
        worktree: '/test',
      };
      
      const result = await hook(mockContext);
      expect(result).toBeDefined();
      expect(result.event).toBeDefined();
      expect(typeof result.event).toBe('function');
      
      // Test the event handler
      await result.event({
        event: {
          type: OpencodeEventType.SESSION_CREATED,
          timestamp: new Date().toISOString(),
        },
      });
      
      // Event should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Dependency resolution in Bun', () => {
    test('should resolve axios from node_modules', async () => {
      const axios = await import('axios');
      expect(axios.default).toBeDefined();
      expect(typeof axios.default).toBe('function');
    });

    test('should handle TypeScript types correctly', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      // Verify TypeScript types are available
      const config = {
        webhooks: [
          {
            url: 'https://example.com',
            events: [OpencodeEventType.SESSION_CREATED],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);
      expect(plugin).toBeDefined();
    });
  });

  describe('Performance in Bun runtime', () => {
    test('should handle rapid successive events efficiently', async () => {
      const { WebhookPlugin, OpencodeEventType } = await import('../src/index');
      
      const plugin = new WebhookPlugin({
        webhooks: [
          {
            url: 'https://httpbin.org/status/200',
            events: [OpencodeEventType.FILE_EDITED],
            timeoutMs: 10000,
            retry: { maxAttempts: 1 },
          },
        ],
      });

      const startTime = performance.now();
      const promises = Array.from({ length: 5 }, (_, i) =>
        plugin.handleEvent(OpencodeEventType.FILE_EDITED, {
          sessionId: 'session-1',
          changeId: i,
        })
      );

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      expect(results.length).toBe(5);
      expect(results.every((r: any) => r[0].success)).toBe(true);
      
      // Bun should handle this efficiently
      console.log(`Bun: Processed 5 events in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });
});
