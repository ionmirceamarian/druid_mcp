import { apiFetch } from '../auth.js';
import { normText, statusOf, truncate } from '../lib/i18n.js';

const EMPTY_ID = '00000000-0000-0000-0000-000000000000';

function expand(input, defaultCode) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return { [defaultCode]: input };
  return { ...input };
}

export const translateLinkConditionTool = {
  name: 'translate_link_condition',
  description: 'Patch a transition condition in place, per language, preserving the other languages. Reads the link first and re-sends its full definition including translations, so a condition edit no longer drops the per-language rows the way save_link does. Pass mirror:true to write the same condition to every language, which is how conditions are normally maintained. Defaults to dryRun — pass dryRun:false to save.',
  inputSchema: {
    type: 'object',
    required: ['flowId'],
    properties: {
      flowId:     { type: 'string', description: 'Flow ID (UUID)' },
      linkId:     { type: 'string', description: 'Link ID (UUID) — from get_flow_light paths[].linkId. Alternative to fromStepId + toStepId.' },
      fromStepId: { type: 'string', description: 'Source step ID (UUID), used with toStepId when linkId is not given' },
      toStepId:   { type: 'string', description: 'Target step ID (UUID), used with fromStepId when linkId is not given' },
      condition:  {
        description: 'New condition. A plain string targets the default language only. An object keyed by language code targets exactly those languages. Pass an empty string to clear a language.',
        anyOf: [{ type: 'string' }, { type: 'object' }]
      },
      mirror: { type: 'boolean', description: 'Copy the default-language condition to every other bot language you did not name explicitly (default false)' },
      dryRun: { type: 'boolean', description: 'Report the diff without saving (default true)' }
    }
  },

  async execute(args) {
    const dryRun = args.dryRun !== false;
    const params = new URLSearchParams({ flowId: args.flowId });
    const listed = await apiFetch(`/api/services/app/FlowStep/GetAllLinks?${params}`);
    const links = listed.result ?? listed;

    const match = (args.linkId)
      ? links.find(l => l.linkId === args.linkId)
      : links.find(l => l.parentStepId === args.fromStepId && l.childStepId === args.toStepId);

    if (!match) return { saved: false, error: 'link not found in this flow', linkId: args.linkId ?? null, fromStepId: args.fromStepId ?? null, toStepId: args.toStepId ?? null };

    const dto = JSON.parse(JSON.stringify(match));
    const defaultCode = dto.defaultBotLanguage || dto.defaultBotLaguage || 'en-US';
    const known = (dto.translations || []).map(t => t.languageCode).filter(Boolean);
    const allCodes = [defaultCode, ...(dto.botLanguages || []).map(l => l.name).filter(Boolean), ...known];
    const otherCodes = [...new Set(allCodes)].filter(c => c !== defaultCode);

    const targets = expand(args.condition, defaultCode);
    if (!targets) return { saved: false, error: 'no condition supplied' };
    if (args.mirror && targets[defaultCode] !== undefined) {
      for (const c of otherCodes) if (targets[c] === undefined) targets[c] = targets[defaultCode];
    }

    const changes = [];
    dto.translations = Array.isArray(dto.translations) ? dto.translations : [];
    for (const [code, value] of Object.entries(targets)) {
      if (code === defaultCode) {
        changes.push({ language: code, before: truncate(dto.condition, 200), after: truncate(value, 200) });
        dto.condition = value;
        continue;
      }
      let row = dto.translations.find(t => t && t.languageCode === code);
      if (!row) { row = { id: EMPTY_ID, condition: null, languageCode: code, languageIcon: null, isCustomCondition: false }; dto.translations.push(row); }
      changes.push({ language: code, before: truncate(row.condition, 200), after: truncate(value, 200) });
      row.condition = value;
    }

    const drift = [];
    for (const code of otherCodes) {
      const row = dto.translations.find(t => t && t.languageCode === code);
      const st = statusOf(dto.condition, row ? row.condition : null, normText);
      if (st === 'differs' || st === 'missing') drift.push({ language: code, status: st });
    }

    const summary = {
      linkId: dto.linkId,
      from: dto.parentStepName || dto.parentStepId,
      to: dto.childStepName || dto.childStepId,
      defaultLanguage: defaultCode,
      changes,
      driftAfterWrite: drift
    };

    if (dryRun) return { ...summary, dryRun: true, saved: false };

    const body = {
      parentStepId: dto.parentStepId,
      childStepId: dto.childStepId,
      botId: dto.botId,
      linkId: dto.linkId,
      condition: dto.condition,
      parentStepName: dto.parentStepName ?? null,
      childStepName: dto.childStepName ?? null,
      translations: dto.translations,
      defaultBotLanguage: dto.defaultBotLanguage ?? null,
      defaultBotIcon: dto.defaultBotIcon ?? null,
      useAuthoringTranslation: dto.useAuthoringTranslation ?? false,
      botLanguages: dto.botLanguages ?? [],
      isSystemManaged: dto.isSystemManaged ?? false,
      comment: dto.comment ?? null,
      fromPort: dto.fromPort ?? null,
      toPort: dto.toPort ?? null
    };
    const saved = await apiFetch('/api/services/app/FlowStep/SaveLink', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return { ...summary, saved: true, result: saved.result ?? saved };
  }
};
