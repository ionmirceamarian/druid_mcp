import { apiFetch } from '../auth.js';

export const publishChangesTool = {
  name: 'publish_changes',
  description: 'Publish all pending draft changes for the current tenant in one shot — covers entities, apps (connectors), integrations (connector actions), and document templates. Call this after creating/updating any of those objects to make the changes live. Use get_pending_changes first to preview counts; use get_publish_status to poll until publishInProgress=false.',
  inputSchema: {
    type: 'object',
    properties: {
      confirm: { type: 'boolean', description: 'Set true to actually publish. Acts as a guardrail against accidental publishes.', default: false }
    },
    required: ['confirm']
  },
  async execute(args) {
    if (!args.confirm) {
      throw new Error('publish_changes requires confirm=true to proceed.');
    }
    const data = await apiFetch(`/api/services/app/ConnectorHost/PublishConnectorActionsChanges`, {
      method: 'POST'
    });
    return { published: true, response: data.result ?? data };
  }
};
