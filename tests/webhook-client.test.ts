import axios, { AxiosError } from 'axios';
import { WebhookClient } from '../src/webhook-client';
import { WebhookConfig, BaseEventPayload, OpencodeEventType } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('WebhookClient', () => {
  let client: WebhookClient;
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
    it('should create client with debug disabled by default', () => {
      client = new WebhookClient();
      expect(client).toBeInstanceOf(WebhookClient);
    });

    it('should create client with debug enabled', () => {
      client = new WebhookClient(true);
      expect(client).toBeInstanceOf(WebhookClient);
    });
  });

  describe('send', () => {
    const mockConfig: WebhookConfig = {
      url: 'https://example.com/webhook',
      events: [OpencodeEventType.SESSION_IDLE],
      retry: {
        maxAttempts: 3,
        delayMs: 100,
      },
    };

    const mockPayload: BaseEventPayload = {
      timestamp: '2025-01-01T00:00:00.000Z',
      eventType: OpencodeEventType.SESSION_IDLE,
      sessionId: 'test-session',
    };

    it('should successfully send webhook on first attempt', async () => {
      client = new WebhookClient();
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      const result = await client.send(mockConfig, mockPayload);

      expect(result.success).toBe(true);
      expect(result.webhookUrl).toBe(mockConfig.url);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      client = new WebhookClient(true);
      mockedAxios
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: { success: true },
        } as any);

      const result = await client.send(mockConfig, mockPayload);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1); // Note: attempts reflects successful attempt
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retry attempts', async () => {
      client = new WebhookClient();
      const error = new Error('Network error');
      mockedAxios.mockRejectedValue(error);

      const result = await client.send(mockConfig, mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.attempts).toBe(3);
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });

    it('should log debug messages when debug is enabled', async () => {
      client = new WebhookClient(true);
      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      await client.send(mockConfig, mockPayload);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebhookPlugin]')
      );
    });

    it('should use custom headers from config', async () => {
      client = new WebhookClient();
      const configWithHeaders: WebhookConfig = {
        ...mockConfig,
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      };

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      await client.send(configWithHeaders, mockPayload);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'custom-value',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should use custom HTTP method from config', async () => {
      client = new WebhookClient();
      const configWithMethod: WebhookConfig = {
        ...mockConfig,
        method: 'PUT',
      };

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      await client.send(configWithMethod, mockPayload);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should transform payload when transform function is provided', async () => {
      client = new WebhookClient();
      const transformedData = { custom: 'transformed' };
      const configWithTransform: WebhookConfig = {
        ...mockConfig,
        transformPayload: jest.fn(() => transformedData),
      };

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      await client.send(configWithTransform, mockPayload);

      expect(configWithTransform.transformPayload).toHaveBeenCalledWith(mockPayload);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: transformedData,
        })
      );
    });

    it('should respect timeout configuration', async () => {
      client = new WebhookClient();
      const configWithTimeout: WebhookConfig = {
        ...mockConfig,
        timeoutMs: 5000,
      };

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
      } as any);

      await client.send(configWithTimeout, mockPayload);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should handle axios errors with status code', async () => {
      client = new WebhookClient();
      const axiosError = {
        message: 'Request failed',
        response: {
          status: 500,
        },
      } as AxiosError;

      mockedAxios.mockRejectedValue(axiosError);

      const result = await client.send(mockConfig, mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request failed');
      expect(result.error).toContain('500');
    });

    it('should retry multiple times before failing', async () => {
      client = new WebhookClient(false);

      mockedAxios
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      const result = await client.send(mockConfig, mockPayload);

      // Should have attempted all retries
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(mockedAxios).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle unknown error types', async () => {
      client = new WebhookClient();
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_IDLE],
        retry: { maxAttempts: 1 },
      };

      const payload: BaseEventPayload = {
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_IDLE,
      };

      mockedAxios.mockRejectedValue('String error');

      const result = await client.send(config, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
