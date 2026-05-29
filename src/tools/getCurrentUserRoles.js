import { apiFetch } from '../auth.js';

export const getCurrentUserRolesTool = {
  name: 'get_current_user_roles',
  description: 'Get the roles assigned to the current authenticated user. Use this to determine which roles can be assigned to a flow before calling update_flow_roles.',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  async execute(_args) {
    const data = await apiFetch('/api/services/app/RBAC/GetCurrentUserRolesForRBACList');
    return data.result ?? data;
  }
};
