/**
 * Opencode Event Types
 * Based on the Opencode event system
 */
export enum OpencodeEventType {
  // Session events
  SESSION_CREATED = 'session.created',
  SESSION_UPDATED = 'session.updated',
  SESSION_IDLE = 'session.idle',
  SESSION_ERROR = 'session.error',
  SESSION_DELETED = 'session.deleted',
  SESSION_COMPACTED = 'session.compacted',
  SESSION_STATUS = 'session.status',
  SESSION_DIFF = 'session.diff',

  // Tool events
  TOOL_EXECUTE_BEFORE = 'tool.execute.before',
  TOOL_EXECUTE_AFTER = 'tool.execute.after',

  // Message events
  MESSAGE_UPDATED = 'message.updated',
  MESSAGE_REMOVED = 'message.removed',
  MESSAGE_PART_UPDATED = 'message.part.updated',
  MESSAGE_PART_REMOVED = 'message.part.removed',

  // File events
  FILE_EDITED = 'file.edited',
  FILE_WATCHER_UPDATED = 'file.watcher.updated',

  // Command events
  COMMAND_EXECUTED = 'command.executed',

  // LSP events
  LSP_UPDATED = 'lsp.updated',
  LSP_CLIENT_DIAGNOSTICS = 'lsp.client.diagnostics',

  // Other events
  INSTALLATION_UPDATED = 'installation.updated',
  PERMISSION_UPDATED = 'permission.updated',
  PERMISSION_REPLIED = 'permission.replied',
  SERVER_CONNECTED = 'server.connected',
  TODO_UPDATED = 'todo.updated',
  TUI_PROMPT_APPEND = 'tui.prompt.append',
  TUI_COMMAND_EXECUTE = 'tui.command.execute',
  TUI_TOAST_SHOW = 'tui.toast.show',
}

/**
 * Base event payload that all events extend from
 */
export interface BaseEventPayload {
  timestamp: string;
  eventType: OpencodeEventType;
  sessionId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Webhook configuration for a specific event
 */
export interface WebhookConfig {
  /** The URL to send the webhook to */
  url: string;

  /** The events that should trigger this webhook */
  events: OpencodeEventType[];

  /** Optional: HTTP method (default: POST) */
  method?: 'POST' | 'PUT' | 'PATCH';

  /** Optional: Custom headers to include in the request */
  headers?: Record<string, string>;

  /** Optional: Transform function to customize the payload */
  transformPayload?: (payload: BaseEventPayload) => any;

  /** Optional: Filter function to determine if webhook should be sent */
  shouldSend?: (payload: BaseEventPayload) => boolean;

  /** Optional: Retry configuration */
  retry?: {
    maxAttempts?: number;
    delayMs?: number;
  };

  /** Optional: Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Plugin configuration
 */
export interface WebhookPluginConfig {
  /** Array of webhook configurations */
  webhooks: WebhookConfig[];

  /** Optional: Enable debug logging */
  debug?: boolean;

  /** Optional: Global timeout for all webhooks */
  defaultTimeoutMs?: number;

  /** Optional: Global retry configuration */
  defaultRetry?: {
    maxAttempts?: number;
    delayMs?: number;
  };
}

/**
 * Webhook delivery result
 */
export interface WebhookResult {
  success: boolean;
  webhookUrl: string;
  statusCode?: number;
  error?: string;
  attempts: number;
}

/**
 * Slack-specific message format
 */
export interface SlackMessage {
  text?: string;
  blocks?: any[];
  attachments?: any[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}
