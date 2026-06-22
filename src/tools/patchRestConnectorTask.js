import { apiFetch } from '../auth.js';

/**
 * Deep-merge source into target in-place.
 * Arrays are replaced (not concatenated) — pass the full desired array.
 */
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export const patchRestConnectorTaskTool = {
  name: 'patch_rest_connector_task',
  description: `Partially update a REST connector task without supplying the full DTO.
Fetches the current task, merges your changes, and saves.

Provide actionId plus any subset of task fields to change:
  url, method, connectionCode, requestHeaders,
  toConnectorEntityMapping  (or just toConnectorEntityMapping.fieldMappings),
  fromConnectorEntityMapping (or just fromConnectorEntityMapping.fieldMappings)

Arrays (fieldMappings, requestHeaders) are REPLACED entirely when provided — pass the full desired array.

fieldMappings item schema:
  druidEntityFieldName  (string, required) — Druid entity field name
  connectorFieldName    (string, required) — JSONPath for response (e.g. "$.data.token") or field key for request
  connectorFieldType    (string)           — fromConnector: "Text" | "Header" | "StatusCode"
                                             toConnector:   "BodyField" | "HeaderField" | "QueryParamField"
  isEntityList          (boolean)          — true if field maps to a collection
  druidChildMappingCode (string|null)      — optional child entity mapping code

Example — update only the field mappings:
{
  "actionId": "03662b0d-...",
  "task": {
    "url": "/validateinittoken",
    "method": "POST",
    "toConnectorEntityMapping": {
      "fieldMappings": [
        { "druidEntityFieldName": "inittoken", "connectorFieldName": "inittoken", "connectorFieldType": "BodyField", "isEntityList": false }
      ]
    },
    "fromConnectorEntityMapping": {
      "fieldMappings": [
        { "druidEntityFieldName": "delegationtoken", "connectorFieldName": "$.data.delegationtoken", "connectorFieldType": "Text", "isEntityList": false }
      ]
    }
  }
}`,
  inputSchema: {
    type: 'object',
    properties: {
      actionId: { type: 'string', description: 'Connector action ID (UUID)' },
      taskId:   { type: 'string', description: 'Task ID (UUID) — optional' },
      task: {
        type: 'object',
        description: 'Partial task fields to merge. Any key not provided is left unchanged.',
        properties: {
          url:            { type: 'string' },
          method:         { type: 'string' },
          connectionCode: { type: 'string' },
          requestHeaders: { type: 'array', items: { type: 'object' } },
          toConnectorEntityMapping:   { type: 'object' },
          fromConnectorEntityMapping: { type: 'object' }
        }
      }
    },
    required: ['actionId', 'task']
  },
  async execute(args) {
    // 1. Fetch current full task DTO
    const params = new URLSearchParams();
    params.set('ActionId', args.actionId);
    if (args.taskId) params.set('TaskId', args.taskId);

    const fetchData = await apiFetch(
      `/api/services/app/ConnectorAction/GetRestConnectorTaskForEditOutputDto?${params}`
    );
    const current = fetchData.result ?? fetchData;

    // 2. Deep-merge the partial task fields into the current task
    deepMerge(current.task, args.task);

    // 3. Save — the API expects { action, task }
    const payload = {
      action: current.action,
      task:   current.task
    };

    const saveData = await apiFetch(
      `/api/services/app/ConnectorAction/CreateOrUpdateRestConnectorTask`,
      { method: 'POST', body: JSON.stringify(payload) }
    );

    return { id: saveData.result ?? saveData };
  }
};
