import { apiFetch } from '../auth.js';

export const testRestConnectorTaskTool = {
  name: 'test_rest_connector_task',
  description: 'Test-execute a REST integration without saving. Body is a TestRequestRestConnectorTaskDto. Returns an array of ConnectorHistoryData (the actual request/response captured).',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'object', description: 'TestRequestRestConnectorTaskDto' }
    },
    required: ['input']
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/ConnectorAction/TestRestConnectorTask`, {
      method: 'POST',
      body: JSON.stringify(args.input)
    });
    return data.result ?? data;
  }
};
