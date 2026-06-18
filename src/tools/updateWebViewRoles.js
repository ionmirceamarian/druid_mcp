import { apiFetch } from '../auth.js';

export const updateWebViewRolesTool = {
  name: 'update_web_view_roles',
  description: 'Update the role assignments for a view.',
  inputSchema: {
    type: 'object',
    required: ['id', 'roles'],
    properties: {
      id:    { type: 'string', description: 'View UUID' },
      roles: { type: 'array', items: { type: 'string' }, description: 'Array of role names to assign' }
    }
  },
  async execute(args) {
    const data = await apiFetch('/api/services/app/EntityMetadata/UpdateWebViewRolesAsync', {
      method: 'PUT',
      body: JSON.stringify(args)
    });
    return data.result ?? data;
  }
};
