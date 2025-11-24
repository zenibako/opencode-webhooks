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

### Option 1: Install via npm (Recommended)

OpenCode uses Bun to load plugins, which resolves dependencies from the **parent directory** of your plugin files. This means the plugin must be installed in `~/.config/opencode/plugin/node_modules/`.

```bash
# Navigate to the OpenCode plugins directory
cd ~/.config/opencode/plugin

# Initialize package.json if it doesn't exist
npm init -y

# Install the plugin - Bun will find it from parent folder
npm install opencode-webhooks

# Copy an example to your plugins directory
cp node_modules/opencode-webhooks/examples/slack-workflow.ts ./

# Edit the file to add your webhook URL
nano slack-workflow.ts

# Restart OpenCode
```

**How Bun finds the module:**
- Your plugin file: `~/.config/opencode/plugin/slack-workflow.ts`
- Bun looks up from the plugin file's directory
- Finds: `~/.config/opencode/plugin/node_modules/opencode-webhooks`
- Import works: `import { createWebhookPlugin } from 'opencode-webhooks';`

### Option 2: Clone for Development

For local development or contributing to the plugin:

```bash
# Clone directly into the plugins directory
cd ~/.config/opencode/plugin
git clone https://github.com/zenibako/opencode-webhooks.git

# Install dependencies for the cloned repo
cd opencode-webhooks
npm install
cd ..

# Copy an example to the plugin root (parent of opencode-webhooks/)
cp opencode-webhooks/examples/local-dev.ts ./webhook.ts

# Edit the file to add your webhook URL
nano webhook.ts

# Restart OpenCode
```

> **Important:** Global npm installs (`npm install -g`) will **not** work because Bun resolves modules relative to the plugin file's location, not from global paths.

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
import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

const SlackWebhook: Plugin = createWebhookPlugin({
  webhooks: [
    {
      url: 'https://hooks.slack.com/workflows/T123/A456/789/abc',
      events: ['session.created', 'session.idle', 'session.error'],
      transformPayload: (payload) => ({
        ...payload,
        eventType: payload.eventType,
        sessionId: payload.sessionId || 'N/A',
        timestamp: payload.timestamp,
        message: `🔔 ${payload.eventType}`,
        eventInfo: `Event: ${payload.eventType}`,
      }),
    },
  ],
});

export default SlackWebhook;
```

> **Important:** The `Plugin` type annotation is required for OpenCode to properly load your plugin. The `@opencode-ai/plugin` module is provided by OpenCode's runtime.

3. **Restart OpenCode** - The plugin will automatically load and start sending events!

### Custom Webhook Endpoint

```typescript
// ~/.config/opencode/plugin/custom-webhook.ts
import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

const CustomWebhook: Plugin = createWebhookPlugin({
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

export default CustomWebhook;
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
import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

const MyWebhook: Plugin = createWebhookPlugin({
  webhooks: [
    {
      url: 'https://your-webhook.com',
      events: ['session.created'],
    },
  ],
});

export default MyWebhook;
```

### Advanced Configuration

```typescript
import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

const AdvancedWebhook: Plugin = createWebhookPlugin({
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

export default AdvancedWebhook;
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
import type { Plugin } from '@opencode-ai/plugin';
import { 
  createWebhookPlugin, 
  OpencodeEventType, 
  BaseEventPayload 
} from 'opencode-webhooks';

const MyPlugin: Plugin = createWebhookPlugin({
  webhooks: [{
    url: 'https://example.com',
    events: [OpencodeEventType.SESSION_CREATED],
    transformPayload: (payload: BaseEventPayload) => ({
      ...payload,
      customField: 'value',
    }),
  }],
});

export default MyPlugin;
```

### Required Plugin Pattern

All OpenCode plugins must follow this pattern:

```typescript
import type { Plugin } from '@opencode-ai/plugin';

const MyPlugin: Plugin = /* your plugin implementation */;

export default MyPlugin;
```

The `Plugin` type ensures OpenCode can properly initialize and run your plugin. The `@opencode-ai/plugin` module is provided by OpenCode's Bun runtime environment.

## Troubleshooting

### Enable Debug Logging

```typescript
import type { Plugin } from '@opencode-ai/plugin';
import { createWebhookPlugin } from 'opencode-webhooks';

const DebugWebhook: Plugin = createWebhookPlugin({
  webhooks: [/* ... */],
  debug: true,  // Enable debug logging
});

export default DebugWebhook;
```

Debug output includes:
- Webhook registration
- Event handling
- HTTP requests and responses
- Retry attempts
- Errors and failures

### Common Issues

**Plugin not loading or SIGTRAP errors:**
- ✅ **MUST install in parent directory**: `cd ~/.config/opencode/plugin && npm install opencode-webhooks`
- ❌ **Global installs DON'T work**: Bun resolves from parent directory, not global paths
- ✅ **Include Plugin type**: `import type { Plugin } from '@opencode-ai/plugin';`
- ✅ **Use named export pattern**: 
  ```typescript
  const MyPlugin: Plugin = createWebhookPlugin({...});
  export default MyPlugin;
  ```
- Check the file is in `~/.config/opencode/plugin/` with `.ts` extension
- Restart OpenCode after making changes

**Module resolution errors:**
```
Cannot find module 'opencode-webhooks'
```
- Bun looks for modules in the **parent directory** of your plugin file
- Your plugin: `~/.config/opencode/plugin/my-webhook.ts`
- Bun searches: `~/.config/opencode/plugin/node_modules/opencode-webhooks`
- Solution: Ensure you ran `npm install` in `~/.config/opencode/plugin/`

**@opencode-ai/plugin not found:**
- This module is provided by OpenCode's runtime
- Only use it as a type import: `import type { Plugin } from '@opencode-ai/plugin';`
- Don't try to install it separately

**Webhooks not sending:**
- Check the webhook URL is correct
- Enable debug mode to see detailed logs: `debug: true`
- Verify the events you're listening for are actually firing
- Check network connectivity

**Import patterns:**
- ✅ Installed via npm: `import { createWebhookPlugin } from 'opencode-webhooks';`
- ✅ Local clone: `import { createWebhookPlugin } from './opencode-webhooks/src/index.js';`
- Make sure `package.json` exists in `~/.config/opencode/plugin/` (create with `npm init -y`)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
