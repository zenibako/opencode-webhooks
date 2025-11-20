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

      new WebhookPlugin(config);

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls[0][0]).toContain('[WebhookPlugin] Initialized');
    });

    it('should index multiple webhooks correctly', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook1',
            events: [OpencodeEventType.SESSION_IDLE, OpencodeEventType.SESSION_START],
          },
          {
            url: 'https://example.com/webhook2',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = new WebhookPlugin(config);

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
        OpencodeEventType.BUILD_FAILED,
        { sessionId: 'test' }
      );

      expect(results).toHaveLength(0);
      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No webhooks registered')
      );
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

  describe('register', () => {
    it('should register event listeners with event emitter', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [
              OpencodeEventType.SESSION_IDLE,
              OpencodeEventType.SESSION_START,
            ],
          },
        ],
        debug: true,
      };

      const plugin = new WebhookPlugin(config);

      const mockEventEmitter = {
        on: jest.fn(),
      };

      plugin.register(mockEventEmitter);

      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        OpencodeEventType.SESSION_IDLE,
        expect.any(Function)
      );
      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        OpencodeEventType.SESSION_START,
        expect.any(Function)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event listeners registered')
      );
    });

    it('should handle event emitter callback without errors', async () => {
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

      const mockEventEmitter = {
        on: jest.fn(),
      };

      plugin.register(mockEventEmitter);

      // Get the registered callback
      const callback = mockEventEmitter.on.mock.calls[0][1];

      // Call it - should not throw (callback doesn't return a promise, it's fire-and-forget)
      expect(() => callback({ sessionId: 'test' })).not.toThrow();
    });
  });

  describe('createWebhookPlugin', () => {
    it('should create WebhookPlugin instance', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
          },
        ],
      };

      const plugin = createWebhookPlugin(config);

      expect(plugin).toBeInstanceOf(WebhookPlugin);
    });

    it('should accept complex configuration', () => {
      const config: WebhookPluginConfig = {
        webhooks: [
          {
            url: 'https://example.com/webhook',
            events: [OpencodeEventType.SESSION_IDLE],
            transformPayload: (payload) => ({ custom: payload }),
            shouldSend: (_payload) => true,
            headers: { 'Authorization': 'Bearer token' },
            retry: { maxAttempts: 3, delayMs: 1000 },
            timeoutMs: 5000,
          },
        ],
        debug: true,
        defaultTimeoutMs: 10000,
        defaultRetry: {
          maxAttempts: 3,
          delayMs: 1000,
        },
      };

      const plugin = createWebhookPlugin(config);

      expect(plugin).toBeInstanceOf(WebhookPlugin);
    });
  });
});
