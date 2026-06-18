import { apiFetch } from '../auth.js';

export const createOrUpdateViewTool = {
  name: 'create_or_update_view',
  description: 'Create or update an entity view (Table, QuickSearch, Kanban, SubGrid, Lookup, ChartDrilldown, Calendar, Tree). Omit `id` to create. Returns the view UUID.',
  inputSchema: {
    type: 'object',
    required: ['entityId', 'botId', 'solutionId', 'type'],
    properties: {
      id:            { type: 'string', description: 'View UUID — omit to create' },
      entityId:      { type: 'string', description: 'Entity UUID' },
      botId:         { type: 'string', description: 'Bot UUID' },
      solutionId:    { type: 'string', description: 'Solution UUID' },
      name:          { type: 'string', description: 'Internal name' },
      displayName:   { type: 'object', description: 'Localized display name map e.g. {"en":"My View"}', additionalProperties: { type: 'string' } },
      type: {
        type: 'integer',
        description: 'View type: 1=Table, 2=QuickSearch, 3=Kanban, 4=SubGrid, 5=Lookup, 6=ChartDrilldown, 7=Calendar, 8=Tree'
      },
      columns: {
        type: 'array',
        description: 'Column definitions',
        items: {
          type: 'object',
          properties: {
            entityFieldId: { type: 'string' },
            name:          { type: 'string' },
            width:         { type: 'integer' },
            hideOnMobile:  { type: 'boolean' },
            displayName:   { type: 'object', additionalProperties: { type: 'string' } }
          }
        }
      },
      readActionId:   { type: 'string', description: 'Connector action UUID for reading records' },
      deleteActionId: { type: 'string', description: 'Connector action UUID for deleting records' },
      updateActionId: { type: 'string', description: 'Connector action UUID for updating records' },
      groupByFieldId: { type: 'string', description: 'Field UUID to group by (Kanban)' },
      sortByFieldId:  { type: 'string', description: 'Field UUID to sort by' },
      flows:          { type: 'array', items: { type: 'string' }, description: 'Flow UUIDs attached to this view' }
    }
  },
  async execute(args) {
    const data = await apiFetch('/api/services/app/EntityMetadata/CreateOrUpdateView', {
      method: 'POST',
      body: JSON.stringify(args)
    });
    return data.result ?? data;
  }
};
