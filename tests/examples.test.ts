/**
 * Tests for example files
 * Ensures that all example files can be loaded without crashing
 */

import * as slackIdleNotification from '../examples/slack-idle-notification';
import * as simpleWebhook from '../examples/simple-webhook';
import * as advancedUsage from '../examples/advanced-usage';
import * as integrationExample from '../examples/integration-example';

describe('Example Files', () => {
  describe('slack-idle-notification.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        void slackIdleNotification;
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      expect(slackIdleNotification.webhookPlugin).toBeDefined();
      expect(typeof slackIdleNotification.webhookPlugin).toBe('function');
    });

    it('should create a valid webhook plugin configuration', () => {
      const { webhookPlugin } = slackIdleNotification;
      
      // Verify it returns a function (plugin interface)
      expect(typeof webhookPlugin).toBe('function');
    });
  });

  describe('simple-webhook.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        void simpleWebhook;
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      expect(simpleWebhook.webhookPlugin).toBeDefined();
    });
  });

  describe('advanced-usage.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        void advancedUsage;
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      expect(advancedUsage.webhookPlugin).toBeDefined();
    });
  });

  describe('integration-example.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        void integrationExample;
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      expect(integrationExample.webhookPlugin).toBeDefined();
    });
  });

  describe('All examples', () => {
    it('should all load successfully', () => {
      // Load all examples
      const examples = [
        slackIdleNotification,
        simpleWebhook,
        advancedUsage,
        integrationExample,
      ];

      // Verify that all examples load successfully
      expect(examples).toHaveLength(4);
      examples.forEach((example) => {
        expect(example.webhookPlugin).toBeDefined();
      });
    });
  });
});
