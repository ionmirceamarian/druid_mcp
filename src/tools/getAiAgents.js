import { apiFetch } from '../auth.js';

export const getAiAgentsTool = {
  name: 'get_ai_agents',
  description: 'List AI agents (bots) available in the application. Supports optional filtering by name, tenant, and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      botName: { type: 'string', description: 'Filter by bot name (optional)' },
      maxResultCount: { type: 'number', description: 'Max number of results (default 20, max 1000)', default: 20 },
      skipCount: { type: 'number', description: 'Number of records to skip for pagination', default: 0 }
    }
  },
  async execute(args) {
    const params = new URLSearchParams();
    if (args.botName) params.set('BotName', args.botName);
    params.set('MaxResultCount', String(args.maxResultCount ?? 20));
    params.set('SkipCount', String(args.skipCount ?? 0));

    const data = await apiFetch(`/api/services/app/Bot/GetBots?${params}`);
    return {
      totalCount: data.result?.totalCount ?? 0,
      items: (data.result?.items ?? []).map(bot => ({
        id: bot.id,
        name: bot.name,
        deploymentStatus: bot.deploymentStatus,
        creationTime: bot.creationTime
      }))
    };
  }
};
