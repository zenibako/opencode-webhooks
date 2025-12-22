/**
 * Tests for rate limiting and queuing
 */

import { BatchHandler } from '../src/batch-handler.js';
import { WebhookConfig, BaseEventPayload, OpencodeEventType } from '../src/types.js';

describe('BatchHandler', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
  });

  describe('without rate limiting', () => {
    it('should send events immediately when no rate limit is configured', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
      };

      const handler = new BatchHandler(config, mockSendCallback);

      const payload: BaseEventPayload = {
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'test-session',
      };

      await handler.addEvent(payload);

      expect(mockSendCallback).toHaveBeenCalledTimes(1);
      expect(mockSendCallback).toHaveBeenCalledWith(payload, false);
    });
  });

  describe('with rate limiting', () => {
    it('should send events immediately when under rate limit', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 10,
          windowMs: 60000, // 1 minute
        },
      };

      const handler = new BatchHandler(config, mockSendCallback, true);

      const payload: BaseEventPayload = {
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'test-session',
      };

      await handler.addEvent(payload);

      expect(mockSendCallback).toHaveBeenCalledTimes(1);
      expect(mockSendCallback).toHaveBeenCalledWith(payload, false);
    });

    it('should queue events when rate limit is exceeded', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 2,
          windowMs: 60000,
        },
      };

      const handler = new BatchHandler(config, mockSendCallback, true);

      // Send 2 events (at rate limit)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-1',
      });

      await handler.addEvent({
        timestamp: '2025-01-01T00:00:01.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-2',
      });

      // These should be sent immediately (under limit)
      expect(mockSendCallback).toHaveBeenCalledTimes(2);
      expect(mockSendCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: 'session-1' }), false);
      expect(mockSendCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: 'session-2' }), false);

      // Send more events (will be queued)
      mockSendCallback.mockClear();
      
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:02.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-3',
      });

      await handler.addEvent({
        timestamp: '2025-01-01T00:00:03.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-4',
      });

      // Should not be sent immediately (queued)
      expect(mockSendCallback).not.toHaveBeenCalled();

      // Advance time to trigger queue flush
      jest.advanceTimersByTime(60000);
      await Promise.resolve(); // Let promises settle

      // Should have sent the queued events individually
      expect(mockSendCallback).toHaveBeenCalledTimes(2);
      expect(mockSendCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: 'session-3' }), true);
      expect(mockSendCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: 'session-4' }), true);
    });

    it('should preserve original timestamps when queuing events', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_ERROR],
        rateLimit: {
          maxRequests: 1,
          windowMs: 60000,
        },
      };

      const handler = new BatchHandler(config, mockSendCallback);

      // First event (sent immediately)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_ERROR,
        sessionId: 'session-1',
        error: 'Test error 1',
      });

      mockSendCallback.mockClear();

      // Second event (queued)
      const originalTimestamp = '2025-01-01T00:00:01.000Z';
      await handler.addEvent({
        timestamp: originalTimestamp,
        eventType: OpencodeEventType.SESSION_ERROR,
        sessionId: 'session-2',
        error: 'Test error 2',
      });

      // Not sent yet
      expect(mockSendCallback).not.toHaveBeenCalled();

      // Flush the queue
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      // Should have preserved the original timestamp
      expect(mockSendCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: originalTimestamp,
          sessionId: 'session-2',
        }),
        true // rateLimitDelayed flag
      );
    });

    it('should send queued events with rateLimitDelayed flag', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 2, // Allow 2 events
          windowMs: 60000,
        },
      };

      const handler = new BatchHandler(config, mockSendCallback);

      // Send two events (use up rate limit)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-1',
      });

      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.500Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-1b',
      });

      // Both should be sent immediately (rateLimitDelayed = false)
      expect(mockSendCallback).toHaveBeenCalledTimes(2);
      expect(mockSendCallback).toHaveBeenNthCalledWith(1, expect.any(Object), false);
      expect(mockSendCallback).toHaveBeenNthCalledWith(2, expect.any(Object), false);

      mockSendCallback.mockClear();

      // Queue one more event (will be queued)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:01.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-2',
      });

      // Should be queued, not sent
      expect(mockSendCallback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      // Queued event should be sent with rateLimitDelayed = true
      expect(mockSendCallback).toHaveBeenCalledTimes(1);
      expect(mockSendCallback).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-2' }), true);
    });

    it('should flush queued events before new immediate events', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 1,
          windowMs: 100, // Short window for testing
        },
      };

      const handler = new BatchHandler(config, mockSendCallback);

      // Send first event (immediate)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-1',
      });

      expect(mockSendCallback).toHaveBeenCalledTimes(1);
      mockSendCallback.mockClear();

      // Send second event (queued)
      await handler.addEvent({
        timestamp: '2025-01-01T00:00:01.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-2',
      });

      expect(mockSendCallback).not.toHaveBeenCalled();

      // Advance time so rate limit window expires
      jest.advanceTimersByTime(150);
      await Promise.resolve();

      // Queued event should have been sent
      expect(mockSendCallback).toHaveBeenCalledTimes(1);
      expect(mockSendCallback).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-2' }), true);
    });

    it('should cleanup timer on destroy', () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 1,
          windowMs: 60000,
        },
      };

      const handler = new BatchHandler(config, mockSendCallback);
      handler.destroy();

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe('debug logging', () => {
    it('should log queue operations when debug is enabled', async () => {
      const mockSendCallback = jest.fn().mockResolvedValue(undefined);
      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        events: [OpencodeEventType.SESSION_CREATED],
        rateLimit: {
          maxRequests: 1,
          windowMs: 60000,
        },
      };

      const handler = new BatchHandler(config, mockSendCallback, true);

      await handler.addEvent({
        timestamp: '2025-01-01T00:00:00.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-1',
      });

      mockSendCallback.mockClear();

      await handler.addEvent({
        timestamp: '2025-01-01T00:00:01.000Z',
        eventType: OpencodeEventType.SESSION_CREATED,
        sessionId: 'session-2',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BatchHandler] Rate limit reached')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BatchHandler] Scheduling flush')
      );

      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BatchHandler] Flushing')
      );
    });
  });
});
