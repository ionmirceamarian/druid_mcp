import { apiFetch } from '../auth.js';

export const testConnectorAppTool = {
  name: 'test_connector_app',
  description: 'Test a connector configuration (verify connection works) without saving. Body shape is the same as create_or_update_connector. Returns TestConnectorAppResponse.',
  inputSchema: {
    type: 'object',
    properties: {
      connector:  { type: 'object', description: 'CreateTenantConnectorInput — same shape as for create_or_update_connector' },
      solutionId: { type: 'string', description: 'Solution ID (UUID) (optional)' }
    },
    required: ['connector']
  },
  async execute(args) {
    const body = { connector: args.connector };
    if (args.solutionId) body.solutionId = args.solutionId;

    const data = await apiFetch(`/api/services/app/Connector/TestConnectorApp`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return data.result ?? data;
  }
};
