import { apiFetch } from '../auth.js';

export const getBotForEditTool = {
  name: 'get_bot_for_edit',
  description: 'Debug: get a bot (AI agent) configuration for editing. Returns GetBotForEditOutput with bot, botWebChat, kpiSettings and LLM prompt defaults. Pass the bot Id (UUID).',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Bot ID (UUID)' }
    },
    required: ['id']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('Id', args.id);

    const data = await apiFetch(`/api/services/app/Bot/GetBotForEditAsync?${params}`);
    return data.result ?? data;
  }
};
