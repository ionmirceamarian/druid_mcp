import { apiFetch } from '../auth.js';

export const getPublishStatusTool = {
  name: 'get_publish_status',
  description: 'Check whether a publish is currently in progress. Returns ConnectorHostPublishDto: { publishInProgress, tenantId, userName, publishTime }. Use this to poll after publish_changes.',
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    const data = await apiFetch(`/api/services/app/ConnectorHost/GetConnectorPublishStatus`);
    return data.result ?? data;
  }
};
