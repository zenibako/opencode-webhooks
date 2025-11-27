import { AgentCompletedPayload, AGENT_COMPLETED_EVENT, PluginContext } from './types.js';
import * as path from 'path';

interface SessionState {
  parts: Map<string, string>;     // partId -> accumulated text (handles updates)
  assistantMessageIds: Set<string>; // Track which message IDs are from assistant
  lastMessageId?: string;
  lastAssistantInfo?: {
    tokens?: { input: number; output: number; reasoning: number };
    cost?: number;
  };
}

interface MiddlewareOptions {
  context: PluginContext;
  debug?: boolean;
  onComplete: (payload: AgentCompletedPayload) => Promise<void>;
}

/**
 * Middleware that tracks OpenCode events and emits AgentCompletedPayload
 * when the agent finishes working (session goes idle)
 */
export class AgentCompletionMiddleware {
  private sessions: Map<string, SessionState> = new Map();
  private context: PluginContext;
  private debug: boolean;
  private onComplete: (payload: AgentCompletedPayload) => Promise<void>;

  constructor(options: MiddlewareOptions) {
    this.context = options.context;
    this.debug = options.debug ?? false;
    this.onComplete = options.onComplete;
  }

  /**
   * Process incoming OpenCode events
   */
  async handleEvent(event: any): Promise<void> {
    const eventType = event.type;
    const properties = event.properties ?? event;

    switch (eventType) {
      case 'message.part.updated':
        this.handleMessagePartUpdated(properties);
        break;

      case 'message.updated':
        this.handleMessageUpdated(properties);
        break;

      case 'session.idle':
        await this.handleSessionIdle(properties);
        break;
    }
  }

  private handleMessagePartUpdated(props: any): void {
    const part = props.part;
    
    // Only track text parts
    if (part?.type !== 'text') return;
    
    const sessionId = part.sessionID;
    const messageId = part.messageID;
    
    if (!sessionId || !messageId) return;
    
    // Initialize session state if needed
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { 
        parts: new Map(),
        assistantMessageIds: new Set()
      });
    }
    
    const state = this.sessions.get(sessionId)!;
    
    // Only track text parts from assistant messages
    if (!state.assistantMessageIds.has(messageId)) {
      if (this.debug) {
        console.log(`[Middleware] Skipping text part from non-assistant message ${messageId}`);
      }
      return;
    }
    
    // Store/update the text for this message part
    // Using part.id as key handles streaming updates to the same part
    state.parts.set(part.id, part.text);
    state.lastMessageId = messageId;
    
    if (this.debug) {
      console.log(`[Middleware] Tracked text part for session ${sessionId}, message ${messageId}, part ${part.id}`);
    }
  }

  private handleMessageUpdated(props: any): void {
    const info = props.info;
    
    // Only track assistant messages for metadata (tokens, cost)
    if (info?.role !== 'assistant') return;
    
    const sessionId = info.sessionID;
    const messageId = info.id;
    if (!sessionId || !messageId) return;
    
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { 
        parts: new Map(),
        assistantMessageIds: new Set()
      });
    }
    
    const state = this.sessions.get(sessionId)!;
    
    // Track this message ID as an assistant message
    state.assistantMessageIds.add(messageId);
    
    state.lastAssistantInfo = {
      tokens: info.tokens,
      cost: info.cost,
    };
    
    if (this.debug) {
      console.log(`[Middleware] Tracked assistant message ${messageId} for session ${sessionId}`);
    }
  }

  private async handleSessionIdle(props: any): Promise<void> {
    const sessionId = props.sessionID;
    if (!sessionId) return;
    
    const state = this.sessions.get(sessionId);
    
    // No messages tracked since last idle - nothing to report
    if (!state || state.parts.size === 0) {
      if (this.debug) {
        console.log(`[Middleware] Session ${sessionId} idle but no messages to report`);
      }
      return;
    }
    
    try {
      // Get session title with fallbacks
      const sessionTitle = await this.getSessionTitle(sessionId);
      
      // Compile all text parts into single message with smart separators
      const messageContent = this.joinMessageParts(Array.from(state.parts.values()));
      
      const payload: AgentCompletedPayload = {
        timestamp: new Date().toISOString(),
        eventType: AGENT_COMPLETED_EVENT,
        sessionId,
        sessionTitle,
        messageContent,
        messageId: state.lastMessageId,
        tokens: state.lastAssistantInfo?.tokens,
        cost: state.lastAssistantInfo?.cost,
      };
      
      if (this.debug) {
        console.log(`[Middleware] Agent completed in "${sessionTitle}", message length: ${messageContent.length}`);
      }
      
      await this.onComplete(payload);
      
    } catch (error) {
      if (this.debug) {
        console.error(`[Middleware] Error handling session.idle:`, error);
      }
    } finally {
      // Clear session state for next round of messages
      this.sessions.delete(sessionId);
    }
  }

  private async getSessionTitle(sessionId: string): Promise<string> {
    try {
      // Try to fetch session from SDK
      const session = await this.context.client.session.get({
        path: { id: sessionId }
      });
      
      if (session?.title) {
        return session.title;
      }
    } catch (error) {
      if (this.debug) {
        console.log(`[Middleware] Could not fetch session title: ${error}`);
      }
    }
    
    // Fallback: use project directory name
    if (this.context.directory) {
      return path.basename(this.context.directory);
    }
    
    // Final fallback: session ID
    return sessionId;
  }

  /**
   * Intelligently join message parts with appropriate separators.
   * Adds line breaks between parts unless they flow naturally together.
   */
  private joinMessageParts(parts: string[]): string {
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].trim();
    
    let result = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const prevText = result.trimEnd();
      const nextText = parts[i].trimStart();
      
      // Skip empty parts
      if (!nextText) continue;
      
      // Check if previous part ends with sentence-ending punctuation or newline
      const endsCleanly = /[.!?\n]$/.test(prevText);
      // Check if next part starts with uppercase/special char (new thought)
      const startsNewThought = /^[A-Z#*\-\d]/.test(nextText);
      
      if (endsCleanly || startsNewThought) {
        result = prevText + '\n\n' + nextText;
      } else {
        // Parts flow together - just add a space if needed
        const needsSpace = !/\s$/.test(result) && !/^\s/.test(parts[i]);
        result = result + (needsSpace ? ' ' : '') + parts[i];
      }
    }
    
    return result.trim();
  }

  /**
   * Clear all tracked state (useful for cleanup)
   */
  destroy(): void {
    this.sessions.clear();
  }
}
