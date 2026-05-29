import { apiFetch } from '../auth.js';

export const createEntityTool = {
  name: 'create_entity',
  description: 'Create a new entity (data model) in the application.',
  inputSchema: {
    type: 'object',
    required: ['name', 'botId'],
    properties: {
      name:        { type: 'string', description: 'Internal name of the entity (no spaces)' },
      displayName: { type: 'string', description: 'Human-readable display name' },
      category:    { type: 'string', description: 'Category name (optional, defaults to entity name)' },
      botId:       { type: 'string', description: 'Bot/Agent ID this entity belongs to (UUID)' },
      solutionId:  { type: 'string', description: 'Solution ID to place the entity in (UUID, optional)' },
      description: { type: 'string', description: 'Description of the entity (optional)' }
    }
  },
  async execute(args) {
    const body = {
      entityMetadata: {
        id: null,
        name: args.name,
        assemblyName: null,
        className: null,
        tenantId: null,
        category: args.category ?? args.name,
        utterances: null,
        sourceId: '00000000-0000-0000-0000-000000000000',
        botId: args.botId,
        lastModifierUserName: null,
        displayName: { 'en-US': args.displayName ?? '' },
        iconUrl: null,
        pluralName: { 'en-US': '' },
        comment: args.description ?? null
      },
      solutionId: args.solutionId ?? null
    };

    const data = await apiFetch('/api/services/app/EntityMetadata/CreateOrUpdateEntityMetadata', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return {
      id: data.result?.id,
      name: data.result?.name,
      success: !!data.result
    };
  }
};
