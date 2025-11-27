# Smart Separator Logic for Message Parts

## Problem
Assistant messages consist of multiple text parts that are streamed and updated. Previously, these parts were joined with an empty string (`join('')`), causing awkward concatenation:

**Before:**
```
I'll check the trace file.I can see the issue!Here's the fix.
```

## Solution
Implemented intelligent separator logic that adds appropriate spacing based on context:

**After:**
```
I'll check the trace file.

I can see the issue!

Here's the fix.
```

## How It Works

The `joinMessageParts()` helper method analyzes each pair of adjacent parts:

### Decision Logic

| Previous Part Ends With | Next Part Starts With | Separator | Example |
|------------------------|----------------------|-----------|---------|
| `.` `!` `?` `\n` | anything | `\n\n` | `task.` + `I can` → `task.\n\nI can` |
| anything | `A-Z` `#` `*` `-` `0-9` | `\n\n` | `doing` + `Here's` → `doing\n\nHere's` |
| no punctuation | lowercase | ` ` | `working on` + `the fix` → `working on the fix` |

### Key Features

1. **Sentence boundaries**: Text ending with `.`, `!`, or `?` gets a double line break
2. **New thoughts**: Parts starting with uppercase or special characters (headers, lists) get separated
3. **Continuous flow**: Mid-sentence parts are joined with a single space
4. **Clean output**: Final result is trimmed of leading/trailing whitespace
5. **Empty handling**: Empty parts are skipped entirely

## Implementation

### Code Location
`src/middleware.ts` - Lines 202-233

### Key Method
```typescript
private joinMessageParts(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].trim();
  
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const prevText = result.trimEnd();
    const nextText = parts[i].trimStart();
    
    if (!nextText) continue;
    
    const endsCleanly = /[.!?\n]$/.test(prevText);
    const startsNewThought = /^[A-Z#*\-\d]/.test(nextText);
    
    if (endsCleanly || startsNewThought) {
      result = prevText + '\n\n' + nextText;
    } else {
      const needsSpace = !/\s$/.test(result) && !/^\s/.test(parts[i]);
      result = result + (needsSpace ? ' ' : '') + parts[i];
    }
  }
  
  return result.trim();
}
```

## Testing

### Test Coverage
- **68 total tests pass** (2 new tests added)
- `should join message parts with smart separators` - Verifies sentence-ending behavior
- `should flow continuous text together without breaks` - Verifies mid-sentence flow
- Updated existing accumulation test to expect smart separators

### Example Test Cases

**Test 1: Sentence boundaries**
```typescript
Input:  ['I completed the first task.', 'Now working on the second task.']
Output: 'I completed the first task.\n\nNow working on the second task.'
```

**Test 2: Continuous flow**
```typescript
Input:  ['I am working on', 'the implementation now.']
Output: 'I am working on the implementation now.'
```

**Test 3: Mixed (from manual test)**
```typescript
Input:  ["I'll check the trace file.", "I can see the issue!", "Here's the", "fix."]
Output: "I'll check the trace file.\n\nI can see the issue!\n\nHere's the fix."
```

## Impact on Notifications

### Home Assistant Example

**Before (awkward):**
```
Session: opencode-webhooks
Message: I'll check the trace file.I can see the issue!Let me fix this:Now...
```

**After (readable):**
```
Session: opencode-webhooks
Message: I'll check the trace file.

I can see the issue!

Let me fix this:

Now...
```

### Character Count
Double line breaks add minimal overhead (2 chars per separator) while dramatically improving readability for long messages.

## Edge Cases Handled

1. **Empty parts**: Skipped entirely (no extra spaces)
2. **Already-spaced parts**: Won't add duplicate spaces
3. **Single part**: Returned trimmed without processing
4. **Zero parts**: Returns empty string
5. **Markdown syntax**: Headers (`#`), lists (`*`, `-`), numbered lists get proper separation
6. **Code blocks**: Uppercase detection helps separate code comments
7. **Mixed punctuation**: All common sentence endings handled (`.`, `!`, `?`)

## Performance

- **O(n)** complexity where n = number of parts
- Regex checks are simple and fast
- Minimal memory allocation (single result string)
- Typical messages have 1-10 parts, so overhead is negligible

## Future Enhancements

Potential improvements if needed:
- Detect code block boundaries (` ``` `)
- Handle multi-line breaks (preserve existing `\n\n`)
- Configurable separator style (single vs double breaks)
- Language-specific punctuation rules

## Migration Notes

**Breaking Change**: The message content format has changed. If you have automations that expect concatenated text without separators, they may need updates.

**Mitigation**: The change only affects the `messageContent` field. All other fields (tokens, cost, sessionTitle) are unchanged. Most automations won't be affected since they typically display the message as-is.

---

**Commit**: `feat: add smart separator logic for message parts` (625ea10b)
**Date**: 2025-12-09
**Tests**: 68 passing (2 new middleware tests)
