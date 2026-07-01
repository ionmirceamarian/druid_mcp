import { apiFetch } from '../auth.js';

export const getFlowStepsByFlowIdTool = {
  name: 'get_flow_steps_by_flow_id',
  description: 'List all steps belonging to a flow, in one call — each item includes name, type, message, inputMapping, and metadata (JSON strings). Use this first to enumerate a flow\'s steps and find the step IDs you need before calling get_flow_step_for_edit or get_link/get_all_links.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Flow ID (UUID)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ Id: args.id });
    const data = await apiFetch(`/api/services/app/FlowStep/GetFlowStepsByFlowId?${params}`);
    return data.result ?? data;
  }
};
