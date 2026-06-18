import { apiFetch } from '../auth.js';

export const getDashboardForEditTool = {
  name: 'get_dashboard_for_edit',
  description: 'Fetch the full definition of a dashboard (pages, widgets, languages) by its UUID, ready for editing.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Dashboard UUID' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/Dashboards/GetDashboardForEdit?id=${args.id}`);
    return data.result ?? data;
  }
};
