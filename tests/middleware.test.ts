import { AgentCompletionMiddleware } from '../src/middleware';
import { AgentCompletedPayload } from '../src/types';

describe('AgentCompletionMiddleware', () => {
  let onCompleteMock: jest.Mock;
  let mockContext: any;

  beforeEach(() => {
    onCompleteMock = jest.fn().mockResolvedValue(undefined);
    mockContext = {
      client: {
        session: {
          get: jest.fn().mockResolvedValue({ title: 'Test Session' }),
        },
      },
      directory: '/home/user/my-project',
      project: { id: 'project-1' },
      worktree: '/home/user/my-project',
      $: jest.fn(),
    };
  });

  describe('message tracking', () => {
    it('should emit payload on session.idle after message.part.updated', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // First, establish that msg-1 is an assistant message
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 'session-123',
            id: 'msg-1',
          },
        },
      });

      // Simulate message part update
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'Hello, I completed the task!',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      // Simulate session idle
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent.completed',
          sessionId: 'session-123',
          sessionTitle: 'Test Session',
          messageContent: 'Hello, I completed the task!',
          messageId: 'msg-1',
        })
      );
    });

    it('should accumulate multiple message parts', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // First, establish that msg-1 is an assistant message
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 'session-123',
            id: 'msg-1',
          },
        },
      });

      // Simulate multiple message parts
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'First part. ',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-2',
            type: 'text',
            text: 'Second part.',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messageContent: 'First part.\n\nSecond part.',
        })
      );
    });

    it('should join message parts with smart separators', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // Establish assistant message
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 'session-123',
            id: 'msg-1',
          },
        },
      });

      // Part 1: Ends with period (should add line break after)
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'I completed the first task.',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      // Part 2: Starts with uppercase (new thought)
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-2',
            type: 'text',
            text: 'Now working on the second task.',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messageContent: 'I completed the first task.\n\nNow working on the second task.',
        })
      );
    });

    it('should flow continuous text together without breaks', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 'session-123',
            id: 'msg-1',
          },
        },
      });

      // Part 1: Ends mid-sentence (no punctuation)
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'I am working on',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      // Part 2: Continues with lowercase (same thought)
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-2',
            type: 'text',
            text: 'the implementation now.',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messageContent: 'I am working on the implementation now.',
        })
      );
    });

    it('should not emit if no messages since last idle', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).not.toHaveBeenCalled();
    });

    it('should ignore non-text parts', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // Simulate non-text part
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'tool_use',
            sessionID: 'session-123',
            messageID: 'msg-1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-123' },
      });

      expect(onCompleteMock).not.toHaveBeenCalled();
    });
  });

  describe('session state management', () => {
    it('should clear state after idle and track new messages separately', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // First round
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'First message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Second round - should only include new messages
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm2',
          },
        },
      });
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p2',
            type: 'text',
            text: 'Second message',
            sessionID: 's1',
            messageID: 'm2',
          },
        },
      });
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(2);
      expect(onCompleteMock.mock.calls[0][0].messageContent).toBe('First message');
      expect(onCompleteMock.mock.calls[1][0].messageContent).toBe('Second message');
    });

    it('should handle multiple sessions independently', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // Session 1
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Session 1 message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      // Session 2
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's2',
            id: 'm2',
          },
        },
      });
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p2',
            type: 'text',
            text: 'Session 2 message',
            sessionID: 's2',
            messageID: 'm2',
          },
        },
      });

      // Complete session 1
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      expect(onCompleteMock.mock.calls[0][0].messageContent).toBe('Session 1 message');

      // Complete session 2
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's2' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(2);
      expect(onCompleteMock.mock.calls[1][0].messageContent).toBe('Session 2 message');
    });
  });

  describe('message metadata tracking', () => {
    it('should include token usage from message.updated', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
            tokens: { input: 100, output: 50, reasoning: 10 },
            cost: 0.025,
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'Test message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: { input: 100, output: 50, reasoning: 10 },
          cost: 0.025,
        })
      );
    });

    it('should ignore user messages in message.updated', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      // User message should not be tracked
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'user',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      // User message part should be skipped
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-1',
            type: 'text',
            text: 'User message text',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      // Assistant message should be tracked
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm2',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'part-2',
            type: 'text',
            text: 'Assistant response',
            sessionID: 's1',
            messageID: 'm2',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      const payload = onCompleteMock.mock.calls[0][0] as AgentCompletedPayload;
      expect(payload.messageContent).toBe('Assistant response');
      expect(payload.tokens).toBeUndefined();
      expect(payload.cost).toBeUndefined();
    });
  });

  describe('session title resolution', () => {
    it('should use directory name as fallback title when session fetch fails', async () => {
      mockContext.client.session.get.mockRejectedValue(new Error('Not found'));

      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTitle: 'my-project', // basename of /home/user/my-project
        })
      );
    });

    it('should use sessionId as final fallback when directory is unavailable', async () => {
      mockContext.client.session.get.mockRejectedValue(new Error('Not found'));
      mockContext.directory = '';

      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 'session-abc-123',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 'session-abc-123',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 'session-abc-123' },
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTitle: 'session-abc-123',
        })
      );
    });
  });

  describe('debug logging', () => {
    it('should log when debug is enabled', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        debug: true,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware]')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clear all sessions on destroy', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      middleware.destroy();

      // After destroy, idle should not trigger callback
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).not.toHaveBeenCalled();
    });
  });

  describe('idle delay functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send webhook immediately when idleDelaySecs is 0', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 0,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('should send webhook immediately when idleDelaySecs is not set', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('should delay webhook sending when idleDelaySecs is set', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Should not be called immediately
      expect(onCompleteMock).not.toHaveBeenCalled();

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Wait for async callbacks
      await Promise.resolve();

      // Should be called after delay
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messageContent: 'Test message',
        })
      );
    });

    it('should cancel pending webhook when message.part.updated occurs during delay', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'First part',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Fast forward 2 seconds (not enough to trigger)
      jest.advanceTimersByTime(2000);

      // New activity - should cancel pending webhook
      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p2',
            type: 'text',
            text: 'Second part',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      // Fast forward remaining time
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Should not be called since it was cancelled
      expect(onCompleteMock).not.toHaveBeenCalled();
    });

    it('should cancel pending webhook when message.updated occurs during delay', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Fast forward 2 seconds
      jest.advanceTimersByTime(2000);

      // New message - should cancel pending webhook
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm2',
          },
        },
      });

      // Fast forward remaining time
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Should not be called since it was cancelled
      expect(onCompleteMock).not.toHaveBeenCalled();
    });

    it('should reset timer when session.idle fires again during delay', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'First message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      // First idle
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Fast forward 3 seconds
      jest.advanceTimersByTime(3000);

      // Second idle - should reset timer
      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Fast forward 3 more seconds (6 total, but timer was reset at 3s)
      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      // Should not be called yet (only 3s since reset)
      expect(onCompleteMock).not.toHaveBeenCalled();

      // Fast forward 2 more seconds (5s since reset)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // Should be called now
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple sessions with independent delay timers', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      // Session 1
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Session 1 message',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Fast forward 2 seconds
      jest.advanceTimersByTime(2000);

      // Session 2
      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's2',
            id: 'm2',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p2',
            type: 'text',
            text: 'Session 2 message',
            sessionID: 's2',
            messageID: 'm2',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's2' },
      });

      // Fast forward 3 more seconds (5s total for s1, 3s for s2)
      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      // s1 should have fired
      expect(onCompleteMock).toHaveBeenCalledTimes(1);
      expect(onCompleteMock.mock.calls[0][0].messageContent).toBe('Session 1 message');

      // Fast forward 2 more seconds (5s for s2)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // s2 should have fired
      expect(onCompleteMock).toHaveBeenCalledTimes(2);
      expect(onCompleteMock.mock.calls[1][0].messageContent).toBe('Session 2 message');
    });

    it('should clear all pending timers on destroy', async () => {
      const middleware = new AgentCompletionMiddleware({
        context: mockContext,
        idleDelaySecs: 5,
        onComplete: onCompleteMock,
      });

      await middleware.handleEvent({
        type: 'message.updated',
        properties: {
          info: {
            role: 'assistant',
            sessionID: 's1',
            id: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'message.part.updated',
        properties: {
          part: {
            id: 'p1',
            type: 'text',
            text: 'Test',
            sessionID: 's1',
            messageID: 'm1',
          },
        },
      });

      await middleware.handleEvent({
        type: 'session.idle',
        properties: { sessionID: 's1' },
      });

      // Destroy before timer fires
      middleware.destroy();

      // Fast forward time
      jest.advanceTimersByTime(10000);
      await Promise.resolve();

      // Should not be called since destroyed
      expect(onCompleteMock).not.toHaveBeenCalled();
    });
  });
});
