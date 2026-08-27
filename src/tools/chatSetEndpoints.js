import { setEndpoints, getEndpointOverrides, clearEndpoints, dropSession } from '../genericChat.js';

export const chatSetEndpointsTool = {
  name: 'chat_set_endpoints',
  description:
    'Register the two URLs shown in the agent\'s "Druid Generic Chat" channel dialog (AI Agent settings -> Channels). ' +
    'They sit on different hosts than the portal API — Authorize URL on druidapi.*, AI Agent URL on druidbotapp-po<N>.* — ' +
    'so pasting them here is the reliable way to point the chat tools at the right runtime. ' +
    'Without them the client probes a few derived candidates and pins whichever answers. ' +
    'Omit botId to apply the URLs to every agent; call with clear=true to remove them.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:        { type: 'string',  description: 'AI Agent (bot) ID (UUID). Omit to set the default for all agents.' },
      authorizeUrl: { type: 'string',  description: 'Authorize URL, e.g. https://druidapi.druidplatform.com/api/services/app/Chat/AuthorizeAnonymousAsync' },
      agentUrl:     { type: 'string',  description: 'AI Agent URL, e.g. https://druidbotapp-po0.druidplatform.com/api/generic-chat/<botId>/messages (a {botId} placeholder also works)' },
      clear:        { type: 'boolean', description: 'Remove the stored URLs for this scope instead of setting them. Default false.' }
    }
  },

  async execute(args) {
    if (args.clear) {
      const removed = clearEndpoints(args.botId);
      if (args.botId) dropSession(args.botId);
      return { success: true, removed, endpoints: getEndpointOverrides() };
    }

    if (!args.authorizeUrl && !args.agentUrl) {
      return {
        endpoints: getEndpointOverrides(),
        message: 'Nothing set — pass authorizeUrl and/or agentUrl. Current overrides listed above.'
      };
    }

    const saved = setEndpoints(args.botId, {
      authorizeUrl: args.authorizeUrl,
      agentUrl:     args.agentUrl
    });

    // Any cached session was built against the old endpoints.
    if (args.botId) dropSession(args.botId);

    return {
      success: true,
      saved,
      endpoints: getEndpointOverrides(),
      message: 'Endpoints stored. The next chat_send_message re-authorizes against them.'
    };
  }
};
