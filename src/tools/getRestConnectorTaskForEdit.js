import { apiFetch } from '../auth.js';

export const getRestConnectorTaskForEditTool = {
  name: 'get_rest_connector_task_for_edit',
  description: 'Get the REST task body of an integration for editing. Pass ActionId (connector action id) plus optionally TaskId. Returns RestConnectorTaskForEditOutputDto (URL, method, headers, mappings, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      actionId: { type: 'string', description: 'Connector action ID (UUID)' },
      taskId:   { type: 'string', description: 'Task ID (UUID) (optional)' }
    },
    required: ['actionId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('ActionId', args.actionId);
    if (args.taskId) params.set('TaskId', args.taskId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRestConnectorTaskForEditOutputDto?${params}`);
    return data.result ?? data;
  }
};
