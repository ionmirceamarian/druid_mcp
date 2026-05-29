import { apiFetch } from '../auth.js';

export const getPaletteElementsTool = {
  name: 'get_palette_elements',
  description: 'Get the available flow step types (palette elements) for a given flow/bot. Returns all step types you can use when creating flow steps via create_or_update_flow_step.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Flow ID (UUID) or Bot ID — used to scope the available palette elements' },
      fromConnectorDesigner: { type: 'boolean', description: 'Set to true if calling from the connector designer context (optional)', default: false }
    }
  },
  async execute(args) {
    const params = new URLSearchParams({ Id: args.id });
    if (args.fromConnectorDesigner != null) params.set('fromConnectorDesigner', String(args.fromConnectorDesigner));

    const data = await apiFetch(`/api/services/app/Flow/GetPaletteElements?${params}`);
    return data.result ?? data;
  }
};
