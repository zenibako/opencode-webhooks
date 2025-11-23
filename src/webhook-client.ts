import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { WebhookConfig, WebhookResult, BaseEventPayload } from './types.js';

/**
 * Webhook client for sending HTTP requests
 */
export class WebhookClient {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Send a webhook with retry logic
   */
  async send(
    config: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
    const maxAttempts = config.retry?.maxAttempts ?? 3;
    const delayMs = config.retry?.delayMs ?? 1000;
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        if (this.debug) {
          console.log(
            `[WebhookPlugin] Attempt ${attempts}/${maxAttempts} - Sending webhook to ${config.url}`
          );
        }

        const result = await this.sendOnce(config, payload);

        if (this.debug) {
          console.log(
            `[WebhookPlugin] Successfully sent webhook to ${config.url} (status: ${result.statusCode})`
          );
        }

        return result;
      } catch (error) {
        lastError = this.getErrorMessage(error);

        if (this.debug) {
          console.error(
            `[WebhookPlugin] Attempt ${attempts} failed for ${config.url}: ${lastError}`
          );
        }

        // If this wasn't the last attempt, wait before retrying
        if (attempts < maxAttempts) {
          await this.delay(delayMs * attempts); // Exponential backoff
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      webhookUrl: config.url,
      error: lastError || 'Unknown error',
      attempts,
    };
  }

  /**
   * Send a webhook once (no retry)
   */
  private async sendOnce(
    config: WebhookConfig,
    payload: BaseEventPayload
  ): Promise<WebhookResult> {
    // Transform payload if transformer is provided
    const finalPayload = config.transformPayload
      ? config.transformPayload(payload)
      : payload;

    // Prepare request configuration
    const requestConfig: AxiosRequestConfig = {
      method: config.method || 'POST',
      url: config.url,
      data: finalPayload,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Opencode-Webhook-Plugin/1.0',
        ...config.headers,
      },
      timeout: config.timeoutMs || 10000,
    };

    try {
      const response = await axios(requestConfig);

      return {
        success: true,
        webhookUrl: config.url,
        statusCode: response.status,
        attempts: 1,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new Error(
        `Webhook request failed: ${axiosError.message} (status: ${axiosError.response?.status})`
      );
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extract error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
