import { OpencodeEventType, WebhookConfig, BaseEventPayload } from '../src/types';

describe('OpencodeEventType', () => {
  it('should have all expected event types', () => {
    expect(OpencodeEventType.SESSION_CREATED).toBe('session.created');
    expect(OpencodeEventType.SESSION_UPDATED).toBe('session.updated');
    expect(OpencodeEventType.SESSION_IDLE).toBe('session.idle');
    expect(OpencodeEventType.SESSION_ERROR).toBe('session.error');
    expect(OpencodeEventType.SESSION_DELETED).toBe('session.deleted');
    expect(OpencodeEventType.SESSION_COMPACTED).toBe('session.compacted');
    expect(OpencodeEventType.SESSION_STATUS).toBe('session.status');
    expect(OpencodeEventType.SESSION_DIFF).toBe('session.diff');
    
    expect(OpencodeEventType.TOOL_EXECUTE_BEFORE).toBe('tool.execute.before');
    expect(OpencodeEventType.TOOL_EXECUTE_AFTER).toBe('tool.execute.after');

    expect(OpencodeEventType.MESSAGE_UPDATED).toBe('message.updated');
    expect(OpencodeEventType.MESSAGE_REMOVED).toBe('message.removed');
    expect(OpencodeEventType.MESSAGE_PART_UPDATED).toBe('message.part.updated');
    expect(OpencodeEventType.MESSAGE_PART_REMOVED).toBe('message.part.removed');

    expect(OpencodeEventType.FILE_EDITED).toBe('file.edited');
    expect(OpencodeEventType.FILE_WATCHER_UPDATED).toBe('file.watcher.updated');

    expect(OpencodeEventType.COMMAND_EXECUTED).toBe('command.executed');

    expect(OpencodeEventType.LSP_UPDATED).toBe('lsp.updated');
    expect(OpencodeEventType.LSP_CLIENT_DIAGNOSTICS).toBe('lsp.client.diagnostics');

    expect(OpencodeEventType.INSTALLATION_UPDATED).toBe('installation.updated');
    expect(OpencodeEventType.PERMISSION_UPDATED).toBe('permission.updated');
    expect(OpencodeEventType.PERMISSION_REPLIED).toBe('permission.replied');
    expect(OpencodeEventType.SERVER_CONNECTED).toBe('server.connected');
    expect(OpencodeEventType.TODO_UPDATED).toBe('todo.updated');
    expect(OpencodeEventType.TUI_PROMPT_APPEND).toBe('tui.prompt.append');
    expect(OpencodeEventType.TUI_COMMAND_EXECUTE).toBe('tui.command.execute');
    expect(OpencodeEventType.TUI_TOAST_SHOW).toBe('tui.toast.show');
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
      events: [OpencodeEventType.SESSION_CREATED],
    };

    expect(config.url).toBeDefined();
    expect(config.events.length).toBeGreaterThan(0);
  });

  it('should allow transform and filter functions', () => {
    const transformPayload = jest.fn((payload) => ({ custom: payload }));
    const shouldSend = jest.fn(() => true);

    const config: WebhookConfig = {
      url: 'https://example.com/webhook',
      events: [OpencodeEventType.SESSION_ERROR],
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
      eventType: OpencodeEventType.SESSION_CREATED,
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
      eventType: OpencodeEventType.SESSION_ERROR,
      error: 'Build error message',
      exitCode: 1,
      customField: 'custom value',
    };

    expect(payload.error).toBe('Build error message');
    expect(payload.exitCode).toBe(1);
    expect(payload.customField).toBe('custom value');
  });
});
