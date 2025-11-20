import {
  WebhookPluginConfig,
  WebhookConfig,
  BaseEventPayload,
  OpencodeEventType,
  WebhookResult,
} from './types';
import { WebhookClient } from './webhook-client';

/**
 * Opencode Webhook Plugin
 *
 * This plugin allows you to send webhook notifications on any Opencode event.
 * You can configure multiple webhooks for different events, customize payloads,
 * and add filtering logic.
 *
 * @example
 * ```typescript
 * import { createWebhookPlugin, OpencodeEventType } from '@opencode/webhook-plugin';
 *
 * const plugin = createWebhookPlugin({
 *   webhooks: [
 *     {
 *       url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
 *       events: [OpencodeEventType.SESSION_IDLE],
 *       transformPayload: (payload) => ({
 *         text: `Session ${payload.sessionId} is now idle`,
 *       }),
 *     },
 *   ],
 *   debug: true,
 * });
 *
 * // Register with Opencode
 * opencode.use(plugin);
 * ```
 */
export class WebhookPlugin {
  private config: WebhookPluginConfig;
  private client: WebhookClient;
  private eventHandlers: Map<OpencodeEventType, Set<WebhookConfig>>;

  constructor(config: WebhookPluginConfig) {
    this.config = config;
    this.client = new WebhookClient(config.debug);
    this.eventHandlers = new Map();

    // Index webhooks by event type for efficient lookup
    this.indexWebhooks();

    if (this.config.debug) {
      console.log('[WebhookPlugin] Initialized with configuration:', {
        webhookCount: config.webhooks.length,
        events: this.getRegisteredEvents(),
      });
    }
  }

  /**
   * Index webhooks by event type for efficient event handling
   */
  private indexWebhooks(): void {
    for (const webhook of this.config.webhooks) {
      for (const eventType of webhook.events) {
        if (!this.eventHandlers.has(eventType)) {
          this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(webhook);
      }
    }
  }

  /**
   * Get all registered event types
   */
  private getRegisteredEvents(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  /**
   * Handle an Opencode event
   * This is the main entry point called by Opencode when an event occurs
   */
  async handleEvent(
    eventType: OpencodeEventType,
    payload: Partial<BaseEventPayload>
  ): Promise<WebhookResult[]> {
    // Get webhooks registered for this event
    const webhooks = this.eventHandlers.get(eventType);

    if (!webhooks || webhooks.size === 0) {
      if (this.config.debug) {
        console.log(`[WebhookPlugin] No webhooks registered for event: ${eventType}`);
      }
      return [];
    }

    // Prepare the full payload
    const fullPayload: BaseEventPayload = {
      timestamp: new Date().toISOString(),
      eventType,
      ...payload,
    };

    if (this.config.debug) {
      console.log(`[WebhookPlugin] Handling event: ${eventType}`, fullPayload);
    }

    // Send webhooks in parallel
    const webhookPromises = Array.from(webhooks).map((webhook) =>
      this.sendWebhook(webhook, fullPayload)
    );

    const results = await Promise.allSettled(webhookPromises);

    // Extract results
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          webhookUrl: 'unknown',
          error: result.reason?.message || 'Unknown error',
          attempts: 1,
        };
      }
    });
  }

  /**
   * Send a single webhook
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
    // Check if webhook should be sent based on filter function
    if (webhook.shouldSend && !webhook.shouldSend(payload)) {
      if (this.config.debug) {
        console.log(
          `[WebhookPlugin] Webhook filtered out by shouldSend: ${webhook.url}`
        );
      }
      return {
        success: true,
        webhookUrl: webhook.url,
        attempts: 0,
      };
    }

    // Apply global defaults if not specified in webhook config
    const webhookWithDefaults: WebhookConfig = {
      ...webhook,
      timeoutMs: webhook.timeoutMs ?? this.config.defaultTimeoutMs,
      retry: {
        maxAttempts:
          webhook.retry?.maxAttempts ?? this.config.defaultRetry?.maxAttempts ?? 3,
        delayMs: webhook.retry?.delayMs ?? this.config.defaultRetry?.delayMs ?? 1000,
      },
    };

    return this.client.send(webhookWithDefaults, payload);
  }

  /**
   * Register event listeners with Opencode
   * This method should be called by Opencode's plugin system
   */
  register(eventEmitter: any): void {
    for (const eventType of this.eventHandlers.keys()) {
      eventEmitter.on(eventType, (payload: Partial<BaseEventPayload>) => {
        this.handleEvent(eventType, payload).catch((error) => {
          console.error('[WebhookPlugin] Error handling event:', error);
        });
      });
    }

    if (this.config.debug) {
      console.log('[WebhookPlugin] Event listeners registered');
    }
  }
}

/**
 * Factory function to create a webhook plugin instance
 */
export function createWebhookPlugin(config: WebhookPluginConfig): WebhookPlugin {
  return new WebhookPlugin(config);
}

// Export types for consumers
export * from './types';
export { WebhookClient } from './webhook-client';
