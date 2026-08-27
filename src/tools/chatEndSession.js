import { dropSession, dropAllSessions } from '../genericChat.js';

export const chatEndSessionTool = {
  name: 'chat_end_session',
  description: 'Forget a cached "Druid Generic Chat" test conversation. The next chat_send_message for that bot authorizes again and starts a new conversation.',
  inputSchema: {
    type: 'object',
    properties: {
      botId: { type: 'string',  description: 'AI Agent (bot) ID (UUID). Omit and pass all=true to clear every session.' },
      all:   { type: 'boolean', description: 'Clear all cached sessions. Default false.' }
    }
  },

  async execute(args) {
    if (args.all) {
      const n = dropAllSessions();
      return { success: true, cleared: n, message: `Cleared ${n} chat session(s).` };
    }
    if (!args.botId) throw new Error('Pass botId, or all=true to clear every session.');

    const removed = dropSession(args.botId);
    return {
      success: true,
      removed,
      message: removed
        ? `Session for bot ${args.botId} cleared.`
        : `No cached session for bot ${args.botId}.`
    };
  }
};
