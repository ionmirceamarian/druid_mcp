import { apiFetch } from '../auth.js';

export const getBotKpisTool = {
  name: 'get_bot_kpis',
  description: 'AI Agent Summary dashboard KPIs for a bot in a date range (Dashboards > AI Agent Summary: total messages, intents not recognized, conversation paths not found, invalid inputs, integration errors, security violations, active users per channel, avg flows/steps per user, etc.). Returns items[] of { metricName, metricDisplayLabel, metricType, metricValue, metricSuffix, metricCustomValue } and, with includeTimeSeries, daily/weekly/monthly series. Dates need the timezone offset, e.g. 2026-11-03T00:00:00.000+02:00.',
  inputSchema: {
    type: 'object',
    properties: {
      botId:             { type: 'string', description: 'Bot (AI agent) ID (UUID)' },
      startDate:         { type: 'string', description: 'ISO date-time with offset, inclusive lower bound' },
      endDate:           { type: 'string', description: 'ISO date-time with offset, inclusive upper bound' },
      includeTimeSeries: { type: 'boolean', description: 'Include daily/weekly/monthly series per KPI (default false)' },
      filtered:          { type: 'boolean', description: 'Use GetTenantDashboardDataFiltered instead of GetTenantDashboardData (default false)' }
    },
    required: ['botId', 'startDate', 'endDate']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('BotId', args.botId);
    params.set('StartDate', args.startDate);
    params.set('EndDate', args.endDate);
    params.set('IncludeTimeSeries', String(args.includeTimeSeries ?? false));
    const endpoint = args.filtered ? 'GetTenantDashboardDataFiltered' : 'GetTenantDashboardData';
    const data = await apiFetch(`/api/services/app/ConversationHistory/${endpoint}?${params}`);
    return data.result ?? data;
  }
};
