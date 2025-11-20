/**
 * Opencode Event Types
 * Based on the Opencode event system
 */
export enum OpencodeEventType {
  // Session events
  SESSION_START = 'session:start',
  SESSION_END = 'session:end',
  SESSION_IDLE = 'session:idle',
  SESSION_ACTIVE = 'session:active',

  // Code events
  CODE_CHANGE = 'code:change',
  CODE_SAVE = 'code:save',
  CODE_EXECUTE = 'code:execute',

  // Error events
  ERROR_OCCURRED = 'error:occurred',
  ERROR_RESOLVED = 'error:resolved',

  // Build events
  BUILD_START = 'build:start',
  BUILD_SUCCESS = 'build:success',
  BUILD_FAILED = 'build:failed',

  // Test events
  TEST_START = 'test:start',
  TEST_SUCCESS = 'test:success',
  TEST_FAILED = 'test:failed',

  // User events
  USER_ACTION = 'user:action',
  USER_INPUT = 'user:input',
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
