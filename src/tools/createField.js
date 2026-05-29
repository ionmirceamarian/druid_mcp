import { apiFetch } from '../auth.js';

async function getBusinessDataTypeId(fieldType, entityId) {
  const params = new URLSearchParams({ FieldId: '', EntityId: entityId, BotId: '' });
  const data = await apiFetch(`/api/services/app/EntityFieldMetadata/GetEntityFieldMetadataForEdit?${params}`);
  const dataTypes = data.result?.dataTypes ?? [];
  const match = dataTypes.find(t => t.displayText.toLowerCase() === fieldType.toLowerCase());
  if (!match) {
    const available = dataTypes.map(t => t.displayText).join(', ');
    throw new Error(`Unknown field type "${fieldType}". Available: ${available}`);
  }
  return match.value;
}

export const createFieldTool = {
  name: 'create_field_inside_entity',
  description: 'Create a new field inside an existing entity in the application.',
  inputSchema: {
    type: 'object',
    required: ['entityId', 'botId', 'name', 'fieldType'],
    properties: {
      entityId:    { type: 'string', description: 'UUID of the entity to add the field to' },
      botId:       { type: 'string', description: 'UUID of the bot/agent that owns the entity' },
      name:        { type: 'string', description: 'Internal field name (no spaces)' },
      displayName: { type: 'string', description: 'Human-readable label for the field (optional)' },
      fieldType:   { type: 'string', description: 'Field data type (e.g. Text, Integer, Boolean, Date, DateTime)' },
      isRequired:  { type: 'boolean', default: false },
      description: { type: 'string' }
    }
  },
  async execute(args) {
    const businessDataTypeId = await getBusinessDataTypeId(args.fieldType, args.entityId);

    const payload = {};
    payload['entityFieldMetadata'] = {
      id: null,
      name: args.name,
      isPK: false,
      isNullable: !(args.isRequired ?? false),
      length: 0,
      entityMetadataId: args.entityId,
      referencedEntityId: null,
      referenceToId: null,
      referenceFromId: null,
      dataTypeId: null,
      businessDataTypeId,
      isCollection: false,
      tenantId: null,
      sourceId: '00000000-0000-0000-0000-000000000000',
      hasSensitiveData: false,
      hasMultilanguageRecords: false,
      hideInWebChat: false,
      encryptInConversationHistory: false,
      encryptInConnectorLogs: false,
      availableForOperationsInFlows: false,
      displayName: { 'en-US': args.displayName ?? '' },
      comment: args.description ?? null
    };
    payload['multilanguageFieldOperation'] = 0;

    const data = await apiFetch(
      '/api/services/app/EntityFieldMetadata/CreateOrUpdateEntityFieldMetadata',
      { method: 'POST', body: JSON.stringify(payload) }
    );

    return {
      fieldId: data.result?.id ?? data.result,
      success: !!data.result
    };
  }
};
