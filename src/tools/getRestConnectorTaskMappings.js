import { apiFetch } from '../auth.js';

/**
 * fieldMappings item schema (same for both toConnector and fromConnector):
 *   {
 *     "druidEntityFieldName": "myField",          // Druid entity field name (required)
 *     "connectorFieldName":   "$.data.myField",   // JSONPath for response, body/header/query key for request (required)
 *     "connectorFieldType":   "Text",             // For fromConnector: "Text" | "Header" | "StatusCode"
 *                                                 // For toConnector:   "BodyField" | "HeaderField" | "QueryParamField"
 *     "isEntityList":         false,              // true if field is a collection
 *     "druidChildMappingCode": null               // optional child mapping reference
 *   }
 */

export const getRestConnectorTaskMappingsTool = {
  name: 'get_rest_connector_task_mappings',
  description: `Get only the task configuration (url, method, headers, field mappings) for a REST integration — strips all dropdown metadata.
Use this instead of get_rest_connector_task_for_edit when you only need to read or update the mappings.

Returns: { action, task: { url, method, connectionCode, requestHeaders, toConnectorEntityMapping, fromConnectorEntityMapping } }

fieldMappings item schema (both toConnector and fromConnector use the same shape):
  druidEntityFieldName  (string, required) — Druid entity field name
  connectorFieldName    (string, required) — JSONPath (e.g. "$.data.token") for response; field key for request
  connectorFieldType    (string)           — fromConnector: "Text" | "Header" | "StatusCode"
                                             toConnector:   "BodyField" | "HeaderField" | "QueryParamField"
  isEntityList          (boolean)          — true if the field maps to a collection
  druidChildMappingCode (string|null)      — optional child entity mapping code`,
  inputSchema: {
    type: 'object',
    properties: {
      actionId: { type: 'string', description: 'Connector action ID (UUID)' },
      taskId:   { type: 'string', description: 'Task ID (UUID) — optional' }
    },
    required: ['actionId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('ActionId', args.actionId);
    if (args.taskId) params.set('TaskId', args.taskId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRestConnectorTaskForEditOutputDto?${params}`);
    const result = data.result ?? data;

    // Return only the actionable parts — strip dropdown lists
    return {
      action: result.action,
      task: {
        url:             result.task?.url,
        method:          result.task?.method,
        connectionCode:  result.task?.connectionCode,
        requestHeaders:  result.task?.requestHeaders,
        toConnectorEntityMapping:   result.task?.toConnectorEntityMapping,
        fromConnectorEntityMapping: result.task?.fromConnectorEntityMapping
      }
    };
  }
};
