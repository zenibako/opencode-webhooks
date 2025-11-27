# Quick Test Instructions

## 🚀 Quick Test (2 minutes)

1. **Edit the test script:**
   ```bash
   nano test-home-assistant-simple.js
   ```
   
   Update line 10 with your Home Assistant URL:
   ```javascript
   const HOME_ASSISTANT_URL = 'http://192.168.1.100:8123';  // Your actual IP
   ```

2. **Run the test:**
   ```bash
   node test-home-assistant-simple.js
   ```

3. **Check your phone** for a notification!

## 📱 Expected Notification

- **Title:** "OpenCode: Test Session - Home Assistant Integration"
- **Message:** "I have successfully completed the task you requested..."
- **Data includes:** 2300 tokens, $0.0275 cost

## ❌ If It Doesn't Work

### Test 1: Can you reach Home Assistant?
```bash
curl http://homeassistant.local:8123
```
Should return HTML. If not, use your HA's IP address instead.

### Test 2: Is the webhook set up?

In Home Assistant:
1. Go to **Settings** → **Automations & Scenes**
2. Look for "OpenCode Agent Completed" automation
3. Make sure it's **enabled** (toggle on the right)

### Test 3: Try a manual webhook test

```bash
curl -X POST \
  http://homeassistant.local:8123/api/webhook/opencode_done \
  -H "Content-Type: application/json" \
  -d '{"notification_title": "Test", "notification_message": "Testing webhook"}'
```

You should get a notification on your phone.

## 📖 Full Setup Guide

See `HOME_ASSISTANT_SETUP.md` for complete instructions including:
- Creating the automation in Home Assistant
- Configuring the OpenCode plugin
- Advanced automation examples
- Troubleshooting guide

## 🆘 Still Having Issues?

1. Enable debug mode in the test script (already enabled)
2. Check Home Assistant logs: **Settings** → **System** → **Logs**
3. Look for webhook errors
4. Make sure your notification service name is correct in the automation

Common service names:
- `notify.mobile_app_your_phone` (iOS/Android app)
- `notify.mobile_app_pixel_6` (specific device)
- `notify.persistent_notification` (HA UI notifications)

Find yours: **Developer Tools** → **Services** → search "notify"
