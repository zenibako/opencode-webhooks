import type { Plugin } from '@opencode-ai/plugin';
import {
  WebhookPluginConfig,
  WebhookConfig,
  BaseEventPayload,
  OpencodeEventType,
  WebhookResult,
} from './types';
import { WebhookClient } from './webhook-client';

/**
 * Opencode Webhook Plugin Class
 * Internal logic for handling webhooks
 */
export class WebhookPlugin {
  private config: WebhookPluginConfig;
  private client: WebhookClient;
  private eventHandlers: Map<OpencodeEventType, Set<WebhookConfig>>;

  constructor(config: WebhookPluginConfig) {
    this.config = config;
    this.client = new WebhookClient(config.debug);
    this.eventHandlers = new Map();

    this.indexWebhooks();

    if (this.config.debug) {
      console.log('[WebhookPlugin] Initialized with configuration:', {
        webhookCount: config.webhooks.length,
        events: this.getRegisteredEvents(),
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
    }
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
      this.sendWebhook(webhook, fullPayload)
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

  private async sendWebhook(
    webhook: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
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
export * from './types';
export { WebhookClient } from './webhook-client';
