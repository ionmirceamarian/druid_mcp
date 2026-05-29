import { apiFetch } from '../auth.js';

export const getPendingChangesTool = {
  name: 'get_pending_changes',
  description: 'Show how many draft changes are pending publish for the current tenant. Returns PublishChangesDto with counts broken out by category: connectorActionNo (integrations), tenantConnectorNo (apps/connectors), entityMetadataNo (entities), documentTemplateNo. A single publish_changes call commits all of them.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    const data = await apiFetch(`/api/services/app/ConnectorHost/GetConnectorPublishChanges`);
    return data.result ?? data;
  }
};
