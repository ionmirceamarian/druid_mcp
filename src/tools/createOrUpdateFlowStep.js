import { apiFetch } from '../auth.js';

export const createOrUpdateFlowStepTool = {
  name: 'create_or_update_flow_step',
  description: 'Create a new step inside a flow or update an existing one. Use get_palette_elements to discover valid step types. Leave flowStep.id null to create a new step.',
  inputSchema: {
    type: 'object',
    required: ['flowStep'],
    properties: {
      flowStep: {
        type: 'object',
        description: 'The flow step definition (CreateFlowStepInput)',
        required: ['flowId', 'name', 'type', 'botId'],
        properties: {
          id:           { type: 'string', description: 'Step ID — null/omit to create new' },
          flowId:       { type: 'string', description: 'Parent flow ID (UUID, required)' },
          botId:        { type: 'string', description: 'Bot/Agent ID (UUID, required)' },
          name:         { type: 'string', description: 'Step name (required)' },
          type:         { type: 'string', description: 'Step type key from get_palette_elements (required)' },
          message:      { type: 'string', description: 'Step message/content' },
          isFirstStep:  { type: 'boolean', description: 'Whether this is the first step of the flow' },
          isLastStep:   { type: 'boolean', description: 'Whether this is the last step of the flow' },
          isSkippable:  { type: 'boolean' },
          isRepeater:   { type: 'boolean' },
          subFlowId:    { type: 'string', description: 'ID of a sub-flow to call (for SubFlow step types)' },
          inputMapping: { type: 'string', description: 'JSON string for input mapping' },
          meta:     { type: 'string', description: 'JSON string for step metadata' },
          comment:      { type: 'string', description: 'Internal comment/note for this step' }
        }
      },
      parentFlowStepId:     { type: 'string', description: 'ID of parent step (for nesting, optional)' },
      addAutoConnectorAction: { type: 'boolean', description: 'Automatically add a connector action (optional)', default: false },
      addToSolutionId:      { type: 'string', description: 'Solution ID to add the step to (optional)' }
    }
  },
  async execute(args) {
    const body = {
      flowStep: args.flowStep,
      parentFlowStepId: args.parentFlowStepId ?? null,
      addAutoConnectorAction: args.addAutoConnectorAction ?? false,
      createNewTaskCode: args.createNewTaskCode ?? null,
      addToSolutionId: args.addToSolutionId ?? null
    };

    const data = await apiFetch('/api/services/app/FlowStep/CreateOrUpdateFlowStep', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return data.result ?? data;
  }
};
