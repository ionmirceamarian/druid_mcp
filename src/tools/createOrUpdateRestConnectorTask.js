import { apiFetch } from '../auth.js';

export const createOrUpdateRestConnectorTaskTool = {
  name: 'create_or_update_rest_connector_task',
  description: `Save the full REST task DTO for an integration. Pass the complete object returned by get_rest_connector_task_for_edit (with your modifications). Returns the task UUID.
For partial updates (only changing url/method/mappings) use patch_rest_connector_task instead.

fieldMappings item schema (for task.toConnectorEntityMapping.fieldMappings and task.fromConnectorEntityMapping.fieldMappings):
  druidEntityFieldName  (string, required) — Druid entity field name
  connectorFieldName    (string, required) — JSONPath for response (e.g. "$.data.token") or field key for request
  connectorFieldType    (string)           — fromConnector: "Text" | "Header" | "StatusCode"
                                             toConnector:   "BodyField" | "HeaderField" | "QueryParamField"
  isEntityList          (boolean)          — true if field maps to a collection
  druidChildMappingCode (string|null)      — optional child entity mapping code`,
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'object', description: 'CreateOrUpdateRestConnectorTaskDto' }
    },
    required: ['input']
  },
  async execute(args) {
    const data = await apiFetch(`/api/services/app/ConnectorAction/CreateOrUpdateRestConnectorTask`, {
      method: 'POST',
      body: JSON.stringify(args.input)
    });
    return { id: data.result ?? data };
  }
};
