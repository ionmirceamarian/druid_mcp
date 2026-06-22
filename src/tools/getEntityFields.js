import { apiFetch } from '../auth.js';

export const getEntityFieldsTool = {
  name: 'get_entity_fields',
  description: 'List all fields of a Druid entity. Accepts entityId (UUID) or entityName (string). Returns field names, types, and IDs — useful before writing fieldMappings for a REST connector task.',
  inputSchema: {
    type: 'object',
    properties: {
      entityId:   { type: 'string', description: 'UUID of the entity (preferred)' },
      entityName: { type: 'string', description: 'Name of the entity (used if entityId not provided)' }
    }
  },
  async execute(args) {
    if (!args.entityId && !args.entityName) {
      throw new Error('Provide either entityId or entityName');
    }

    let result;
    if (args.entityId) {
      const params = new URLSearchParams({ entityId: args.entityId });
      const data = await apiFetch(`/api/services/app/EntityMetadata/GetEntityMetadataById?${params}`);
      result = data.result ?? data;
    } else {
      const params = new URLSearchParams({ input: args.entityName });
      const data = await apiFetch(`/api/services/app/EntityMetadata/GetEntityMetadataByName?${params}`);
      result = data.result ?? data;
    }

    // Extract fields from wherever the API puts them
    const meta = result?.entityMetadata ?? result;
    const fields =
      meta?.entityFieldMetadatas ??
      meta?.fields ??
      meta?.entityFields ??
      null;

    if (fields) {
      return {
        entityId:   meta?.id,
        entityName: meta?.name,
        fields: fields.map(f => ({
          id:           f.id,
          name:         f.name,
          displayName:  f.displayName,
          dataType:     f.bussinessDataTypeName ?? f.dataTypeName ?? f.dataTypeFriendlyName,
          isCollection: f.isCollection,
          isNullable:   f.isNullable,
          isPK:         f.isPK
        }))
      };
    }

    // Fallback: return raw result so the caller can inspect it
    return {
      entityId:   meta?.id,
      entityName: meta?.name,
      note: 'Field list not found in standard paths — returning raw entity metadata',
      raw: meta
    };
  }
};
