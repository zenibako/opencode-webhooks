import type { Plugin } from '@opencode-ai/plugin';
import {
  WebhookPluginConfig,
  WebhookConfig,
  BaseEventPayload,
  OpencodeEventType,
  WebhookResult,
} from './types.js';
import { WebhookClient } from './webhook-client.js';
import { BatchHandler } from './batch-handler.js';

/**
 * Opencode Webhook Plugin Class
 * Internal logic for handling webhooks
 */
export class WebhookPlugin {
  private config: WebhookPluginConfig;
  private client: WebhookClient;
  private eventHandlers: Map<OpencodeEventType, Set<WebhookConfig>>;
  private batchHandlers: Map<string, BatchHandler>;

  constructor(config: WebhookPluginConfig) {
    this.config = config;
    this.client = new WebhookClient(config.debug);
    this.eventHandlers = new Map();
    this.batchHandlers = new Map();

    this.indexWebhooks();

    if (this.config.debug) {
      console.log('[WebhookPlugin] Initialized with configuration:', {
        webhookCount: config.webhooks.length,
        events: this.getRegisteredEvents(),
        rateLimitedWebhooks: config.webhooks.filter(w => w.rateLimit).length,
      });
    }
  }

  private indexWebhooks(): void {
    for (const webhook of this.config.webhooks) {
      for (const eventType of webhook.events) {
        if (!this.eventHandlers.has(eventType as OpencodeEventType)) {
          this.eventHandlers.set(eventType as OpencodeEventType, new Set());
        }
        this.eventHandlers.get(eventType as OpencodeEventType)!.add(webhook);
      }

      // Create batch handler if rate limiting is configured
      if (webhook.rateLimit) {
        const key = this.getWebhookKey(webhook);
        const sendCallback = async (payload: BaseEventPayload, rateLimitDelayed: boolean) => {
          await this.sendWebhookDirect(webhook, payload, rateLimitDelayed);
        };
        this.batchHandlers.set(key, new BatchHandler(webhook, sendCallback, this.config.debug));
      }
    }
  }

  private getWebhookKey(webhook: WebhookConfig): string {
    return `${webhook.url}:${webhook.events.join(',')}`;
  }

  private getRegisteredEvents(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  async handleEvent(
    eventType: OpencodeEventType,
    payload: Partial<BaseEventPayload>
  ): Promise<WebhookResult[]> {
    const webhooks = this.eventHandlers.get(eventType);

    if (!webhooks || webhooks.size === 0) {
      return [];
    }

    const fullPayload: BaseEventPayload = {
      timestamp: new Date().toISOString(),
      eventType,
      ...payload,
    };

    if (this.config.debug) {
      console.log(`[WebhookPlugin] Handling event: ${eventType}`, fullPayload);
    }

    const webhookPromises = Array.from(webhooks).map((webhook) =>
      this.processWebhook(webhook, fullPayload)
    );

    const results = await Promise.allSettled(webhookPromises);

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

  private async processWebhook(
    webhook: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
    // Check shouldSend filter
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

    // Check if rate limiting is enabled
    if (webhook.rateLimit) {
      const key = this.getWebhookKey(webhook);
      const batchHandler = this.batchHandlers.get(key);
      
      if (batchHandler) {
        // Add to queue (will be sent later if rate limited)
        await batchHandler.addEvent(payload);
        
        return {
          success: true,
          webhookUrl: webhook.url,
          attempts: 0,
        };
      }
    }

    // No rate limiting, send immediately
    return this.sendWebhook(webhook, payload);
  }

  private async sendWebhookDirect(
    webhook: WebhookConfig,
    payload: BaseEventPayload,
    rateLimitDelayed: boolean
  ): Promise<WebhookResult> {
    const webhookWithDefaults: WebhookConfig = {
      ...webhook,
      timeoutMs: webhook.timeoutMs ?? this.config.defaultTimeoutMs,
      retry: {
        maxAttempts:
          webhook.retry?.maxAttempts ?? this.config.defaultRetry?.maxAttempts ?? 3,
        delayMs: webhook.retry?.delayMs ?? this.config.defaultRetry?.delayMs ?? 1000,
      },
    };

    const result = await this.client.send(webhookWithDefaults, payload);
    
    // Add rate limit delay flag if applicable
    if (rateLimitDelayed) {
      result.rateLimitDelayed = true;
    }
    
    return result;
  }

  private async sendWebhook(
    webhook: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
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
   * Cleanup batch handlers on shutdown
   */
  destroy(): void {
    for (const handler of this.batchHandlers.values()) {
      handler.destroy();
    }
    this.batchHandlers.clear();
  }
}

/**
 * Factory function to create a webhook plugin instance compatible with Opencode
 */
export function createWebhookPlugin(config: WebhookPluginConfig): Plugin {
  const plugin = new WebhookPlugin(config);
  
  return async (_context) => {
    return {
      event: async ({ event }: { event: any }) => {
        // Map the incoming event to our handler
        // event.type corresponds to OpencodeEventType values (e.g. 'session.idle')
        await plugin.handleEvent(event.type as OpencodeEventType, event);
      }
    };
  };
}

// Export types for consumers
export * from './types.js';
export { WebhookClient } from './webhook-client.js';
export { BatchHandler } from './batch-handler.js';
