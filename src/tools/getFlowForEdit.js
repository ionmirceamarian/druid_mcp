import { apiFetch } from '../auth.js';

export const getFlowForEditTool = {
  name: 'get_flow_for_edit',
  description: 'Get a flow for editing. Call with no Id to get a blank flow template for creating a new flow. Pass an existing flow Id to load that flow for editing.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Flow ID (UUID). Omit or pass null to get a blank new-flow template.' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.id) params.set('Id', args.id);

    const data = await apiFetch(`/api/services/app/Flow/GetFlowForEditAsync?${params}`);
    return data.result ?? data;
  }
};
