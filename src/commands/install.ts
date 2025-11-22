import { Command, Flags } from '@oclif/core';
import { input, confirm, select } from '@inquirer/prompts';
import { build } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export default class Install extends Command {
  static description = 'Install OpenCode webhooks plugin';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --url https://hooks.slack.com/workflows/T123/A456/789/abc --slack',
    '<%= config.bin %> <%= command.id %> --url https://your-webhook.com/api/events --debug',
  ];

  static flags = {
    url: Flags.string({
      char: 'u',
      description: 'Webhook URL (skips interactive prompts)',
    }),
    slack: Flags.boolean({
      char: 's',
      description: 'Use Slack message formatting',
      default: false,
    }),
    debug: Flags.boolean({
      char: 'd',
      description: 'Enable debug logging',
      default: false,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Custom output path for the plugin file',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Install);

    // If URL is provided, run in non-interactive mode
    if (flags.url) {
      await this.runNonInteractive({
        url: flags.url,
        slack: flags.slack,
        debug: flags.debug,
        output: flags.output,
      });
    } else {
      await this.runInteractive();
    }
  }

  private async runInteractive(): Promise<void> {
    this.log('\n🔧 OpenCode Webhooks Plugin Installer\n');

    // Ask about webhook type
    const webhookType = await select({
      message: 'Where do you want to send OpenCode events?',
      choices: [
        { name: 'Slack (via Workflow Builder)', value: 'slack' },
        { name: 'Custom webhook endpoint', value: 'custom' },
      ],
    });

    const useSlack = webhookType === 'slack';

    if (useSlack) {
      this.log('\n📚 To set up Slack Workflow Builder:');
      this.log('   1. Go to Workflow Builder in Slack');
      this.log('   2. Create a workflow with a Webhook trigger');
      this.log('   3. Add variables: eventType, sessionId, timestamp, message, eventInfo');
      this.log('   4. Add a "Send a message" step using those variables');
      this.log('   5. Publish and copy the webhook URL\n');
      this.log('   Full guide: https://slack.com/help/articles/360041352714\n');

      const ready = await confirm({
        message: 'Do you have your Slack webhook URL ready?',
        default: false,
      });

      if (!ready) {
        this.log('\n💡 The setup instructions are available at the URL above.\n');
      }
    }

    const webhookUrl = await input({
      message: useSlack ? 'Enter your Slack Workflow webhook URL:' : 'Enter your webhook endpoint URL:',
      validate: (value: string) => {
        if (!value || !value.startsWith('http')) {
          return 'Please provide a valid HTTP/HTTPS URL';
        }
        return true;
      },
    });

    const debug = await confirm({
      message: 'Enable debug logging?',
      default: false,
    });

    const useCustomPath = await confirm({
      message: 'Use custom output path?',
      default: false,
    });

    let outputPath: string;
    if (useCustomPath) {
      const customPath = await input({
        message: 'Enter output path:',
        default: './webhook.js',
      });
      outputPath = path.resolve(customPath);
    } else {
      const opencodeDir = path.join(os.homedir(), '.config', 'opencode', 'plugin');
      outputPath = path.join(opencodeDir, 'webhook.js');
    }

    await this.buildAndInstall(webhookUrl, useSlack, debug, outputPath);
  }

  private async runNonInteractive(flags: {
    url: string;
    slack: boolean;
    debug: boolean;
    output?: string;
  }): Promise<void> {
    const outputPath =
      flags.output ||
      path.join(os.homedir(), '.config', 'opencode', 'plugin', 'webhook.js');

    await this.buildAndInstall(
      flags.url,
      flags.slack,
      flags.debug,
      path.resolve(outputPath)
    );
  }

  private async buildAndInstall(
    webhookUrl: string,
    useSlack: boolean,
    debug: boolean,
    outputPath: string
  ): Promise<void> {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a temporary entry file with the user's configuration
    const tempDir = path.join(process.cwd(), '.temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempEntryPath = path.join(tempDir, 'plugin-entry.ts');
    const entryContent = this.generateEntryFile(webhookUrl, useSlack, debug);
    fs.writeFileSync(tempEntryPath, entryContent, 'utf8');

    // Build the plugin using esbuild
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

      this.log(`
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

${useSlack ? `💡 Slack Setup:
   When you trigger your first OpenCode event, your webhook will receive
   structured data that you can use in your Workflow Builder.
   
   Quick reference: https://slack.com/help/articles/360041352714
` : ''}
📚 Documentation: See README.md for event types and payload formats
`);
    } catch (error) {
      // Clean up temp directory on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      this.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateEntryFile(url: string, slack: boolean, debugMode: boolean): string {
    const slackTransform = slack
      ? `
      // Transform payload for Slack Workflow Builder
      transformPayload: (payload) => {
        const eventEmojis = {
          'session.created': '🆕',
          'session.idle': '💤',
          'session.deleted': '🗑️',
          'session.error': '❌',
          'session.resumed': '▶️',
        };

        const eventDescriptions = {
          'session.created': 'A new OpenCode session has been created',
          'session.idle': 'The OpenCode session has become idle',
          'session.deleted': 'An OpenCode session has been deleted',
          'session.error': 'An error occurred in the OpenCode session',
          'session.resumed': 'The OpenCode session has resumed activity',
        };

        const emoji = eventEmojis[payload.eventType] || '📢';
        const description = eventDescriptions[payload.eventType] || 'OpenCode event triggered';
        const availableKeys = Object.keys(payload);
        
        // Flatten payload to top level for Slack Workflow Builder
        return {
          eventType: payload.eventType,
          sessionId: payload.sessionId || 'N/A',
          timestamp: payload.timestamp,
          message: \`\${emoji} \${payload.eventType}\`,
          eventInfo: \`\${description}\\n\\nAvailable data: \${availableKeys.join(', ')}\`,
          ...payload,
        };
      },`
      : '';

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
}
