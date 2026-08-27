import { getSession, publicSession, setEndpoints } from '../genericChat.js';

export const chatStartSessionTool = {
  name: 'chat_start_session',
  description:
    'Start (or restart) a "Druid Generic Chat" test conversation with an AI Agent. ' +
    'Calls the anonymous authorize endpoint and caches the token, conversationId and userId in memory. ' +
    'Optional — chat_send_message does this automatically; use it to force a fresh conversation or to pass a queryString.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:       { type: 'string',  description: 'AI Agent (bot) ID (UUID)' },
      queryString: { type: 'string',  description: 'Query string sent at authorization, e.g. "phone=+40712345678&lang=en". Prefills [[ChatUser]] fields.' },
      reset:        { type: 'boolean', description: 'Discard any existing cached session for this bot and start a brand-new conversation. Default true.' },
      authorizeUrl: { type: 'string',  description: 'Authorize URL from the channel dialog (druidapi.* host). Stored for this bot. Optional.' },
      agentUrl:     { type: 'string',  description: 'AI Agent URL from the channel dialog (druidbotapp-po<N>.* host). Stored for this bot. Optional.' }
    },
    required: ['botId']
  },

  async execute(args) {
    if (args.authorizeUrl || args.agentUrl) {
      setEndpoints(args.botId, { authorizeUrl: args.authorizeUrl, agentUrl: args.agentUrl });
    }

    const session = await getSession(args.botId, {
      reset:       args.reset !== false,
      queryString: args.queryString
    });
    return {
      success: true,
      session: publicSession(session),
      message: `Generic Chat session ready for bot ${args.botId}. Send messages with chat_send_message.`
    };
  }
};
