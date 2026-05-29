import { apiFetch } from '../auth.js';

export const getLinkTool = {
  name: 'get_link',
  description: 'Get the link/transition details between two flow steps, including conditions. Use this to inspect or prepare an edit of the condition on a step connection.',
  inputSchema: {
    type: 'object',
    required: ['currentStepId', 'flowId'],
    properties: {
      currentStepId: { type: 'string', description: 'The source (parent) step ID (UUID)' },
      nextStepId:    { type: 'string', description: 'The target (child) step ID (UUID). Optional — omit to get all outgoing links from the current step.' },
      flowId:        { type: 'string', description: 'The flow ID (UUID)' }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ CurrentStepId: args.currentStepId, FlowId: args.flowId });
    if (args.nextStepId) params.set('NextStepId', args.nextStepId);

    const data = await apiFetch(`/api/services/app/FlowStep/GetLink?${params}`);
    return data.result ?? data;
  }
};
