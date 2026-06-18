import { apiFetch } from '../auth.js';

export const getRelatedWebViewsTool = {
  name: 'get_related_web_views',
  description: 'List views that are related to a given view (e.g. sub-views or linked views).',
  inputSchema: {
    type: 'object',
    required: ['webviewId'],
    properties: {
      webviewId: { type: 'string', description: 'Source view UUID' }
    }
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/EntityMetadata/GetRelatedWebViews?webviewId=${args.webviewId}`);
    return data.result ?? data;
  }
};
