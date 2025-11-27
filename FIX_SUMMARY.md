# Fix Summary: Filter Out User Messages

## Problem
The middleware was concatenating **user message text** with **assistant message text**, resulting in notifications containing both:

**Example from trace:**
```
"Do somethingI'll create a simple test file..."
```
- "Do something" = user's input
- "I'll create..." = assistant's response

## Root Cause
The middleware in `src/middleware.ts` tracked ALL text parts from `message.part.updated` events, regardless of whether they came from user or assistant messages. It only filtered by `part.type !== 'text'` but didn't check message role.

## Solution
Updated the middleware to:

1. **Track assistant message IDs**: When `message.updated` event has `role === 'assistant'`, store that message ID in a Set
2. **Filter text parts**: In `message.part.updated`, only track parts where `part.messageID` is in the assistant message IDs Set
3. **Skip user messages**: Text parts from user messages are now logged and skipped

### Code Changes

**`src/middleware.ts`:**
- Added `assistantMessageIds: Set<string>` to `SessionState` interface
- In `handleMessageUpdated()`: Track assistant message IDs when role='assistant'
- In `handleMessagePartUpdated()`: Only track parts from assistant messages

**`tests/middleware.test.ts`:**
- Updated all 12 tests to send `message.updated` BEFORE `message.part.updated`
- Enhanced "should ignore user messages" test to verify filtering works

## Verification

✅ All 66 tests pass
✅ Created `test-user-filter.mjs` to verify user messages are filtered out
✅ Debug logs show: `[Middleware] Skipping text part from non-assistant message user-msg`

## What's Next

The fix is already deployed since your plugin at:
```
~/.config/opencode/plugin/home-assistant.ts
```

Uses the local dev version:
```typescript
import { createAgentNotificationPlugin } from '/Users/chanderson/Projects/opencode-webhooks/dist/index.js';
```

**To test:**
1. Restart OpenCode (to reload the plugin with the updated dist/)
2. Ask OpenCode to do something simple
3. Check your iPhone notification - it should only contain the assistant's response, not your request

## Debug Output
With `debug: true` in your plugin config, you'll see logs like:
```
[Middleware] Skipping text part from non-assistant message <user-msg-id>
[Middleware] Tracked assistant message <assistant-msg-id> for session <session-id>
[Middleware] Tracked text part for session <session-id>, message <assistant-msg-id>, part <part-id>
```
