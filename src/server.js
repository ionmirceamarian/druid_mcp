import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { getAiAgentsTool }             from './tools/getAiAgents.js';
import { getSolutionsTool }            from './tools/getSolutions.js';
import { getEntitiesTool }             from './tools/getEntities.js';
import { createEntityTool }            from './tools/createEntity.js';
import { createFieldTool }             from './tools/createField.js';
import { setConfigTool }               from './tools/setConfig.js';

// Flow tools
import { getFlowForEditTool }          from './tools/getFlowForEdit.js';
import { createOrUpdateFlowTool }      from './tools/createOrUpdateFlow.js';
import { getCurrentUserRolesTool }     from './tools/getCurrentUserRoles.js';
import { getFlowRolesTool }            from './tools/getFlowRoles.js';
import { updateFlowRolesTool }         from './tools/updateFlowRoles.js';
import { getPaletteElementsTool }      from './tools/getPaletteElements.js';
import { createOrUpdateFlowStepTool }  from './tools/createOrUpdateFlowStep.js';
import { getLinkTool }                 from './tools/getLink.js';
import { saveLinkTool }                from './tools/saveLink.js';
import { getFlowsPagedTool }           from './tools/getFlowsPaged.js';
import { getEntitiesFlowContextTool }  from './tools/getEntitiesFlowContext.js';

// Debug tools
import { getAdminConversationHistoryPagedTool }       from './tools/getAdminConversationHistoryPaged.js';
import { getBotForEditTool }                          from './tools/getBotForEdit.js';
import { getDebuggingToolChatActivityDetailPagedTool } from './tools/getDebuggingToolChatActivityDetailPaged.js';
import { getConnectorActionHistoryDataByIdTool }      from './tools/getConnectorActionHistoryDataById.js';
import { getConversationContextsTool }                from './tools/getConversationContexts.js';
import { getIntegrationLogTool }                      from './tools/getIntegrationLog.js';

// Connector ("app") tools
import { getConnectorsTool }                          from './tools/getConnectors.js';
import { getConnectorForEditTool }                    from './tools/getConnectorForEdit.js';
import { createOrUpdateConnectorTool }                from './tools/createOrUpdateConnector.js';
import { deleteConnectorTool }                        from './tools/deleteConnector.js';
import { getConnectorRelatedElementsTool }            from './tools/getConnectorRelatedElements.js';
import { getConnectorRelatedIntegrationsTool }        from './tools/getConnectorRelatedIntegrations.js';
import { getConnectorRelatedFlowstepsTool }           from './tools/getConnectorRelatedFlowsteps.js';
import { testConnectorAppTool }                       from './tools/testConnectorApp.js';
import { getDictionaryConnectorsTool }                from './tools/getDictionaryConnectors.js';

// ConnectorAction (integration) tools
import { getConnectorActionsTool }                    from './tools/getConnectorActions.js';
import { getConnectorActionForEditTool }              from './tools/getConnectorActionForEdit.js';
import { createOrUpdateConnectorActionTool }          from './tools/createOrUpdateConnectorAction.js';
import { deleteConnectorActionTool }                  from './tools/deleteConnectorAction.js';
import { getConnectorActionRelatedElementsTool }      from './tools/getConnectorActionRelatedElements.js';
import { getConnectorActionRelatedFlowstepsTool }     from './tools/getConnectorActionRelatedFlowsteps.js';
import { getConnectorActionRelatedAppsTool }          from './tools/getConnectorActionRelatedApps.js';
import { cloneConnectorActionTool }                   from './tools/cloneConnectorAction.js';
import { getConnectorHistoryPagedTool }               from './tools/getConnectorHistoryPaged.js';
import { getRestConnectorTaskForEditTool }            from './tools/getRestConnectorTaskForEdit.js';
import { createOrUpdateRestConnectorTaskTool }        from './tools/createOrUpdateRestConnectorTask.js';
import { testRestConnectorTaskTool }                  from './tools/testRestConnectorTask.js';

// Publish tools
import { getPendingChangesTool }                      from './tools/getPendingChanges.js';
import { getPublishStatusTool }                       from './tools/getPublishStatus.js';
import { publishChangesTool }                         from './tools/publishChanges.js';

// Views (EntityMetadata WebViews) tools
import { getEntityWebViewsTool }                      from './tools/getEntityWebViews.js';
import { getEntityViewForEditTool }                   from './tools/getEntityViewForEdit.js';
import { createOrUpdateViewTool }                     from './tools/createOrUpdateView.js';
import { deleteEntityWebViewTool }                    from './tools/deleteEntityWebView.js';
import { setEntityWebViewAsDefaultTool }              from './tools/setEntityWebViewAsDefault.js';
import { cloneEntityWebViewTool }                     from './tools/cloneEntityWebView.js';
import { getWebViewRolesTool }                        from './tools/getWebViewRoles.js';
import { updateWebViewRolesTool }                     from './tools/updateWebViewRoles.js';
import { getRelatedWebViewsTool }                     from './tools/getRelatedWebViews.js';
import { setWebViewsOrderNumberTool }                 from './tools/setWebViewsOrderNumber.js';

// Dashboard tools
import { getDashboardsTool }                          from './tools/getDashboards.js';
import { getDashboardForEditTool }                    from './tools/getDashboardForEdit.js';
import { createOrUpdateDashboardTool }                from './tools/createOrUpdateDashboard.js';
import { deleteDashboardTool }                        from './tools/deleteDashboard.js';

const tools = [
  setConfigTool,
  getAiAgentsTool,
  getSolutionsTool,
  getEntitiesTool,
  createEntityTool,
  createFieldTool,
  // Flow tools
  getFlowForEditTool,
  createOrUpdateFlowTool,
  getCurrentUserRolesTool,
  getFlowRolesTool,
  updateFlowRolesTool,
  getPaletteElementsTool,
  createOrUpdateFlowStepTool,
  getLinkTool,
  saveLinkTool,
  getFlowsPagedTool,
  getEntitiesFlowContextTool,
  // Debug tools
  getAdminConversationHistoryPagedTool,
  getBotForEditTool,
  getDebuggingToolChatActivityDetailPagedTool,
  getConnectorActionHistoryDataByIdTool,
  getConversationContextsTool,
  getIntegrationLogTool,
  // Connector ("app") tools
  getConnectorsTool,
  getConnectorForEditTool,
  createOrUpdateConnectorTool,
  deleteConnectorTool,
  getConnectorRelatedElementsTool,
  getConnectorRelatedIntegrationsTool,
  getConnectorRelatedFlowstepsTool,
  testConnectorAppTool,
  getDictionaryConnectorsTool,
  // ConnectorAction (integration) tools
  getConnectorActionsTool,
  getConnectorActionForEditTool,
  createOrUpdateConnectorActionTool,
  deleteConnectorActionTool,
  getConnectorActionRelatedElementsTool,
  getConnectorActionRelatedFlowstepsTool,
  getConnectorActionRelatedAppsTool,
  cloneConnectorActionTool,
  getConnectorHistoryPagedTool,
  getRestConnectorTaskForEditTool,
  createOrUpdateRestConnectorTaskTool,
  testRestConnectorTaskTool,
  // Publish tools
  getPendingChangesTool,
  getPublishStatusTool,
  publishChangesTool,
  // Views tools
  getEntityWebViewsTool,
  getEntityViewForEditTool,
  createOrUpdateViewTool,
  deleteEntityWebViewTool,
  setEntityWebViewAsDefaultTool,
  cloneEntityWebViewTool,
  getWebViewRolesTool,
  updateWebViewRolesTool,
  getRelatedWebViewsTool,
  setWebViewsOrderNumberTool,
  // Dashboard tools
  getDashboardsTool,
  getDashboardForEditTool,
  createOrUpdateDashboardTool,
  deleteDashboardTool
];

const toolMap = Object.fromEntries(tools.map(t => [t.name, t]));

function createServer() {
  const server = new Server(
    { name: 'druid-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name:        t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolMap[request.params.name];
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
        isError: true
      };
    }
    try {
      const result = await tool.execute(request.params.arguments ?? {});
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true
      };
    }
  });

  return server;
}

const PORT = process.env.PORT || 3100;
const mode = process.env.MCP_MODE || 'http';

if (mode === 'stdio') {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Druid MCP server running on stdio');
} else {
  const app = express();
  // NOTE: Do NOT use express.json() globally — SSEServerTransport reads raw body itself

  const sessions = new Map(); // sessionId -> SSEServerTransport

  app.get('/sse', async (req, res) => {
    console.error('[SSE] New connection');
    const server = createServer();
    const transport = new SSEServerTransport('/messages', res);

    sessions.set(transport.sessionId, transport);
    console.error(`[SSE] Session started: ${transport.sessionId}`);

    res.on('close', () => {
      console.error(`[SSE] Session closed: ${transport.sessionId}`);
      sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sessions.get(sessionId);

    if (!transport) {
      console.error(`[POST] Unknown session: ${sessionId}`);
      return res.status(400).json({ error: `Unknown session: ${sessionId}` });
    }

    // Pass raw req/res — let the SDK handle body parsing
    await transport.handlePostMessage(req, res);
  });

  // Streamable HTTP transport (used by Claude desktop app and modern clients)
  app.post('/mcp', express.json(), async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    res.status(405).json({ error: 'Use POST /mcp for Streamable HTTP or GET /sse for SSE' });
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', server: 'druid-mcp', sessions: sessions.size }));

  app.listen(PORT, () => {
    console.error(`Druid MCP HTTP/SSE server running on http://localhost:${PORT}`);
    console.error(`  SSE:    http://localhost:${PORT}/sse`);
    console.error(`  Health: http://localhost:${PORT}/health`);
  });
}
