import { apiFetch } from '../auth.js';

export const getDebuggingToolChatActivityDetailPagedTool = {
  name: 'get_debugging_tool_chat_activity_detail_paged',
  description: 'Debug: drill into a specific chat activity for a bot. Returns DebuggingToolChatActivityDetailDto including the conversationPath, per-step detail items, integrations (connector calls) and nluHistory. Use an activityId obtained from get_admin_conversation_history_paged.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:                  { type: 'string', description: 'Bot ID (UUID)' },
      activityId:             { type: 'string', description: 'Activity ID (UUID)' },
      correlationId:          { type: 'string', description: 'Correlation ID (UUID) (optional)' },
      flowId:                 { type: 'string', description: 'Flow ID (UUID) (optional)' },
      connectedBotIsParent:   { type: 'boolean', description: 'Whether the connected bot is the parent bot (optional)' },
      connectedBotId:         { type: 'string', description: 'Connected bot ID (UUID) (optional)' },
      pageSize:               { type: 'number', description: 'Page size (default 100)', default: 100 },
      pageNumber:             { type: 'number', description: 'Page number, 1-based (default 1)', default: 1 }
    },
    required: ['botId', 'activityId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('QueryParams.BotId',      args.botId);
    params.set('QueryParams.ActivityId', args.activityId);
    if (args.correlationId)        params.set('QueryParams.CorrelationId',        args.correlationId);
    if (args.flowId)               params.set('QueryParams.FlowId',               args.flowId);
    if (args.connectedBotIsParent != null) params.set('QueryParams.ConnectedBotIsParent', String(args.connectedBotIsParent));
    if (args.connectedBotId)       params.set('QueryParams.ConnectedBotId',       args.connectedBotId);
    params.set('PageSize',   String(args.pageSize   ?? 100));
    params.set('PageNumber', String(args.pageNumber ?? 1));

    const data = await apiFetch(`/api/services/app/DebuggingTool/GetDebuggingToolChatActivityDetailPaged?${params}`);
    return data.result ?? data;
  }
};
