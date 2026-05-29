import { apiFetch } from '../auth.js';

export const getFlowRolesTool = {
  name: 'get_flow_roles',
  description: 'Get the current roles assigned to a flow (RBAC). Returns the list of roles that have access to the flow.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Flow ID (UUID)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ Id: args.id });
    const data = await apiFetch(`/api/services/app/Flow/GetFlowRolesAsync?${params}`);
    return data.result ?? data;
  }
};
