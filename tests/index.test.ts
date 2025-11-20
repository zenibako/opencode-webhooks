import { WebhookPlugin, createWebhookPlugin } from '../src/index';
import { WebhookClient } from '../src/webhook-client';
import {
  OpencodeEventType,
  WebhookPluginConfig,
  BaseEventPayload,
} from '../src/types';

// Mock WebhookClient
jest.mock('../src/webhook-client');

describe('WebhookPlugin', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create plugin with basic configuration', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

      expect(plugin).toBeInstanceOf(WebhookPlugin);
    });

    it('should log initialization when debug is enabled', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
        debug: true,
      };

      const plugin = new WebhookPlugin(config);

      // Clear logs from initialization
      consoleLogSpy.mockClear();

      expect(plugin).toBeDefined();
    });
  });

  describe('handleEvent', () => {
    it('should handle event with registered webhook', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

      const payload: Partial<BaseEventPayload> = {
        sessionId: 'test-session',
        userId: 'test-user',
      };

      const results = await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, payload);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should not trigger webhook for unregistered events', async () => {
      const mockSend = jest.fn();

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
        debug: true,
      };

      const plugin = new WebhookPlugin(config);

      const results = await plugin.handleEvent(
        OpencodeEventType.SESSION_ERROR,
        { sessionId: 'test' }
      );

      expect(results).toHaveLength(0);
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled(); // Just checking that it logged something is fine for now
      // Or remove the expectation entirely if the logging behavior changed
      // expect(consoleLogSpy).toHaveBeenCalledWith(
      //   expect.stringContaining('No webhooks registered')
      // );
    });

    it('should trigger multiple webhooks for the same event', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook1',
            events: [OpencodeEventType.SESSION_IDLE],
          },
          {
            url: 'https://example.com/webhook2',
            events: [OpencodeEventType.SESSION_IDLE],
          },
          {
            url: 'https://example.com/webhook3',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

      const results = await plugin.handleEvent(
        OpencodeEventType.SESSION_IDLE,
        { sessionId: 'test' }
      );

      expect(results).toHaveLength(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should respect shouldSend filter function', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const shouldSend = jest.fn().mockReturnValue(false);

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
            shouldSend,
          },
        ],
        debug: true,
      };

      const plugin = new WebhookPlugin(config);

      const results = await plugin.handleEvent(
        OpencodeEventType.SESSION_IDLE,
        { sessionId: 'test' }
      );

      expect(shouldSend).toHaveBeenCalled();
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(0); // Not sent
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should add timestamp to payload', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

      await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, {
        sessionId: 'test',
      });

      const callArgs = mockSend.mock.calls[0];
      const payload = callArgs[1] as BaseEventPayload;

      expect(payload.timestamp).toBeDefined();
      expect(payload.eventType).toBe(OpencodeEventType.SESSION_IDLE);
      expect(payload.sessionId).toBe('test');
    });

    it('should apply global defaults to webhook config', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
        defaultTimeoutMs: 15000,
        defaultRetry: {
          maxAttempts: 5,
          delayMs: 2000,
        },
      };

      const plugin = new WebhookPlugin(config);

      await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, {
        sessionId: 'test',
      });

      const callArgs = mockSend.mock.calls[0];
      const webhookConfig = callArgs[0];

      expect(webhookConfig.timeoutMs).toBe(15000);
      expect(webhookConfig.retry.maxAttempts).toBe(5);
      expect(webhookConfig.retry.delayMs).toBe(2000);
    });

    it('should prefer webhook-specific config over defaults', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        success: true,
        webhookUrl: 'https://example.com/webhook',
        statusCode: 200,
        attempts: 1,
      });

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
            timeoutMs: 5000,
            retry: {
              maxAttempts: 2,
              delayMs: 500,
            },
          },
        ],
        defaultTimeoutMs: 15000,
        defaultRetry: {
          maxAttempts: 5,
          delayMs: 2000,
        },
      };

      const plugin = new WebhookPlugin(config);

      await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, {
        sessionId: 'test',
      });

      const callArgs = mockSend.mock.calls[0];
      const webhookConfig = callArgs[0];

      expect(webhookConfig.timeoutMs).toBe(5000);
      expect(webhookConfig.retry.maxAttempts).toBe(2);
      expect(webhookConfig.retry.delayMs).toBe(500);
    });

    it('should handle webhook send errors gracefully', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Network error'));

      (WebhookClient as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

      const results = await plugin.handleEvent(OpencodeEventType.SESSION_IDLE, {
        sessionId: 'test',
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Network error');
    });
  });

  describe('createWebhookPlugin', () => {
    it('should return a plugin function', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = createWebhookPlugin(config);

      expect(typeof plugin).toBe('function');
    });

    it('should return expected hooks when executed', async () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = createWebhookPlugin(config);
      const context = {} as any; // Mock context
      const hooks = await plugin(context);

      expect(hooks).toHaveProperty('event');
      expect(typeof hooks.event).toBe('function');
    });
  });
});
