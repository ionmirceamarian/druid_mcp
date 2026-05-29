import { apiFetch } from '../auth.js';

export const saveLinkTool = {
  name: 'save_link',
  description: 'Create or update a link (transition/condition) between two flow steps. Use get_link to fetch the existing link first, modify the condition, then save it here.',
  inputSchema: {
    type: 'object',
    required: ['parentStepId', 'childStepId', 'botId'],
    properties: {
      parentStepId:   { type: 'string', description: 'Source step ID (UUID)' },
      childStepId:    { type: 'string', description: 'Target step ID (UUID)' },
      botId:          { type: 'string', description: 'Bot/Agent ID (UUID)' },
      linkId:         { type: 'string', description: 'Link ID for updates — null/omit to create new' },
      condition:      { type: 'string', description: 'Condition expression string (optional)' },
      parentStepName: { type: 'string', description: 'Source step name (optional, for display)' },
      childStepName:  { type: 'string', description: 'Target step name (optional, for display)' },
      fromPort:       { type: 'string', description: 'Output port on the parent step (optional)' },
      toPort:         { type: 'string', description: 'Input port on the child step (optional)' },
      comment:        { type: 'string', description: 'Internal comment (optional)' }
    }
  },
  async execute(args) {
    const body = {
      parentStepId:   args.parentStepId,
      childStepId:    args.childStepId,
      botId:          args.botId,
      linkId:         args.linkId ?? null,
      condition:      args.condition ?? null,
      parentStepName: args.parentStepName ?? null,
      childStepName:  args.childStepName ?? null,
      fromPort:       args.fromPort ?? null,
      toPort:         args.toPort ?? null,
      comment:        args.comment ?? null,
      isSystemManaged: false
    };

    const data = await apiFetch('/api/services/app/FlowStep/SaveLink', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return data.result ?? data;
  }
};
