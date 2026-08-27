import { getSession, drainMessages, summarize, publicSession, describeResponse } from '../genericChat.js';

export const chatGetMessagesTool = {
  name: 'chat_get_messages',
  description:
    'Long polling: fetch any pending replies for the current Generic Chat conversation with an AI Agent, without sending a message. ' +
    'Use after chat_send_message when the agent is configured with "Enable long polling", or to pick up messages the agent pushes later (e.g. after a slow integration).',
  inputSchema: {
    type: 'object',
    properties: {
      botId:       { type: 'string', description: 'AI Agent (bot) ID (UUID)' },
      waitSeconds: { type: 'number', description: 'How long to keep polling for messages. Default 15.' }
    },
    required: ['botId']
  },

  async execute(args) {
    const session = await getSession(args.botId, {});
    const { activities, http, polls } = await drainMessages(session, {
      waitSeconds: args.waitSeconds ?? 15
    });

    return {
      session: publicSession(session),
      replies: activities.map(summarize),
      replyCount: activities.length,
      polls,
      httpResponse: activities.length ? undefined : describeResponse(http),
      raw: activities
    };
  }
};
