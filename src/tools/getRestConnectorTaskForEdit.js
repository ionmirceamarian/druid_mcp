import { apiFetch } from '../auth.js';

export const getRestConnectorTaskForEditTool = {
  name: 'get_rest_connector_task_for_edit',
  description: `Get the full REST task DTO for editing (includes dropdown metadata for the UI). For read/update workflows prefer get_rest_connector_task_mappings which strips the noise.
Pass ActionId (connector action id) plus optionally TaskId.

fieldMappings item schema (used in task.toConnectorEntityMapping.fieldMappings and task.fromConnectorEntityMapping.fieldMappings):
  druidEntityFieldName  (string, required) — Druid entity field name
  connectorFieldName    (string, required) — JSONPath for response (e.g. "$.data.token") or field key for request
  connectorFieldType    (string)           — fromConnector: "Text" | "Header" | "StatusCode"
                                             toConnector:   "BodyField" | "HeaderField" | "QueryParamField"
  isEntityList          (boolean)          — true if field maps to a collection
  druidChildMappingCode (string|null)      — optional child entity mapping code`,
  inputSchema: {
    type: 'object',
    properties: {
      actionId: { type: 'string', description: 'Connector action ID (UUID)' },
      taskId:   { type: 'string', description: 'Task ID (UUID) (optional)' }
    },
    required: ['actionId']
  },
  async execute(args) {
    const params = new URLSearchParams();
    params.set('ActionId', args.actionId);
    if (args.taskId) params.set('TaskId', args.taskId);

    const data = await apiFetch(`/api/services/app/ConnectorAction/GetRestConnectorTaskForEditOutputDto?${params}`);
    return data.result ?? data;
  }
};
