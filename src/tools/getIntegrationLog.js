import { apiFetch } from '../auth.js';

export const getIntegrationLogTool = {
  name: 'get_integration_log',
  description: 'Direct wrapper around /api/services/app/DebuggingTool/GetDebuggingToolChatActivityDetailMessageIntegrationLog — lists connector executions (integration history rows) for a given botId + correlationId. This is the endpoint the Druid UI uses to expand a conversation turn. Use for raw diagnostics when get_conversation_contexts comes back empty. Returns the full raw response (items[], totalCount).',
  inputSchema: {
    type: 'object',
    properties: {
      botId:         { type: 'string', description: 'Bot ID (UUID)' },
      correlationId: { type: 'string', description: 'Correlation ID (UUID) — typically from a message returned by get_admin_conversation_history_paged' },
      pageSize:      { type: 'number', description: 'Page size (default 100)', default: 100 },
      pageNumber:    { type: 'number', description: 'Page number, 1-based (default 1)', default: 1 }
    },
    required: ['botId', 'correlationId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('botId',         args.botId);
    params.set('correlationId', args.correlationId);
    params.set('pageSize',      String(args.pageSize   ?? 100));
    params.set('pageNumber',    String(args.pageNumber ?? 1));

    const data = await apiFetch(`/api/services/app/DebuggingTool/GetDebuggingToolChatActivityDetailMessageIntegrationLog?${params}`);
    return data.result ?? data;
  }
};
