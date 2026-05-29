import { apiFetch } from '../auth.js';

export const createOrUpdateFlowTool = {
  name: 'create_or_update_flow',
  description: 'Create a new flow or update an existing one. For a new flow, use the flow object returned by get_flow_for_edit (with no Id) and fill in the required fields. For updates, pass the full flow object from get_flow_for_edit with your changes.',
  inputSchema: {
    type: 'object',
    required: ['flow'],
    properties: {
      flow: {
        type: 'object',
        description: 'The FlowEditDto object. Required fields: name (string), botId (string). Leave id null/empty to create a new flow.',
        properties: {
          id:          { type: 'string', description: 'Flow ID — null or omit for new flow' },
          name:        { type: 'string', description: 'Flow name (required)' },
          botId:       { type: 'string', description: 'Bot/Agent ID this flow belongs to (required)' },
          category:    { type: 'string', description: 'Flow category (optional)' },
          description: { type: 'string', description: 'Flow description' },
          isAlert:     { type: 'boolean' },
          isPullInfo:  { type: 'boolean' },
          isReport:    { type: 'boolean' },
          isTask:      { type: 'boolean' },
          isForm:      { type: 'boolean' },
          isAgentic:   { type: 'boolean' },
          isAuthenticationRequired: { type: 'boolean' },
          isAutoStart: { type: 'boolean' },
          isDisabled:  { type: 'boolean' }
        }
      },
      solutionId: { type: 'string', description: 'Solution ID to place the flow in (optional)' }
    }
  },
  async execute(args) {
    const body = {
      flow: args.flow,
      solutionId: args.solutionId ?? null
    };

    const data = await apiFetch('/api/services/app/Flow/CreateOrUpdateFlow', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return data.result ?? data;
  }
};
