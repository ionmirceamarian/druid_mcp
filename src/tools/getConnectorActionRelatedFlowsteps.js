import { apiFetch } from '../auth.js';

export const getConnectorActionRelatedFlowstepsTool = {
  name: 'get_connector_action_related_flowsteps',
  description: 'List flow steps that use a given integration (connector action). Returns array of (flowName, stepName) tuples.',
  inputSchema: {
    type: 'object',
    properties: {
      connectorActionId: { type: 'string', description: 'Connector action ID (UUID)' }
    },
    required: ['connectorActionId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('connectorActionId', args.connectorActionId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRelatedFlowsteps?${params}`);
    return data.result ?? data;
  }
};
