import { apiFetch } from '../auth.js';

export const getFlowStepForEditTool = {
  name: 'get_flow_step_for_edit',
  description: 'Get the full editable definition of a single flow step (CreateFlowStepInput shape — name, type, message, inputMapping, meta/metadata, subFlowId, etc.), plus available flow/environment names for dropdowns. Use get_flow_steps_by_flow_id first to find the step ID. Read this before calling create_or_update_flow_step to update a step, so you only change the fields you intend to and preserve the rest.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Flow step ID (UUID)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ Id: args.id });
    const data = await apiFetch(`/api/services/app/FlowStep/GetFlowStepForEdit?${params}`);
    return data.result ?? data;
  }
};
