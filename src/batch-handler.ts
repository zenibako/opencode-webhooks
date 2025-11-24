import { BaseEventPayload, WebhookConfig } from './types.js';

/**
 * Manages rate limiting and queuing for a specific webhook
 */
export class BatchHandler {
  private queue: BaseEventPayload[] = [];
  private requestTimestamps: number[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private debug: boolean;

  constructor(
    private config: WebhookConfig,
    private sendCallback: (payload: BaseEventPayload, rateLimitDelayed: boolean) => Promise<void>,
    debug: boolean = false
  ) {
    this.debug = debug;
  }

  /**
   * Add an event to the queue
   */
  async addEvent(payload: BaseEventPayload): Promise<void> {
    if (!this.config.rateLimit) {
      // No rate limiting configured, send immediately
      await this.sendCallback(payload, false);
      return;
    }

    const { maxRequests, windowMs } = this.config.rateLimit;

    // Clean up old timestamps outside the window
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < windowMs
    );

    // Check if we can send immediately
    if (this.requestTimestamps.length < maxRequests) {
      // We have capacity, check if there's a queue to flush first
      if (this.queue.length > 0) {
        // Add to queue and flush everything
        this.queue.push(payload);
        await this.flush();
      } else {
        // Send immediately without delay
        this.requestTimestamps.push(Date.now());
        await this.sendCallback(payload, false);
      }
    } else {
      // Rate limited, add to queue
      this.queue.push(payload);
      
      if (this.debug) {
        console.log(
          `[BatchHandler] Rate limit reached for ${this.config.url}, queuing event (queue size: ${this.queue.length})`
        );
      }

      // Schedule a flush if not already scheduled
      if (!this.flushTimer) {
        // Calculate time until we can send again
        const oldestTimestamp = this.requestTimestamps[0];
        const timeUntilExpiry = windowMs - (now - oldestTimestamp);
        const delayMs = Math.max(timeUntilExpiry, 100); // At least 100ms

        if (this.debug) {
          console.log(
            `[BatchHandler] Scheduling flush in ${delayMs}ms for ${this.config.url}`
          );
        }

        this.flushTimer = setTimeout(() => {
          this.flush();
        }, delayMs);
      }
    }
  }

  /**
   * Flush the queue and send queued events individually
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    // Clear the timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const { maxRequests, windowMs } = this.config.rateLimit!;

    if (this.debug) {
      console.log(
        `[BatchHandler] Flushing ${this.queue.length} queued event(s) for ${this.config.url}`
      );
    }

    // Send as many events as we can within rate limit
    while (this.queue.length > 0) {
      // Clean up old timestamps
      const now = Date.now();
      this.requestTimestamps = this.requestTimestamps.filter(
        (ts) => now - ts < windowMs
      );

      // Check if we have capacity
      if (this.requestTimestamps.length < maxRequests) {
        const event = this.queue.shift()!;
        this.requestTimestamps.push(Date.now());
        
        // Send with rate limit delay flag (true because it was queued)
        await this.sendCallback(event, true);
      } else {
        // Still rate limited, schedule another flush
        const oldestTimestamp = this.requestTimestamps[0];
        const timeUntilExpiry = windowMs - (now - oldestTimestamp);
        const delayMs = Math.max(timeUntilExpiry, 100);

        if (this.debug) {
          console.log(
            `[BatchHandler] Still rate limited, rescheduling flush in ${delayMs}ms (${this.queue.length} events remaining)`
          );
        }

        this.flushTimer = setTimeout(() => {
          this.flush();
        }, delayMs);
        break;
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
