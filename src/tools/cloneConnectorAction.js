import { apiFetch } from '../auth.js';

export const cloneConnectorActionTool = {
  name: 'clone_connector_action',
  description: 'Clone an existing integration (connector action) into a new one. Returns the new connector action UUID.',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'object', description: 'CloneConnectorActionDto — pass the dto shape expected by the API (typically includes source id and the new name).' }
    },
    required: ['input']
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/ConnectorAction/CloneConnectorActionAsync`, {
      method: 'POST',
      body: JSON.stringify(args.input)
    });
    return { id: data.result ?? data };
  }
};
