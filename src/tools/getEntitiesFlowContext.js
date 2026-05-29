import { apiFetch } from '../auth.js';

export const getEntitiesFlowContextTool = {
  name: 'get_entities_flow_context',
  description: 'Get the flow context for a given flow — returns all steps, their types, mappings, and what entities/variables are available at each point. Useful for understanding what a flow does and what data flows through it.',
  inputSchema: {
    type: 'object',
    properties: {
      flowId:       { type: 'string', description: 'Flow ID (UUID) to inspect' },
      botId:        { type: 'string', description: 'Bot/Agent ID (UUID, optional)' },
      allFromTheBot: { type: 'boolean', description: 'If true, include context from all flows in the bot, not just this flow (default: true)', default: true }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.flowId) params.set('FlowId', args.flowId);
    if (args.botId)  params.set('BotId', args.botId);
    params.set('AllFromTheBot', String(args.allFromTheBot ?? true));

    const data = await apiFetch(`/api/services/app/Flow/GetEntitiesFlowContext?${params}`);
    return data.result ?? data;
  }
};
