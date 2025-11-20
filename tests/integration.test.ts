/**
 * Integration tests for the webhook plugin
 * These tests verify the end-to-end flow
 */

import axios from 'axios';
import { createWebhookPlugin } from '../src/index';
import { OpencodeEventType, BaseEventPayload } from '../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('Webhook Plugin Integration Tests', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('End-to-end webhook flow', () => {
    it('should send Slack notification on session idle', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { ok: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
            events: [OpencodeEventType.SESSION_IDLE],
            transformPayload: (payload) => ({
              text: `Session ${payload.sessionId} is idle`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Session ID:* ${payload.sessionId}`,
                  },
                },
              ],
            }),
          },
        ],
        debug: true,
      });

      const payload: Partial<BaseEventPayload> = {
        sessionId: 'session-123',
        userId: 'user-456',
      };

      const results = await plugin.handleEvent(
        OpencodeEventType.SESSION_IDLE,
        payload
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].statusCode).toBe(200);

      // Verify the transformed payload was sent
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
          method: 'POST',
          data: expect.objectContaining({
            text: 'Session session-123 is idle',
            blocks: expect.any(Array),
          }),
        })
      );
    });

    it('should send multiple webhooks in parallel', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://slack.com/webhook',
            events: [OpencodeEventType.BUILD_FAILED],
            transformPayload: (payload) => ({
              text: `Build failed: ${payload.error}`,
            }),
          },
          {
            url: 'https://discord.com/webhook',
            events: [OpencodeEventType.BUILD_FAILED],
            transformPayload: (payload) => ({
              content: `Build error: ${payload.error}`,
            }),
          },
          {
            url: 'https://teams.microsoft.com/webhook',
            events: [OpencodeEventType.BUILD_FAILED],
            transformPayload: (payload) => ({
              title: 'Build Failed',
              text: payload.error,
            }),
          },
        ],
      });

      const payload: Partial<BaseEventPayload> = {
        sessionId: 'session-123',
        error: 'Compilation error',
      };

      const startTime = Date.now();
      const results = await plugin.handleEvent(
        OpencodeEventType.BUILD_FAILED,
        payload
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify all webhooks were called
      expect(mockedAxios).toHaveBeenCalledTimes(3);

      // Webhooks should be sent in parallel (duration < 100ms for mocked requests)
      expect(duration).toBeLessThan(500);
    });

    it('should filter webhooks based on shouldSend', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://hooks.slack.com/critical',
            events: [OpencodeEventType.ERROR_OCCURRED],
            shouldSend: (payload) => {
              const error = (payload as any).error || '';
              return error.toLowerCase().includes('critical');
            },
            transformPayload: (payload) => ({
              text: `CRITICAL: ${payload.error}`,
            }),
          },
          {
            url: 'https://hooks.slack.com/all-errors',
            events: [OpencodeEventType.ERROR_OCCURRED],
            transformPayload: (payload) => ({
              text: `Error: ${payload.error}`,
            }),
          },
        ],
      });

      // Test with critical error
      const criticalPayload: Partial<BaseEventPayload> = {
        error: 'CRITICAL: Database connection lost',
      };

      let results = await plugin.handleEvent(
        OpencodeEventType.ERROR_OCCURRED,
        criticalPayload
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true); // Critical webhook sent
      expect(results[1].success).toBe(true); // All errors webhook sent
      expect(mockedAxios).toHaveBeenCalledTimes(2);

      jest.clearAllMocks();

      // Test with non-critical error
      const normalPayload: Partial<BaseEventPayload> = {
        error: 'Minor warning',
      };

      results = await plugin.handleEvent(
        OpencodeEventType.ERROR_OCCURRED,
        normalPayload
      );

      expect(results).toHaveLength(2);
      expect(results[0].attempts).toBe(0); // Critical webhook filtered out
      expect(results[1].success).toBe(true); // All errors webhook sent
      expect(mockedAxios).toHaveBeenCalledTimes(1); // Only one webhook sent
    });

    it('should handle webhook failures gracefully', async () => {
      mockedAxios
        .mockResolvedValueOnce({ status: 200, data: { success: true } } as any)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ status: 200, data: { success: true } } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://webhook1.com',
            events: [OpencodeEventType.SESSION_START],
          },
          {
            url: 'https://webhook2.com',
            events: [OpencodeEventType.SESSION_START],
            retry: { maxAttempts: 1 }, // Fail immediately
          },
          {
            url: 'https://webhook3.com',
            events: [OpencodeEventType.SESSION_START],
          },
        ],
      });

      const results = await plugin.handleEvent(OpencodeEventType.SESSION_START, {
        sessionId: 'test',
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false); // Failed
      expect(results[1].error).toContain('Network timeout');
      expect(results[2].success).toBe(true);
    });

    it('should work with custom event emitter', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [
              OpencodeEventType.SESSION_IDLE,
              OpencodeEventType.SESSION_START,
            ],
          },
        ],
      });

      // Mock event emitter
      const eventHandlers: Map<string, Function> = new Map();
      const mockEmitter = {
        on: jest.fn((event: string, handler: Function) => {
          eventHandlers.set(event, handler);
        }),
        emit: async (event: string, payload: any) => {
          const handler = eventHandlers.get(event);
          if (handler) {
            await handler(payload);
          }
        },
      };

      plugin.register(mockEmitter);

      // Simulate events
      await mockEmitter.emit(OpencodeEventType.SESSION_START, {
        sessionId: 'session-1',
      });
      await mockEmitter.emit(OpencodeEventType.SESSION_IDLE, {
        sessionId: 'session-1',
      });

      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle rapid successive events', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.CODE_CHANGE],
          },
        ],
      });

      // Simulate rapid code changes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          plugin.handleEvent(OpencodeEventType.CODE_CHANGE, {
            sessionId: 'session-1',
            changeId: i,
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r[0].success)).toBe(true);
      expect(mockedAxios).toHaveBeenCalledTimes(10);
    });

    it('should handle complex payload transformations', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as any);

      const plugin = createWebhookPlugin({
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.TEST_FAILED],
            transformPayload: (payload) => {
              const tests = (payload as any).tests || [];
              return {
                summary: {
                  total: tests.length,
                  failed: tests.filter((t: any) => !t.passed).length,
                  passed: tests.filter((t: any) => t.passed).length,
                },
                failures: tests
                  .filter((t: any) => !t.passed)
                  .map((t: any) => ({
                    name: t.name,
                    error: t.error,
                  })),
                metadata: {
                  sessionId: payload.sessionId,
                  timestamp: payload.timestamp,
                },
              };
            },
          },
        ],
      });

      await plugin.handleEvent(OpencodeEventType.TEST_FAILED, {
        sessionId: 'session-1',
        tests: [
          { name: 'test1', passed: true },
          { name: 'test2', passed: false, error: 'Assertion failed' },
          { name: 'test3', passed: false, error: 'Timeout' },
        ],
      });

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            summary: {
              total: 3,
              failed: 2,
              passed: 1,
            },
            failures: expect.arrayContaining([
              { name: 'test2', error: 'Assertion failed' },
              { name: 'test3', error: 'Timeout' },
            ]),
            metadata: expect.objectContaining({
              sessionId: 'session-1',
            }),
          }),
        })
      );
    });
  });
});
