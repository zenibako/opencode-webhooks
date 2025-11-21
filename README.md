# Opencode Webhook Plugin

[![CI](https://github.com/yourusername/opencode-webhooks/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/opencode-webhooks/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/opencode-webhooks.svg)](https://badge.fury.io/js/opencode-webhooks)

A powerful TypeScript plugin for Opencode that enables sending webhook notifications on any Opencode event. Perfect for integrating with Slack, Discord, Microsoft Teams, or any custom webhook endpoint.

## Features

- Send webhooks on any Opencode event (session, code, build, test, error events)
- Multiple webhook configurations with different destinations
- Custom payload transformations for each webhook
- Filtering logic to control when webhooks are sent
- Automatic retry logic with exponential backoff
- TypeScript support with full type definitions
- Debug logging for troubleshooting
- Built-in support for popular platforms (Slack, Discord, Teams)

## Installation

### Quick Install (Recommended)

Install the plugin directly into your Opencode plugins directory with a single command:

```bash
# Clone this repository
git clone https://github.com/yourusername/opencode-webhooks.git
cd opencode-webhooks

# Install dependencies
npm install

# Install the plugin with your webhook URL
npm run install-plugin -- https://your-webhook-url

# For Slack formatting (recommended for Slack webhooks)
npm run install-plugin -- https://hooks.slack.com/services/YOUR/WEBHOOK/URL --slack

# Enable debug logging
npm run install-plugin -- https://your-webhook-url --debug
```

This will automatically:
- Bundle all source code into a single standalone file
- Install it to `~/.opencode/plugins/webhook.js`
- Configure it to send notifications on session idle events
- No manual file editing required!

**Next step:** Restart Opencode to activate the plugin.

### Options

The install script supports the following options:

- `--slack` - Use Slack-formatted messages with rich formatting
- `--debug` - Enable debug logging for troubleshooting
- `--help` - Show usage information

### Manual Installation

If you prefer to manually configure the plugin:

1. **Copy an example file to your Opencode plugins directory:**

```bash
mkdir -p ~/.opencode/plugins
curl -o ~/.opencode/plugins/webhook.js \
  https://raw.githubusercontent.com/yourusername/opencode-webhooks/main/examples/slack-idle-notification.ts
```

2. **Edit the file to add your webhook URL:**

```bash
nano ~/.opencode/plugins/webhook.js
# Replace YOUR/WEBHOOK/URL with your actual webhook URL
```

3. **Restart Opencode**

### For NPM Installation (Library Use)

If you want to use this as a library in your own projects:

```bash
npm install opencode-webhooks
```

### For Development

If you're developing the plugin locally:

```bash
npm install
npm run build
npm run watch  # For development mode
```

## Quick Start

### Basic Usage

```typescript
import { createWebhookPlugin, OpencodeEventType } from 'opencode-webhooks';

const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      events: [OpencodeEventType.SESSION_IDLE],
      transformPayload: (payload) => ({
        text: `Session ${payload.sessionId} is now idle`,
      }),
    },
  ],
  debug: true,
});

// Export for Opencode to load
export { webhookPlugin };
```

### Slack Idle Notification Example

Send a formatted Slack message when a session becomes idle:

```typescript
import { createWebhookPlugin, OpencodeEventType, SlackMessage } from 'opencode-webhooks';

const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      events: [OpencodeEventType.SESSION_IDLE],
      transformPayload: (payload) => {
        const slackMessage: SlackMessage = {
          text: '⏸️ Session Idle Notification',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⏸️ Opencode Session is Idle',
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Session ID:*\n${payload.sessionId || 'Unknown'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Time:*\n${new Date(payload.timestamp).toLocaleString()}`,
                },
              ],
            },
          ],
        };
        return slackMessage;
      },
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      timeoutMs: 5000,
    },
  ],
  debug: true,
});
```

## Available Event Types

The plugin supports all Opencode event types:

### Session Events
- `SESSION_START` - When a new session starts
- `SESSION_END` - When a session ends
- `SESSION_IDLE` - When a session becomes idle
- `SESSION_ACTIVE` - When a session becomes active again

### Code Events
- `CODE_CHANGE` - When code is modified
- `CODE_SAVE` - When code is saved
- `CODE_EXECUTE` - When code is executed

### Error Events
- `ERROR_OCCURRED` - When an error occurs
- `ERROR_RESOLVED` - When an error is resolved

### Build Events
- `BUILD_START` - When a build starts
- `BUILD_SUCCESS` - When a build succeeds
- `BUILD_FAILED` - When a build fails

### Test Events
- `TEST_START` - When tests start running
- `TEST_SUCCESS` - When tests pass
- `TEST_FAILED` - When tests fail

### User Events
- `USER_ACTION` - When a user performs an action
- `USER_INPUT` - When a user provides input

## Configuration Options

### WebhookConfig

Each webhook configuration supports the following options:

```typescript
interface WebhookConfig {
  // Required: The webhook URL
  url: string;

  // Required: Array of events that trigger this webhook
  events: OpencodeEventType[];

  // Optional: HTTP method (default: POST)
  method?: 'POST' | 'PUT' | 'PATCH';

  // Optional: Custom headers
  headers?: Record<string, string>;

  // Optional: Transform the payload before sending
  transformPayload?: (payload: BaseEventPayload) => any;

  // Optional: Filter function to determine if webhook should be sent
  shouldSend?: (payload: BaseEventPayload) => boolean;

  // Optional: Retry configuration
  retry?: {
    maxAttempts?: number;  // Default: 3
    delayMs?: number;      // Default: 1000
  };

  // Optional: Request timeout in milliseconds
  timeoutMs?: number;  // Default: 10000
}
```

### WebhookPluginConfig

Global plugin configuration:

```typescript
interface WebhookPluginConfig {
  // Required: Array of webhook configurations
  webhooks: WebhookConfig[];

  // Optional: Enable debug logging
  debug?: boolean;

  // Optional: Default timeout for all webhooks
  defaultTimeoutMs?: number;

  // Optional: Default retry configuration
  defaultRetry?: {
    maxAttempts?: number;
    delayMs?: number;
  };
}
```

## Advanced Examples

### Multiple Webhooks

Configure different webhooks for different events:

```typescript
const webhookPlugin = createWebhookPlugin({
  webhooks: [
    // Slack for idle sessions
    {
      url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      events: [OpencodeEventType.SESSION_IDLE],
      transformPayload: (payload) => ({
        text: `Session ${payload.sessionId} is idle`,
      }),
    },
    // Discord for errors
    {
      url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
      events: [OpencodeEventType.ERROR_OCCURRED],
      transformPayload: (payload) => ({
        content: `Error: ${payload.error}`,
      }),
    },
    // Custom endpoint for all events
    {
      url: 'https://your-api.com/opencode-events',
      events: Object.values(OpencodeEventType),
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
      },
    },
  ],
});
```

### Conditional Webhooks

Use `shouldSend` to filter when webhooks are sent:

```typescript
{
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK',
  events: [OpencodeEventType.ERROR_OCCURRED],
  shouldSend: (payload) => {
    // Only send critical errors
    const errorMessage = payload.error || '';
    return errorMessage.includes('CRITICAL');
  },
  transformPayload: (payload) => ({
    text: `🚨 CRITICAL ERROR: ${payload.error}`,
  }),
}
```

### Custom Headers and Authentication

Add custom headers for authentication:

```typescript
{
  url: 'https://your-api.com/webhooks',
  events: [OpencodeEventType.BUILD_SUCCESS],
  headers: {
    'Authorization': 'Bearer YOUR_API_TOKEN',
    'X-Custom-Header': 'custom-value',
    'Content-Type': 'application/json',
  },
}
```

### Retry Configuration

Customize retry behavior for unreliable endpoints:

```typescript
{
  url: 'https://unreliable-endpoint.com/webhook',
  events: [OpencodeEventType.SESSION_START],
  retry: {
    maxAttempts: 5,      // Try up to 5 times
    delayMs: 2000,       // Wait 2 seconds between attempts (exponential backoff)
  },
  timeoutMs: 15000,      // 15 second timeout
}
```

## Platform-Specific Examples

### Slack

```typescript
{
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  events: [OpencodeEventType.BUILD_FAILED],
  transformPayload: (payload) => ({
    text: 'Build Failed',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Build Failed*\n\`\`\`${payload.error}\`\`\``,
        },
      },
    ],
  }),
}
```

### Discord

```typescript
{
  url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK',
  events: [OpencodeEventType.TEST_SUCCESS],
  transformPayload: (payload) => ({
    content: 'Tests passed!',
    embeds: [
      {
        title: 'Test Results',
        description: 'All tests passed successfully',
        color: 3066993, // Green
        timestamp: payload.timestamp,
      },
    ],
  }),
}
```

### Microsoft Teams

```typescript
{
  url: 'https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK',
  events: [OpencodeEventType.ERROR_OCCURRED],
  transformPayload: (payload) => ({
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: 'Error Occurred',
    themeColor: 'FF0000',
    title: 'Error in Opencode',
    sections: [
      {
        facts: [
          { name: 'Error', value: payload.error },
          { name: 'Session', value: payload.sessionId },
        ],
      },
    ],
  }),
}
```

## Development

### Building

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Running Examples

See the `examples/` directory for complete examples:

- `slack-idle-notification.ts` - Basic Slack notification on idle sessions
- `advanced-usage.ts` - Multiple webhooks with advanced features

## Debugging

Enable debug mode to see detailed logs:

```typescript
const webhookPlugin = createWebhookPlugin({
  webhooks: [...],
  debug: true,  // Enable debug logging
});
```

Debug output includes:
- Webhook registration
- Event handling
- HTTP requests and responses
- Retry attempts
- Errors and failures

## Error Handling

The plugin includes robust error handling:

- Automatic retries with exponential backoff
- Timeout protection
- Detailed error messages
- Non-blocking: webhook failures don't affect Opencode operation

## Type Definitions

Full TypeScript support with exported types:

```typescript
import {
  createWebhookPlugin,
  OpencodeEventType,
  WebhookConfig,
  WebhookPluginConfig,
  BaseEventPayload,
  WebhookResult,
  SlackMessage,
} from 'opencode-webhooks';
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Build the project
npm run build

# Watch mode for development
npm run watch

# Create npm package (build + pack)
npm run package
```

### GitHub Actions CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow** - Runs on push and pull requests
  - Lints code with ESLint
  - Runs tests on Node.js 18 and 20
  - Builds TypeScript
  - Creates and verifies npm package
  - Reports test coverage
  - Uploads package artifact

- **PR Checks** - Additional validation for pull requests
  - Type checking
  - Bundle size analysis
  - Coverage reporting

- **Release Workflow** - Automated publishing
  - Publishes to npm on GitHub releases
  - Creates release artifacts

### Code Quality

- **98% test coverage** - Comprehensive unit and integration tests
- **ESLint** - Strict TypeScript linting rules
- **TypeScript** - Full type safety
- **Jest** - Modern testing framework

## Publishing

### Automated Release Process

The package is automatically published to npm when a new GitHub release is created:

1. Update version: `npm version patch|minor|major`
2. Push changes: `git push && git push --tags`
3. Create a GitHub release with the version tag
4. The Release workflow automatically:
   - Verifies version matches release tag
   - Runs all tests and quality checks
   - Builds and publishes to npm with provenance
   - Uploads release assets
   - Creates a detailed release summary

See [RELEASE.md](./RELEASE.md) for detailed release instructions.

### NPM Package Verification

The CI pipeline includes npm publish verification:
- Dry-run publish on every build
- Package content validation
- Ensures publishability before release

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions:
- GitHub Issues: [opencode-webhooks](https://github.com/yourusername/opencode-webhooks)
- Documentation: [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins)
