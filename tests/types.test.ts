import { OpencodeEventType, WebhookConfig, BaseEventPayload } from '../src/types';

describe('OpencodeEventType', () => {
  it('should have all expected event types', () => {
    expect(OpencodeEventType.SESSION_START).toBe('session:start');
    expect(OpencodeEventType.SESSION_END).toBe('session:end');
    expect(OpencodeEventType.SESSION_IDLE).toBe('session:idle');
    expect(OpencodeEventType.SESSION_ACTIVE).toBe('session:active');
    expect(OpencodeEventType.CODE_CHANGE).toBe('code:change');
    expect(OpencodeEventType.CODE_SAVE).toBe('code:save');
    expect(OpencodeEventType.CODE_EXECUTE).toBe('code:execute');
    expect(OpencodeEventType.ERROR_OCCURRED).toBe('error:occurred');
    expect(OpencodeEventType.ERROR_RESOLVED).toBe('error:resolved');
    expect(OpencodeEventType.BUILD_START).toBe('build:start');
    expect(OpencodeEventType.BUILD_SUCCESS).toBe('build:success');
    expect(OpencodeEventType.BUILD_FAILED).toBe('build:failed');
    expect(OpencodeEventType.TEST_START).toBe('test:start');
    expect(OpencodeEventType.TEST_SUCCESS).toBe('test:success');
    expect(OpencodeEventType.TEST_FAILED).toBe('test:failed');
    expect(OpencodeEventType.USER_ACTION).toBe('user:action');
    expect(OpencodeEventType.USER_INPUT).toBe('user:input');
  });
});

describe('WebhookConfig', () => {
  it('should allow valid webhook configuration', () => {
    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      events: [OpencodeEventType.SESSION_IDLE],
      method: 'POST',
      headers: {
        'Authorization': 'Bearer token',
      },
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      timeoutMs: 5000,
    };

    expect(config.url).toBe('https://example.com/webhook');
    expect(config.events).toContain(OpencodeEventType.SESSION_IDLE);
    expect(config.method).toBe('POST');
    expect(config.headers?.['Authorization']).toBe('Bearer token');
    expect(config.retry?.maxAttempts).toBe(3);
    expect(config.timeoutMs).toBe(5000);
  });

  it('should allow minimal webhook configuration', () => {
    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      events: [OpencodeEventType.SESSION_START],
    };

    expect(config.url).toBeDefined();
    expect(config.events.length).toBeGreaterThan(0);
  });

  it('should allow transform and filter functions', () => {
    const transformPayload = jest.fn((payload) => ({ custom: payload }));
    const shouldSend = jest.fn(() => true);

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      events: [OpencodeEventType.ERROR_OCCURRED],
      transformPayload,
      shouldSend,
    };

    expect(config.transformPayload).toBe(transformPayload);
    expect(config.shouldSend).toBe(shouldSend);
  });
});

describe('BaseEventPayload', () => {
  it('should have required fields', () => {
    const payload: BaseEventPayload = {
      timestamp: '2025-01-01T00:00:00.000Z',
      eventType: OpencodeEventType.SESSION_START,
      sessionId: 'session-123',
      userId: 'user-456',
    };

    expect(payload.timestamp).toBeDefined();
    expect(payload.eventType).toBeDefined();
    expect(payload.sessionId).toBe('session-123');
    expect(payload.userId).toBe('user-456');
  });

  it('should allow additional custom fields', () => {
    const payload: BaseEventPayload = {
      timestamp: '2025-01-01T00:00:00.000Z',
      eventType: OpencodeEventType.BUILD_FAILED,
      error: 'Build error message',
      exitCode: 1,
      customField: 'custom value',
    };

    expect(payload.error).toBe('Build error message');
    expect(payload.exitCode).toBe(1);
    expect(payload.customField).toBe('custom value');
  });
});
