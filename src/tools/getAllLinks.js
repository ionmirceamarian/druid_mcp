import { apiFetch } from '../auth.js';

export const getAllLinksTool = {
  name: 'get_all_links',
  description: 'Get every link (transition) in a flow in one call, including each link\'s condition, source/target step IDs, and ports. Faster than calling get_link per step pair when you need to review or audit all branching conditions in a flow at once.',
  inputSchema: {
    type: 'object',
    required: ['flowId'],
    properties: {
      flowId: { type: 'string', description: 'Flow ID (UUID)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ flowId: args.flowId });
    const data = await apiFetch(`/api/services/app/FlowStep/GetAllLinks?${params}`);
    return data.result ?? data;
  }
};
