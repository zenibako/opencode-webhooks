# OpenCode Webhooks

[![CI](https://github.com/zenibako/opencode-webhooks/actions/workflows/ci.yml/badge.svg)](https://github.com/zenibako/opencode-webhooks/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/opencode-webhooks.svg)](https://badge.fury.io/js/opencode-webhooks)

Send webhook notifications for any OpenCode event. Perfect for integrating with Slack, Discord, Microsoft Teams, or any custom webhook endpoint.

## Features

- 🚀 **Zero build step** - Run directly with TypeScript via OpenCode's Bun runtime
- 🔔 Send webhooks on any OpenCode event (session, tool, file, LSP events)
- 🎯 Multiple webhook configurations with different destinations
- 🔄 Custom payload transformations for each webhook
- 🎛️ Filtering logic to control when webhooks are sent
- ♻️ Automatic retry logic with exponential backoff
- 📝 Full TypeScript support
- 🐛 Debug logging for troubleshooting
- 💬 Built-in Slack Workflow Builder integration

## Installation

### Option 1: Install from NPM (Recommended)

```bash
# Install globally
npm install -g opencode-webhooks

# Copy an example to your plugins directory
cp $(npm root -g)/opencode-webhooks/examples/slack-workflow.ts ~/.config/opencode/plugin/

# Edit the file to add your webhook URL
nano ~/.config/opencode/plugin/slack-workflow.ts

# Restart OpenCode
```

### Option 2: Clone to Plugins Directory

```bash
# Clone directly into the plugins directory
cd ~/.config/opencode/plugin
git clone https://github.com/yourusername/opencode-webhooks.git

# Copy an example to the plugin root
cp opencode-webhooks/examples/local-dev.ts ./webhook.ts

# Edit the file to add your webhook URL
nano webhook.ts

# Restart OpenCode
```

## Quick Start

### Slack Workflow Builder Integration

1. **Set up Slack Workflow:**
   - Open Slack → Workflow Builder → Create workflow
   - Choose **Webhook** as the trigger
   - Add variables: `eventType`, `sessionId`, `timestamp`, `message`, `eventInfo`
   - Add a "Send message" step using those variables
   - Publish and copy the webhook URL
   - [Full guide](https://slack.com/help/articles/360041352714)

2. **Configure the plugin:**

```typescript
// ~/.config/opencode/plugin/slack-webhook.ts
import { createWebhookPlugin } from 'opencode-webhooks';

export default createWebhookPlugin({
  webhooks: [
    {
      url: 'https://hooks.slack.com/workflows/T123/A456/789/abc',
      events: ['session.created', 'session.idle', 'session.error'],
      transformPayload: (payload) => ({
        eventType: payload.eventType,
        sessionId: payload.sessionId || 'N/A',
        timestamp: payload.timestamp,
        message: `🔔 ${payload.eventType}`,
        eventInfo: `Event: ${payload.eventType}`,
        ...payload,
      }),
    },
  ],
});
```

3. **Restart OpenCode** - The plugin will automatically load and start sending events!

### Custom Webhook Endpoint

```typescript
// ~/.config/opencode/plugin/custom-webhook.ts
import { createWebhookPlugin } from 'opencode-webhooks';

export default createWebhookPlugin({
  webhooks: [
    {
      url: 'https://your-endpoint.com/api/events',
      events: ['session.created', 'session.error'],
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
      },
    },
  ],
  debug: true,
});
```

## Available Events

```typescript
// Session events
'session.created'
'session.updated'
'session.idle'
'session.error'
'session.deleted'
'session.compacted'
'session.status'
'session.diff'
'session.resumed'

// Tool events
'tool.execute.before'
'tool.execute.after'

// Message events
'message.updated'
'message.removed'
'message.part.updated'
'message.part.removed'

// File events
'file.edited'
'file.watcher.updated'

// Command events
'command.executed'

// LSP events
'lsp.updated'
'lsp.client.diagnostics'

// Other events
'installation.updated'
'permission.updated'
'permission.replied'
'server.connected'
'todo.updated'
'tui.prompt.append'
'tui.command.execute'
'tui.toast.show'
```

## Configuration

### Basic Configuration

```typescript
import { createWebhookPlugin } from 'opencode-webhooks';

export default createWebhookPlugin({
  webhooks: [
    {
      url: 'https://your-webhook.com',
      events: ['session.created'],
    },
  ],
});
```

### Advanced Configuration

```typescript
import { createWebhookPlugin } from 'opencode-webhooks';

export default createWebhookPlugin({
  webhooks: [
    {
      // Webhook URL (required)
      url: 'https://your-webhook.com',
      
      // Events to send (required)
      events: ['session.created', 'session.error'],
      
      // HTTP method (optional, default: POST)
      method: 'POST',
      
      // Custom headers (optional)
      headers: {
        'Authorization': 'Bearer TOKEN',
        'X-Custom-Header': 'value',
      },
      
      // Transform payload before sending (optional)
      transformPayload: (payload) => ({
        ...payload,
        customField: 'value',
      }),
      
      // Filter events (optional)
      shouldSend: (payload) => {
        // Only send errors from specific sessions
        return payload.eventType === 'session.error';
      },
      
      // Retry configuration (optional)
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      
      // Request timeout (optional, default: 10000ms)
      timeoutMs: 5000,
    },
  ],
  
  // Global debug mode (optional, default: false)
  debug: true,
  
  // Global timeout (optional)
  defaultTimeoutMs: 10000,
  
  // Global retry config (optional)
  defaultRetry: {
    maxAttempts: 3,
    delayMs: 1000,
  },
});
```

## Examples

The `examples/` directory contains ready-to-use configurations:

- **[slack-workflow.ts](./examples/slack-workflow.ts)** - Slack Workflow Builder integration
- **[custom-webhook.ts](./examples/custom-webhook.ts)** - Custom webhook endpoint
- **[local-dev.ts](./examples/local-dev.ts)** - Local development setup

Simply copy an example to `~/.config/opencode/plugin/`, edit the configuration, and restart OpenCode.

## Event Payload

All events include these base fields:

```typescript
{
  timestamp: string;        // ISO 8601 timestamp
  eventType: string;        // Event type (e.g., "session.created")
  sessionId?: string;       // Session identifier (if applicable)
  userId?: string;          // User identifier (if applicable)
  // ... additional event-specific fields
}
```

### Slack Workflow Builder Payload

When using the Slack integration example, events are transformed to:

```typescript
{
  eventType: "session.created",
  sessionId: "abc123",
  timestamp: "2025-11-22T12:00:00Z",
  message: "🆕 session.created",
  eventInfo: "A new OpenCode session has been created\n\nAvailable data: eventType, sessionId, timestamp",
  // ... all original fields
}
```

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/opencode-webhooks.git
cd opencode-webhooks

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
npm run lint:fix
```

## TypeScript Support

This package is written in TypeScript and provides full type definitions. OpenCode runs it directly via Bun without any build step.

```typescript
import { createWebhookPlugin, OpencodeEventType, BaseEventPayload } from 'opencode-webhooks';

const plugin = createWebhookPlugin({
  webhooks: [{
    url: 'https://example.com',
    events: [OpencodeEventType.SESSION_CREATED],
    transformPayload: (payload: BaseEventPayload) => payload,
  }],
});
```

## Troubleshooting

### Enable Debug Logging

```typescript
export default createWebhookPlugin({
  webhooks: [/* ... */],
  debug: true,  // Enable debug logging
});
```

Debug output includes:
- Webhook registration
- Event handling
- HTTP requests and responses
- Retry attempts
- Errors and failures

### Common Issues

**Plugin not loading:**
- Ensure the file is in `~/.config/opencode/plugin/`
- Check the file has a `.ts` extension
- Verify it exports a plugin using `export default`
- Restart OpenCode after making changes

**Webhooks not sending:**
- Check the webhook URL is correct
- Enable debug mode to see detailed logs
- Verify the events you're listening for are actually firing
- Check network connectivity

**TypeScript errors:**
- If using NPM global install, the import should be `from 'opencode-webhooks'`
- If using local clone, the import should be `from './opencode-webhooks/src/index.ts'`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
