import { apiFetch } from '../auth.js';

export const createOrUpdateRestConnectorTaskTool = {
  name: 'create_or_update_rest_connector_task',
  description: 'Save the REST task body for an integration. Pass the full CreateOrUpdateRestConnectorTaskDto (typically the object returned by get_rest_connector_task_for_edit with modifications). Returns the task UUID.',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'object', description: 'CreateOrUpdateRestConnectorTaskDto' }
    },
    required: ['input']
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/ConnectorAction/CreateOrUpdateRestConnectorTask`, {
      method: 'POST',
      body: JSON.stringify(args.input)
    });
    return { id: data.result ?? data };
  }
};
