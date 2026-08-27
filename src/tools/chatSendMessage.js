import {
  getSession, sendActivity, drainMessages, filterActivities,
  summarize, publicSession, setEndpoints, describeResponse,
  readHistoryReplies, markHistorySeen
} from '../genericChat.js';

export const chatSendMessageTool = {
  name: 'chat_send_message',
  description:
    'Test an AI Agent by sending it a chat message through the "Druid Generic Chat" channel and returning its replies. ' +
    'Authorizes automatically on first use and keeps one conversation per bot in memory, so follow-up calls continue the same conversation. ' +
    'Requires the "Druid Generic Chat" channel to be added and published on the AI Agent. ' +
    'Set newConversation=true to start over, or longPolling=true for agents configured with long polling.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:           { type: 'string',  description: 'AI Agent (bot) ID (UUID)' },
      text:            { type: 'string',  description: 'The message to send to the agent. To answer a choice step, send the button text.' },
      newConversation: { type: 'boolean', description: 'Start a fresh conversation (drops the cached session) before sending. Default false.' },
      longPolling:     { type: 'boolean', description: 'Agent has "Enable long polling" on: after sending, poll /getMessages for the replies. Default false (synchronous).' },
      waitSeconds:     { type: 'number',  description: 'Long polling only: how long to keep polling for replies. Default 15.' },
      timeout:         { type: 'number',  description: 'Seconds the Flow Engine may take before an error is logged. Default 50.' },
      queryString:     { type: 'string',  description: 'Query string passed at authorization, e.g. "phone=+40712345678". Used to prefill [[ChatUser]] fields. Only applies when a new session is created.' },
      readHistory:     { type: 'boolean', description: 'When the runtime answers with an empty activity (it produced the reply after responding), read the agent\'s replies from ConversationHistory instead. Needs the admin API credentials. Default true.' },
      agentUrl:        { type: 'string',  description: 'AI Agent URL from the channel dialog, if this bot\'s runtime host has not been registered yet with chat_set_endpoints. Optional.' },
      authorizeUrl:    { type: 'string',  description: 'Authorize URL from the channel dialog. Optional.' }
    },
    required: ['botId', 'text']
  },

  async execute(args) {
    if (args.authorizeUrl || args.agentUrl) {
      setEndpoints(args.botId, { authorizeUrl: args.authorizeUrl, agentUrl: args.agentUrl });
    }

    const session = await getSession(args.botId, {
      reset:       args.newConversation === true,
      queryString: args.queryString
    });

    // Anything already in the conversation belongs to earlier turns.
    const useHistory = args.readHistory !== false;
    if (useHistory) await markHistorySeen(session);

    const sent = await sendActivity(session, args.text, {
      timeout: args.timeout ?? 50
    });

    let activities = filterActivities(sent.activities);
    let lastHttp = sent.http;

    if (args.longPolling) {
      const polled = await drainMessages(session, {
        waitSeconds: args.waitSeconds ?? 15
      });
      activities = [...activities, ...polled.activities];
      if (polled.http) lastHttp = polled.http;
    }

    // The runtime replied with an empty envelope: the agent's real answer
    // lands in ConversationHistory a few seconds later.
    let historyPolls, historyError;
    if (!activities.length && useHistory) {
      const fromHistory = await readHistoryReplies(session, {
        waitSeconds: args.waitSeconds ?? 20
      });
      activities = fromHistory.activities;
      historyPolls = fromHistory.polls;
      historyError = fromHistory.error;
    }

    return {
      session: publicSession(session),
      sent:    args.text,
      replies: activities.map(summarize),
      replyCount: activities.length,
      repliesFrom: activities.length
        ? (activities[0].source === 'conversation-history' ? 'conversation-history' : 'http-response')
        : undefined,
      historyPolls,
      historyError,
      note: activities.length
        ? undefined
        : (args.longPolling
            ? 'No replies received within the wait window. Try a longer waitSeconds, or check the agent flow in the debugging tool.'
            : 'The agent accepted the message but no reply appeared, over HTTP or in ConversationHistory. See httpResponse below for what the runtime sent back. ' +
              'Common causes: the agent replies only to a matched intent (welcome messages are routed to DirectLine, not Generic Chat), ' +
              'the channel is added but the agent is not published, or the agent uses long polling (call again with longPolling=true).'),
      // Surfaced only when nothing parsed, so a silent agent can be told apart from a parsing miss.
      httpResponse: activities.length ? undefined : describeResponse(lastHttp),
      raw: activities
    };
  }
};
