import { apiFetch } from '../auth.js';

export const createOrUpdateConnectorActionTool = {
  name: 'create_or_update_connector_action',
  description: 'Create or update an integration (connector action) header. The full body for the specific task type (Rest/Sql/Soap/CRM/…) is saved through the per-type endpoints (e.g. create_or_update_rest_connector_task). Returns CreateOrUpdateConnectorActionOutput.',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'object', description: 'CreateOrUpdateConnectorActionInput — pass the full payload as returned by get_connector_action_for_edit, with any modifications. Omit id to create.' }
    },
    required: ['input']
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/ConnectorAction/CreateOrUpdateConnectorAction`, {
      method: 'POST',
      body: JSON.stringify(args.input)
    });
    return data.result ?? data;
  }
};
