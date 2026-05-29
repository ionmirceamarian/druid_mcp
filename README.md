# druid-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the **Druid** conversational AI platform. It exposes a comprehensive set of tools so AI assistants (Claude, Cursor, etc.) can read, create, update, debug, and publish resources inside a Druid tenant — without any manual UI interaction.

## What it does

Druid is a low-code platform for building AI-powered chatbots (bots/agents). A Druid tenant is organized around:

- **Bots (AI agents)** — the conversational AI instances
- **Solutions** — logical groupings of flows, entities, and connectors
- **Entities** — structured data models (fields, types)
- **Flows** — conversation logic built from steps connected by links/transitions
- **Connectors (Apps)** — external system connections (REST, SQL, SOAP, CRM, UiPath, …)
- **Integrations (Connector Actions)** — specific operations defined on top of a connector

`druid-mcp` gives an AI assistant full read/write access to all of these over the Druid REST API, authenticated transparently via a cached JWT token.

The server supports two transports:
- **HTTP/SSE** (default) — runs as an Express server; Claude Desktop or any MCP client connects via `http://localhost:3100/sse`
- **stdio** — set `MCP_MODE=stdio` for the classic pipe-based MCP transport

---

## Tools

### Configuration

| Tool | Description |
|------|-------------|
| `set_config` | Update `apiBaseUrl`, `apiUsername`, and `apiPassword` at runtime — no restart needed; auth token is automatically invalidated |

### Agents & Solutions

| Tool | Description |
|------|-------------|
| `get_ai_agents` | List bots, with optional name/tenant filter and pagination |
| `get_solutions` | List solutions, optionally filtered by bot or name |
| `get_entities` | List entity metadata (data models), filterable by bot, solution, or name |
| `create_entity` | Create a new entity inside a bot/solution |
| `create_field_inside_entity` | Add a new field to an existing entity |

### Flows

| Tool | Description |
|------|-------------|
| `get_flows_paged` | Search and list flows with optional filtering by name, solution, type, and pagination |
| `get_flow_for_edit` | Load a flow for editing; pass no Id to get a blank template for creating a new flow |
| `create_or_update_flow` | Create a new flow or update an existing one |
| `get_palette_elements` | Get available flow step types for a given flow/bot |
| `create_or_update_flow_step` | Create a new step or update an existing one inside a flow |
| `get_link` | Inspect the link/transition (including conditions) between two flow steps |
| `save_link` | Create or update a link/transition between two flow steps |
| `get_entities_flow_context` | Get the full flow context — all steps, their types, mappings, and data available at each point |
| `get_flow_roles` | Get the RBAC roles currently assigned to a flow |
| `update_flow_roles` | Set the RBAC roles that have access to a flow |
| `get_current_user_roles` | Get all roles assigned to the currently authenticated user |

### Connectors (Apps)

Connectors represent configured connections to external systems (REST APIs, databases, CRM platforms, etc.).

| Tool | Description |
|------|-------------|
| `get_connectors` | List connectors with optional filters (name, type, bot, solution) |
| `get_connector_for_edit` | Load a connector for editing; pass no Id with a `connectorType` to get a blank template |
| `create_or_update_connector` | Create or update a connector; omit `connector.id` to create, include it to update |
| `delete_connector` | Delete a connector by ID; use `fromSolution=true` to remove only its solution link |
| `test_connector_app` | Test a connector configuration (verify connectivity) without saving |
| `get_dictionary_connectors` | List connectors available to a specific bot as a simple id/displayText combobox |
| `get_connector_related_elements` | List all elements (integrations, flow steps, webviews) that reference a connector |
| `get_connector_related_integrations` | List integration names that use a given connector for a bot |
| `get_connector_related_flowsteps` | List flow steps that use a given connector, optionally scoped to a bot or solution |

### Integrations (Connector Actions)

Integrations define specific operations (e.g. a single REST call) on top of a connector.

| Tool | Description |
|------|-------------|
| `get_connector_actions` | List integrations with filters (name, solution, task type, connector code) |
| `get_connector_action_for_edit` | Load an integration for editing; pass no Id with a `type` to get a blank template |
| `create_or_update_connector_action` | Create or update an integration header |
| `delete_connector_action` | Delete an integration by ID |
| `clone_connector_action` | Clone an existing integration into a new one; returns the new UUID |
| `get_rest_connector_task_for_edit` | Load the REST task body of an integration for editing (URL, method, headers, mappings) |
| `create_or_update_rest_connector_task` | Save the REST task body for an integration |
| `test_rest_connector_task` | Test-execute a REST integration without saving; captures the full request/response |
| `get_connector_action_related_elements` | List all elements (flow steps, apps, webviews) that reference an integration |
| `get_connector_action_related_flowsteps` | List flow steps that use a given integration |
| `get_connector_action_related_apps` | List connector (app) names related to a given integration |
| `get_connector_history_paged` | List execution history rows for an integration; filter by date, correlationId, exception status |

### Publishing

Changes to entities, connectors, and integrations are saved as drafts and must be explicitly published to go live.

| Tool | Description |
|------|-------------|
| `get_pending_changes` | Show how many draft changes are pending, broken out by category |
| `get_publish_status` | Check whether a publish is currently in progress |
| `publish_changes` | Publish all pending draft changes in one shot (entities, connectors, integrations, document templates) |

### Debugging

| Tool | Description |
|------|-------------|
| `get_admin_conversation_history_paged` | List conversation history messages for a bot in a date range; includes activityId, correlationId, flow/step name, message, status |
| `get_debugging_tool_chat_activity_detail_paged` | Drill into a specific chat activity (by activityId) — returns conversation path, per-step detail, integrations called, and NLU history |
| `get_bot_for_edit` | Load a bot's full configuration including webchat settings, KPI settings, and LLM prompt defaults |
| `get_connector_action_history_data_by_id` | Get the full request/response payload for a single connector execution |
| `get_connector_history_paged` | List execution history rows for an integration with optional exception/date filters |
| `get_integration_log` | Raw wrapper around the Druid UI's integration log endpoint — lists connector executions for a given bot + correlationId |
| `get_conversation_contexts` | One-call aggregator: fetches every integration context for a conversation, groups by turn, and returns a compact diagnostics tree (or saves to file) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Edit `.env`:

```env
API_BASE_URL=https://your-druid-app.example.com
API_USERNAME=your_username_or_email
API_PASSWORD=your_password
```

> **Tip:** You can skip this step and instead call `set_config` from the AI at runtime.

### 3. Run the server

**HTTP/SSE mode (default):**

```bash
node src/server.js
```

The server listens on port `3100` (override with `PORT=<n>`).

**stdio mode:**

```bash
MCP_MODE=stdio node src/server.js
```

---

## Connecting to Claude Desktop

### HTTP/SSE (recommended)

Start the server first (`node src/server.js`), then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "druid": {
      "type": "sse",
      "url": "http://localhost:3100/sse"
    }
  }
}
```

### stdio

```json
{
  "mcpServers": {
    "druid": {
      "command": "node",
      "args": ["/path/to/druid_mcp/src/server.js"],
      "env": {
        "MCP_MODE": "stdio",
        "API_BASE_URL": "https://your-druid-app.example.com",
        "API_USERNAME": "your_username",
        "API_PASSWORD": "your_password"
      }
    }
  }
}
```

---

## Authentication

Tokens are fetched once via `POST /api/TokenAuth/Authenticate` and cached for 23 hours. On expiry (or after a `set_config` call) the server re-authenticates automatically before the next request.

---

## Project structure

```
druid_mcp/
├── src/
│   ├── auth.js                                  # Token auth + cached apiFetch helper
│   ├── server.js                                # MCP server entry point (stdio + HTTP/SSE)
│   └── tools/
│       ├── setConfig.js                         # Runtime config update
│       ├── getAiAgents.js
│       ├── getSolutions.js
│       ├── getEntities.js
│       ├── createEntity.js
│       ├── createField.js
│       ├── getFlowsPaged.js                     # Flow tools
│       ├── getFlowForEdit.js
│       ├── createOrUpdateFlow.js
│       ├── getPaletteElements.js
│       ├── createOrUpdateFlowStep.js
│       ├── getLink.js
│       ├── saveLink.js
│       ├── getEntitiesFlowContext.js
│       ├── getFlowRoles.js
│       ├── updateFlowRoles.js
│       ├── getCurrentUserRoles.js
│       ├── getConnectors.js                     # Connector (app) tools
│       ├── getConnectorForEdit.js
│       ├── createOrUpdateConnector.js
│       ├── deleteConnector.js
│       ├── testConnectorApp.js
│       ├── getDictionaryConnectors.js
│       ├── getConnectorRelatedElements.js
│       ├── getConnectorRelatedIntegrations.js
│       ├── getConnectorRelatedFlowsteps.js
│       ├── getConnectorActions.js               # Integration (connector action) tools
│       ├── getConnectorActionForEdit.js
│       ├── createOrUpdateConnectorAction.js
│       ├── deleteConnectorAction.js
│       ├── cloneConnectorAction.js
│       ├── getRestConnectorTaskForEdit.js
│       ├── createOrUpdateRestConnectorTask.js
│       ├── testRestConnectorTask.js
│       ├── getConnectorActionRelatedElements.js
│       ├── getConnectorActionRelatedFlowsteps.js
│       ├── getConnectorActionRelatedApps.js
│       ├── getConnectorHistoryPaged.js
│       ├── getPendingChanges.js                 # Publish tools
│       ├── getPublishStatus.js
│       ├── publishChanges.js
│       ├── getAdminConversationHistoryPaged.js  # Debug tools
│       ├── getDebuggingToolChatActivityDetailPaged.js
│       ├── getBotForEdit.js
│       ├── getConnectorActionHistoryDataById.js
│       ├── getIntegrationLog.js
│       └── getConversationContexts.js
├── .env.example
├── package.json
└── swagger.json
```

## Adding more tools

1. Create a new file in `src/tools/` exporting an object with `name`, `description`, `inputSchema`, and `execute`.
2. Import it in `src/server.js` and add it to the `tools` array.