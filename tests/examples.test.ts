/**
 * Tests for example files
 * Ensures that all example files can be loaded without crashing
 */

describe('Example Files', () => {
  describe('slack-idle-notification.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        require('../examples/slack-idle-notification');
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      const module = require('../examples/slack-idle-notification');
      expect(module.webhookPlugin).toBeDefined();
      expect(typeof module.webhookPlugin).toBe('object');
    });

    it('should create a valid webhook plugin configuration', () => {
      const { webhookPlugin } = require('../examples/slack-idle-notification');
      
      // Verify it has the register method (plugin interface)
      expect(typeof webhookPlugin.register).toBe('function');
      
      // Verify it has the handleEvent method
      expect(typeof webhookPlugin.handleEvent).toBe('function');
    });
  });

  describe('simple-webhook.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        require('../examples/simple-webhook');
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      const module = require('../examples/simple-webhook');
      expect(module.webhookPlugin).toBeDefined();
    });
  });

  describe('advanced-usage.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        require('../examples/advanced-usage');
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      const module = require('../examples/advanced-usage');
      expect(module.webhookPlugin).toBeDefined();
    });
  });

  describe('integration-example.ts', () => {
    it('should load without crashing', () => {
      expect(() => {
        require('../examples/integration-example');
      }).not.toThrow();
    });

    it('should export webhookPlugin', () => {
      const module = require('../examples/integration-example');
      expect(module.webhookPlugin).toBeDefined();
    });
  });

  describe('All examples', () => {
    it('should all load successfully', () => {
      // Load all examples
      const examples = [
        require('../examples/slack-idle-notification'),
        require('../examples/simple-webhook'),
        require('../examples/advanced-usage'),
        require('../examples/integration-example'),
      ];

      // Verify that all examples load successfully
      expect(examples).toHaveLength(4);
      examples.forEach((example) => {
        expect(example.webhookPlugin).toBeDefined();
      });
    });
  });
});
