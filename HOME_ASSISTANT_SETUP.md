# Home Assistant Setup Guide

Complete guide to set up and test the OpenCode webhook integration with Home Assistant.

## Prerequisites

- Home Assistant installed and accessible on your network
- Access to edit Home Assistant configuration files or use the UI

---

## Step 1: Create the Webhook in Home Assistant

### Option A: Using Home Assistant UI (Recommended)

1. Open Home Assistant web interface
2. Go to **Settings** → **Automations & Scenes**
3. Click **Create Automation** → **Start with an empty automation**
4. Click **Add Trigger** → **Webhook**
5. Set **Webhook ID** to: `opencode_done`
6. Click **Save**

### Option B: Using YAML Configuration

Add this to your `automations.yaml` file:

```yaml
- id: opencode_agent_completed
  alias: "OpenCode Agent Completed"
  description: "Notifies when OpenCode completes a task"
  trigger:
    - platform: webhook
      webhook_id: opencode_done
      allowed_methods:
        - POST
      local_only: false
  action:
    - service: notify.mobile_app_your_phone  # Change to your device name
      data:
        title: "{{ trigger.json.notification_title }}"
        message: "{{ trigger.json.notification_message }}"
        data:
          # Optional: Add action buttons
          actions:
            - action: "OPEN_OPENCODE"
              title: "Open OpenCode"
```

**Important:** Replace `notify.mobile_app_your_phone` with your actual notification service. To find it:
- Go to **Developer Tools** → **Services**
- Search for "notify."
- Your service will be something like `notify.mobile_app_pixel_6`

---

## Step 2: Test the Webhook

Before setting up the plugin, test that your webhook is working:

1. Update the URL in `test-home-assistant-simple.js`:
   ```javascript
   const HOME_ASSISTANT_URL = 'http://homeassistant.local:8123';  // or your HA URL
   const WEBHOOK_ID = 'opencode_done';
   ```

2. Run the test:
   ```bash
   node test-home-assistant-simple.js
   ```

3. Check your phone/device for a notification with:
   - **Title:** "OpenCode: Test Session - Home Assistant Integration"
   - **Message:** "I have successfully completed the task..."

### Troubleshooting Test

If the test fails:

- **Check Home Assistant URL**: Try `http://192.168.1.x:8123` with your actual IP
- **Verify webhook ID**: Make sure it matches exactly in both the automation and test script
- **Check automation status**: In Home Assistant → Automations, make sure the automation is enabled
- **View Home Assistant logs**: Settings → System → Logs to see webhook errors

---

## Step 3: Install the OpenCode Plugin

1. Copy the plugin file:
   ```bash
   cp examples/home-assistant.ts ~/.config/opencode/plugin/home-assistant.ts
   ```

2. Edit the configuration:
   ```bash
   nano ~/.config/opencode/plugin/home-assistant.ts
   ```

3. Update these values:
   ```typescript
   const HOME_ASSISTANT_URL = 'http://homeassistant.local:8123';  // Your HA URL
   const WEBHOOK_ID = 'opencode_done';
   ```

4. Restart OpenCode

---

## Step 4: Verify It's Working

1. Start an OpenCode session
2. Ask the agent to do something simple (e.g., "Create a hello world file")
3. Wait for the agent to complete
4. Check your phone for a notification from Home Assistant

The notification will include:
- Session title
- Agent's response (truncated to 500 chars)
- Timestamp

---

## Advanced: Using Token and Cost Data

The webhook includes token usage and cost information. You can use this in automations:

### Example: Track AI Costs

```yaml
- id: opencode_cost_tracker
  alias: "Track OpenCode Costs"
  trigger:
    - platform: webhook
      webhook_id: opencode_done
  action:
    # Log to a sensor
    - service: input_number.set_value
      target:
        entity_id: input_number.opencode_total_cost
      data:
        value: >
          {{ states('input_number.opencode_total_cost') | float + trigger.json.cost | float }}
    
    # Notify if cost is high
    - choose:
        - conditions:
            - condition: template
              value_template: "{{ trigger.json.cost | float > 0.10 }}"
          sequence:
            - service: notify.mobile_app_your_phone
              data:
                title: "⚠️ High OpenCode Cost"
                message: "Task cost ${{ trigger.json.cost }}"
```

### Example: Show Full Message on Demand

```yaml
- id: opencode_with_full_message
  alias: "OpenCode Completed (with full message)"
  trigger:
    - platform: webhook
      webhook_id: opencode_done
  action:
    - service: notify.mobile_app_your_phone
      data:
        title: "{{ trigger.json.notification_title }}"
        message: "{{ trigger.json.message_preview }}"
        data:
          # Show full message when tapped
          clickAction: "/lovelace/opencode"
          # Store full message in notification data
          tag: "opencode_{{ trigger.json.session_id }}"
          actions:
            - action: "VIEW_FULL_MESSAGE"
              title: "View Full Response"
```

---

## Available Webhook Data

The webhook sends the following data you can use in automations:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `event_type` | string | Always "opencode_agent_completed" | `"opencode_agent_completed"` |
| `session_id` | string | Unique session identifier | `"ses_abc123"` |
| `session_title` | string | Human-readable session name | `"My Project"` |
| `message_id` | string | Unique message identifier | `"msg_xyz789"` |
| `message_preview` | string | First 500 chars of response | `"I've completed..."` |
| `message_full` | string | Complete agent response | Full text |
| `tokens_input` | number | Input tokens used | `1500` |
| `tokens_output` | number | Output tokens used | `800` |
| `tokens_total` | number | Total tokens (input + output) | `2300` |
| `cost` | number | Cost in USD | `0.0275` |
| `notification_title` | string | Ready-to-use title | `"OpenCode: My Project"` |
| `notification_message` | string | Ready-to-use message (500 chars) | Same as preview |
| `timestamp` | string | ISO 8601 timestamp | `"2025-01-01T12:00:00Z"` |

### Template Examples

In Home Assistant automations, access data with:

```yaml
# Session title
{{ trigger.json.session_title }}

# Full message
{{ trigger.json.message_full }}

# Token usage
{{ trigger.json.tokens_total }} tokens used

# Cost in dollars
${{ trigger.json.cost }}

# Formatted cost
${{ "%.4f" | format(trigger.json.cost) }}
```

---

## Troubleshooting

### Plugin Not Sending Webhooks

1. **Check plugin is loaded**: Verify file is in `~/.config/opencode/plugin/home-assistant.ts`
2. **Enable debug mode**: Set `debug: true` in the plugin config
3. **Check OpenCode logs**: Look for `[Middleware]` log messages
4. **Restart OpenCode**: Make sure to restart after config changes

### Home Assistant Not Receiving

1. **Check automation is enabled**: Go to Settings → Automations
2. **Verify webhook ID matches**: Must be exactly `opencode_done`
3. **Check Home Assistant logs**: Settings → System → Logs
4. **Test with curl**:
   ```bash
   curl -X POST \
     http://homeassistant.local:8123/api/webhook/opencode_done \
     -H "Content-Type: application/json" \
     -d '{"test": "message"}'
   ```

### Notifications Not Appearing

1. **Verify notification service**: Check it exists in Developer Tools → Services
2. **Test notification manually**:
   ```yaml
   service: notify.mobile_app_your_phone
   data:
     title: "Test"
     message: "Test message"
   ```
3. **Check phone notification settings**: Make sure Home Assistant app can send notifications

---

## Need Help?

- Check the [Home Assistant Automation docs](https://www.home-assistant.io/docs/automation/)
- See the [Webhook trigger docs](https://www.home-assistant.io/docs/automation/trigger/#webhook-trigger)
- Open an issue at: https://github.com/sst/opencode-webhooks/issues
