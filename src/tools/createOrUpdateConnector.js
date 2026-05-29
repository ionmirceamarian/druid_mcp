import { apiFetch } from '../auth.js';

export const createOrUpdateConnectorTool = {
  name: 'create_or_update_connector',
  description: 'Create or update a connector ("app"). Pass `connector` (CreateTenantConnectorInput) — omit `connector.id` to create, include it to update. Set the matching config sub-object (restConfig/sqlConfig/soapConfig/crmConfig/uiPathConfig/...). Returns the connector UUID.',
  inputSchema: {
    type: 'object',
    properties: {
      connector:  { type: 'object', description: 'CreateTenantConnectorInput. Required: code (max 20 chars), connectorId (UUID of the connector type). Plus the matching *Config object for the connector type.' },
      solutionId: { type: 'string', description: 'Solution ID (UUID) to attach the connector to (optional)' }
    },
    required: ['connector']
  },
  async execute(args) {
    const body = { connector: args.connector };
    if (args.solutionId) body.solutionId = args.solutionId;

    const data = await apiFetch(`/api/services/app/Connector/CreateOrUpdateConnector`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return { id: data.result ?? data };
  }
};
