import { apiFetch } from '../auth.js';

export const getWebViewRolesTool = {
  name: 'get_web_view_roles',
  description: 'Get the role assignments for a view (who can see/use it).',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'View UUID' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/GetWebViewRolesAsync?Id=${args.id}`);
    return data.result ?? data;
  }
};
