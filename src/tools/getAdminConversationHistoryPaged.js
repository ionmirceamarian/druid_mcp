import { apiFetch } from '../auth.js';

export const getAdminConversationHistoryPagedTool = {
  name: 'get_admin_conversation_history_paged',
  description: 'Debug: list conversation history messages for a bot in a date range. Returns paged list of AdminConversationHistoryListDto items including activityId, correlationId, flowName, flowStepName, message, status, etc. Use activityId from results to drill deeper via get_debugging_tool_chat_activity_detail_paged.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:                    { type: 'string', description: 'Bot (AI agent) ID (UUID)' },
      startDate:                { type: 'string', description: 'ISO date-time, inclusive lower bound, e.g. 2026-05-26T00:00:00.000+03:00' },
      endDate:                  { type: 'string', description: 'ISO date-time, inclusive upper bound' },
      channelId:                { type: 'string', description: 'Filter by channel id (optional)' },
      userId:                   { type: 'number', description: 'Filter by AbpUserId (int32) (optional)' },
      flowId:                   { type: 'string', description: 'Filter by flow id (UUID) (optional)' },
      isOnlyEngaged:            { type: 'boolean', description: 'Only engaged conversations (optional)' },
      messageFilter:            { type: 'string', description: 'Free-text search inside message (optional)' },
      status:                   { type: 'array', items: { type: 'number' }, description: 'Filter by FlowEngineMessageStatus values (optional)' },
      correlationId:            { type: 'string', description: 'Filter by correlationId (UUID) (optional)' },
      conversationId:           { type: 'string', description: 'Filter by conversationId (optional)' },
      activityId:               { type: 'string', description: 'Filter by activityId (UUID) (optional)' },
      decryptSensitiveData:     { type: 'boolean', description: 'Decrypt sensitive data in messages (optional)' },
      connectedBotId:           { type: 'string', description: 'Connected bot id (UUID) (optional)' },
      connectedBotIsParentBot:  { type: 'boolean', description: 'Whether the connected bot is the parent bot (optional)' },
      pageSize:                 { type: 'number', description: 'Page size (default 100)', default: 100 },
      pageNumber:               { type: 'number', description: 'Page number, 1-based (default 1)', default: 1 }
    },
    required: ['botId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.startDate)               params.set('QueryParams.StartDate',                args.startDate);
    if (args.endDate)                 params.set('QueryParams.EndDate',                  args.endDate);
    if (args.channelId)               params.set('QueryParams.ChannelId',                args.channelId);
    if (args.userId != null)          params.set('QueryParams.UserId',                   String(args.userId));
    if (args.flowId)                  params.set('QueryParams.FlowId',                   args.flowId);
    if (args.isOnlyEngaged != null)   params.set('QueryParams.IsOnlyEngaged',            String(args.isOnlyEngaged));
    if (args.botId)                   params.set('QueryParams.BotId',                    args.botId);
    if (args.messageFilter)           params.set('QueryParams.MessageFilter',            args.messageFilter);
    if (Array.isArray(args.status))   args.status.forEach(s => params.append('QueryParams.Status', String(s)));
    if (args.correlationId)           params.set('QueryParams.CorrelationId',            args.correlationId);
    if (args.conversationId)          params.set('QueryParams.ConversationId',           args.conversationId);
    if (args.activityId)              params.set('QueryParams.ActivityId',               args.activityId);
    if (args.decryptSensitiveData != null) params.set('QueryParams.DecryptSensitiveData', String(args.decryptSensitiveData));
    if (args.connectedBotId)          params.set('QueryParams.ConnectedBotId',           args.connectedBotId);
    if (args.connectedBotIsParentBot != null) params.set('QueryParams.ConnectedBotIsParentBot', String(args.connectedBotIsParentBot));
    params.set('PageSize',   String(args.pageSize   ?? 100));
    params.set('PageNumber', String(args.pageNumber ?? 1));

    const data = await apiFetch(`/api/services/app/ConversationHistory/GetAdminConversationHistoryPaged?${params}`);
    return data.result ?? data;
  }
};
