import { apiFetch } from '../auth.js';

export const updateFlowRolesTool = {
  name: 'update_flow_roles',
  description: 'Set the RBAC roles that have access to a flow. Use get_current_user_roles to retrieve available roles first, then pass the desired role list here.',
  inputSchema: {
    type: 'object',
    required: ['flowId', 'assignedRoles'],
    properties: {
      flowId: { type: 'string', description: 'Flow ID (UUID)' },
      assignedRoles: {
        type: 'array',
        description: 'Array of role objects to assign. Each object should match the role structure returned by get_current_user_roles.',
        items: { type: 'object' }
      },
      skipRBAC: { type: 'boolean', description: 'Skip RBAC validation (optional, default false)', default: false }
    }
  },
  async execute(args) {
    const body = {
      flowId: args.flowId,
      assignedRoles: args.assignedRoles,
      skipRBAC: args.skipRBAC ?? false
    };

    const data = await apiFetch('/api/services/app/Flow/UpdateFlowRolesAsync', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    return data.result ?? data;
  }
};
