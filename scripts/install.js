#!/usr/bin/env node

/**
 * OpenCode Webhooks Installation Script
 * 
 * This script generates a standalone plugin file that can be used directly with OpenCode.
 * It bundles all necessary code (including dependencies) into a single file using esbuild.
 * 
 * Usage:
 *   node scripts/install.js <webhook-url> [--slack] [--debug]
 *   
 * Examples:
 *   node scripts/install.js https://hooks.slack.com/services/YOUR/WEBHOOK/URL --slack --debug
 *   node scripts/install.js https://your-webhook.com/api/events
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { build } = require('esbuild');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
OpenCode Webhooks Plugin Installer
==================================

Usage:
  node scripts/install.js <webhook-url> [options]

Arguments:
  webhook-url    Your webhook endpoint URL (required)

Options:
  --slack        Use Slack message formatting
  --debug        Enable debug logging
  --output PATH  Custom output path (default: ~/.opencode/plugins/webhook.js)
  --help, -h     Show this help message

Examples:
  # Install with Slack formatting
  node scripts/install.js https://hooks.slack.com/services/YOUR/WEBHOOK/URL --slack --debug

  # Install basic webhook
  node scripts/install.js https://your-webhook.com/api/events

  # Install to custom location
  node scripts/install.js https://your-webhook.com/api/events --output ./my-plugin.js
`);
  process.exit(0);
}

const webhookUrl = args[0];
const useSlack = args.includes('--slack');
const debug = args.includes('--debug');

// Determine output path
let outputPath;
const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) {
  outputPath = path.resolve(args[outputIndex + 1]);
} else {
  const opencodeDir = path.join(os.homedir(), '.config', 'opencode', 'plugin');
  outputPath = path.join(opencodeDir, 'webhook.js');
}

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a temporary entry file with the user's configuration
const tempDir = path.join(__dirname, '..', '.temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const tempEntryPath = path.join(tempDir, 'plugin-entry.ts');
const entryContent = generateEntryFile(webhookUrl, useSlack, debug);
fs.writeFileSync(tempEntryPath, entryContent, 'utf8');

// Build the plugin using esbuild
async function buildPlugin() {
  try {
    await build({
      entryPoints: [tempEntryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: outputPath,
      external: [],
      minify: false,
      sourcemap: false,
      target: 'node18',
      banner: {
        js: `/**
 * OpenCode Webhooks Plugin
 * Auto-generated standalone file
 * 
 * Configuration:
 * - Webhook URL: ${webhookUrl}
 * - Slack formatting: ${useSlack}
 * - Debug mode: ${debug}
 * 
 * Generated: ${new Date().toISOString()}
 */
`,
      },
    });

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`
✅ OpenCode Webhooks plugin installed successfully!

📁 Location: ${outputPath}

🔧 Configuration:
   Webhook URL: ${webhookUrl}
   Slack format: ${useSlack ? 'Yes' : 'No'}
   Debug mode: ${debug ? 'Yes' : 'No'}

📝 Next steps:
   1. Restart OpenCode or reload plugins
   2. The plugin will automatically send events to your webhook
   3. Check the debug output if you enabled --debug

💡 To customize the plugin:
   - Regenerate with different options using this script
   - Or manually edit ${outputPath}

📚 Documentation: See README.md for event types and payload formats
`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    
    // Clean up temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

// Run the build and ensure we wait for it
buildPlugin().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

// ============================================================================
// Helper functions
// ============================================================================

function generateEntryFile(url, slack, debugMode) {
  const slackTransform = slack ? `
      // Transform payload for Slack
      transformPayload: (payload) => {
        const eventEmojis = {
          'session.created': '🆕',
          'session.idle': '💤',
          'session.deleted': '🗑️',
          'session.error': '❌',
          'session.resumed': '▶️',
        };

        const emoji = eventEmojis[payload.eventType] || '📢';
        
        return {
          text: \`\${emoji} OpenCode Event: \${payload.eventType}\`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: \`\${emoji} \${payload.eventType}\`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: \`*Session ID:*\\n\${payload.sessionId || 'N/A'}\`,
                },
                {
                  type: 'mrkdwn',
                  text: \`*Timestamp:*\\n\${payload.timestamp}\`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: \`*Details:*\\n\\\`\\\`\\\`\\n\${JSON.stringify(payload, null, 2)}\\n\\\`\\\`\\\`\`,
              },
            },
          ],
        };
      },` : '';

  return `import { createWebhookPlugin } from '../src/index';

const webhookPlugin = createWebhookPlugin({
  webhooks: [
    {
      url: '${url}',
      events: [
        'session.created',
        'session.idle', 
        'session.deleted',
        'session.error',
        'session.resumed',
      ],${slackTransform}
    },
  ],
  debug: ${debugMode},
});

export default webhookPlugin;
`;
}
