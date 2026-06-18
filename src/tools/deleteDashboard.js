import { apiFetch } from '../auth.js';

export const deleteDashboardTool = {
  name: 'delete_dashboard',
  description: 'Delete a dashboard by its UUID.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Dashboard UUID to delete' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/Dashboards/DeleteDashboard?Id=${args.id}`, {
      method: 'DELETE'
    });
    return data.result ?? data;
  }
};
