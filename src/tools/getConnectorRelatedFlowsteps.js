import { apiFetch } from '../auth.js';

export const getConnectorRelatedFlowstepsTool = {
  name: 'get_connector_related_flowsteps',
  description: 'List flow-steps that use a given connector code, optionally scoped to a bot or to its solution. Returns array of (flowName, stepName) tuples.',
  inputSchema: {
    type: 'object',
    properties: {
      code:         { type: 'string', description: 'Connector code' },
      fromSolution: { type: 'boolean', description: 'Restrict to the solution scope (optional)' },
      botId:        { type: 'string', description: 'Bot ID (UUID) (optional)' }
    },
    required: ['code']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('code', args.code);
    if (args.fromSolution != null) params.set('fromSolution', String(args.fromSolution));
    if (args.botId)                params.set('botId',        args.botId);

    const data = await apiFetch(`/api/services/app/Connector/GetRelatedFlowsteps?${params}`);
    return data.result ?? data;
  }
};
