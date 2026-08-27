import { listSessions } from '../genericChat.js';

export const chatListSessionsTool = {
  name: 'chat_list_sessions',
  description: 'List the in-memory "Druid Generic Chat" test conversations held by this MCP server (bot, conversationId, userId, turns, token lifetime).',
  inputSchema: { type: 'object', properties: {} },

  async execute() {
    const items = listSessions();
    return { totalCount: items.length, items };
  }
};
