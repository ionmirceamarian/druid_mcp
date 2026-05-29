import { apiFetch } from '../auth.js';

export const getDictionaryConnectorsTool = {
  name: 'get_dictionary_connectors',
  description: 'List connectors ("apps") available to a bot, as a simple combobox list (id, displayText). Use this to discover which connectors a bot can use.',
  inputSchema: {
    type: 'object',
    properties: {
      botId: { type: 'string', description: 'Bot ID (UUID)' }
    },
    required: ['botId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('Id', args.botId);

    const data = await apiFetch(`/api/services/app/Dictionary/GetConnectors?${params}`);
    return data.result ?? data;
  }
};
