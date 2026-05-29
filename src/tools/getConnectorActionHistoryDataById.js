import { apiFetch } from '../auth.js';

export const getConnectorActionHistoryDataByIdTool = {
  name: 'get_connector_action_history_data_by_id',
  description: 'Debug: get the request/response payload for a single connector (integration) execution. Returns ConnectorHistoryDataDto with the full request/response entity & task content for that connector call. Use the integration id obtained from get_debugging_tool_chat_activity_detail_paged (integrations[].id).',
  inputSchema: {
    type: 'object',
    properties: {
      id:          { type: 'number', description: 'Connector history record id (int32)' },
      executionId: { type: 'string', description: 'Execution id (UUID) (optional)' }
    },
    required: ['id']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('id', String(args.id));
    if (args.executionId) params.set('executionId', args.executionId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetHistoryDataById?${params}`);
    return data.result ?? data;
  }
};
