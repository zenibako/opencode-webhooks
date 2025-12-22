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
  SESSION_RESUMED = 'session.resumed',
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
  events: (OpencodeEventType | string)[];

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

  /** Optional: Rate limiting configuration */
  rateLimit?: {
    /** Maximum number of requests per time window */
    maxRequests: number;
    
    /** Time window in milliseconds (e.g., 60000 for 1 minute) */
    windowMs: number;
  };
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
  rateLimitDelayed?: boolean;
}

// Agent completion middleware types

/**
 * Synthetic event constant for agent completion
 */
export const AGENT_COMPLETED_EVENT = 'agent.completed';

/**
 * Payload sent when agent completes work (session goes idle)
 */
export interface AgentCompletedPayload {
  timestamp: string;
  eventType: typeof AGENT_COMPLETED_EVENT;
  sessionId: string;
  sessionTitle: string;
  messageContent: string;
  messageId?: string;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
  };
  cost?: number;
  [key: string]: any;
}

/**
 * Simplified config for agent notification plugin
 */
export interface AgentNotificationConfig {
  /** Webhook configurations (events not needed - always agent.completed) */
  webhooks: Omit<WebhookConfig, 'events'>[];
  /** Enable debug logging */
  debug?: boolean;
  /** Default timeout for all webhooks */
  defaultTimeoutMs?: number;
  /** Default retry configuration */
  defaultRetry?: {
    maxAttempts?: number;
    delayMs?: number;
  };
  /** Optional: Delay in seconds to wait after session.idle before sending (default: 0 = immediate) */
  idleDelaySecs?: number;
}

/**
 * Context provided to the middleware from OpenCode plugin system
 */
export interface PluginContext {
  project: {
    id: string;
    [key: string]: any;
  };
  directory: string;
  worktree: string;
  client: any;
  $: any;
}
