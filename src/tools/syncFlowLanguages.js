import { apiFetch } from '../auth.js';
import { normText, normCode, parseMeta, metaString, statusOf, truncate, languagesOf, setVariablesOf } from '../lib/i18n.js';

const EMPTY_ID = '00000000-0000-0000-0000-000000000000';

export function isPureReference(msg) {
  if (msg === null || msg === undefined) return false;
  const raw = String(msg);
  if (raw.trim() === '') return false;
  if (!/\[\[|@[A-Za-z]/.test(raw)) return false;
  let s = raw.replace(/\[\[[^\]]*\]\](\s*\.\s*[A-Za-z0-9_]+)*/g, ' ');
  s = s.replace(/@[A-Za-z0-9_]+/g, ' ');
  s = s.replace(/[\s\p{P}\p{S}\d]+/gu, '');
  return s.length === 0;
}

function emptyStepRow(code) {
  return {
    id: EMPTY_ID, languageCode: code, message: null, messageSpeak: null, metadata: null,
    utterances: null, codeExtension: null,
    isCustomMessage: false, isCustomMetadata: false, isCustomMessageSpeak: false,
    isCustomSetVariables: false, isCustomUtterances: false, isCustomCodeExtension: false,
    isCustomProactiveMessages: false, flowStepAdditionalMetadata: { proactiveMessages: [] }
  };
}

function writeVars(metaStr, pairs) {
  const obj = parseMeta(metaStr) || {};
  if (!Array.isArray(obj.setVariables)) obj.setVariables = [];
  for (const [left, right] of pairs) {
    const entry = obj.setVariables.find(v => v && v.left === left);
    if (entry) entry.right = right;
    else obj.setVariables.push({ left, right, comment: '' });
  }
  return JSON.stringify(obj);
}

export const syncFlowLanguagesTool = {
  name: 'sync_flow_languages',
  description: 'Fill per-language gaps across a whole flow in one call, using the default language as the source. Copies default setVariables values into any language missing them, copies default transition conditions into any language missing them, and copies the default message into all languages when that message is a pure entity or variable reference (no human-readable words). Human-readable messages are never touched — they are returned under needsTranslation so they can be translated properly. Defaults to dryRun — pass dryRun:false to save.',
  inputSchema: {
    type: 'object',
    required: ['flowId'],
    properties: {
      flowId:             { type: 'string', description: 'Flow ID (UUID)' },
      variables:          { type: 'boolean', description: 'Sync setVariables (default true)' },
      conditions:         { type: 'boolean', description: 'Sync transition conditions (default true)' },
      entityMessages:     { type: 'boolean', description: 'Sync messages that are pure entity/variable references (default true)' },
      overwriteDiffering: { type: 'boolean', description: 'Also overwrite values that exist but differ from the default, not just missing ones (default false)' },
      languages:          { type: 'array', items: { type: 'string' }, description: 'Language codes to sync (default: every non-default bot language)' },
      dryRun:             { type: 'boolean', description: 'Report what would change without saving (default true)' }
    }
  },

  async execute(args) {
    const dryRun = args.dryRun !== false;
    const doVars = args.variables !== false;
    const doConds = args.conditions !== false;
    const doEntityMsg = args.entityMessages !== false;
    const overwrite = args.overwriteDiffering === true;

    const mapRes = await apiFetch(`/api/services/app/Flow/GetFlowMap?${new URLSearchParams({ Id: args.flowId })}`);
    const flow = (mapRes.result ?? mapRes).flow ?? (mapRes.result ?? mapRes);
    const { defaultCode, otherCodes } = languagesOf(flow.languages);
    const codes = Array.isArray(args.languages) && args.languages.length
      ? args.languages.filter(c => otherCodes.includes(c))
      : otherCodes;

    const nameById = {};
    for (const s of flow.steps || []) nameById[s.id] = s.name;

    const planned = [];
    const needsTranslation = [];
    const conflicts = [];
    const stepWork = new Map();

    for (const s of flow.steps || []) {
      const rows = {};
      for (const t of s.translations || []) if (t && t.languageCode) rows[t.languageCode] = t;
      const defMetaStr = metaString(s);
      const defVars = setVariablesOf(defMetaStr);
      const hasVars = defVars.order.length > 0;
      const defMsg = s.message;
      const pure = isPureReference(defMsg);
      const humanMsg = normText(defMsg) !== null && !pure;

      const work = { stepId: s.id, name: s.name, msgLangs: [], varLangs: new Map(), seed: [] };
      const missingMsgLangs = [];

      for (const code of codes) {
        const row = rows[code] || null;

        if (doEntityMsg && pure) {
          const st = statusOf(defMsg, row ? row.message : null, normText);
          if (st === 'missing' || (st === 'differs' && true)) { work.msgLangs.push(code); planned.push({ step: s.name, field: 'message (entity ref)', language: code, action: st === 'missing' ? 'fill' : 'align' }); }
        }

        if (humanMsg) {
          const st = statusOf(defMsg, row ? row.message : null, normText);
          if (st === 'missing') missingMsgLangs.push(code);
          else if (st === 'same') missingMsgLangs.push(code + ' (english mirror)');
        }

        if (doVars && hasVars) {
          const rowMeta = row ? metaString(row) : null;
          if (rowMeta === null) {
            work.seed.push(code);
            planned.push({ step: s.name, field: `setVariables ×${defVars.order.length}`, language: code, action: 'seed metadata from default' });
          } else {
            const cur = setVariablesOf(rowMeta);
            const pairs = [];
            for (const left of defVars.order) {
              const st = statusOf(defVars.values[left], cur.values[left], normCode);
              if (st === 'missing') { pairs.push([left, defVars.values[left]]); planned.push({ step: s.name, field: left, language: code, action: 'fill' }); }
              else if (st === 'differs') {
                if (overwrite) { pairs.push([left, defVars.values[left]]); planned.push({ step: s.name, field: left, language: code, action: 'overwrite' }); }
                else conflicts.push({ step: s.name, field: left, language: code, note: 'exists but differs from default; pass overwriteDiffering:true to align', default: truncate(defVars.values[left], 120), current: truncate(cur.values[left], 120) });
              }
            }
            if (pairs.length) work.varLangs.set(code, pairs);
          }
        }
      }

      if (missingMsgLangs.length) {
        needsTranslation.push({ stepId: s.id, name: s.name, type: s.type, en: truncate(defMsg, 1000), languages: missingMsgLangs });
      }
      if (work.msgLangs.length || work.varLangs.size || work.seed.length) stepWork.set(s.id, work);
    }

    const linkWork = [];
    if (doConds) {
      for (const p of flow.paths || []) {
        if (normText(p.condition) === null) continue;
        const per = {};
        for (const t of p.translations || []) if (t && t.languageCode) per[t.languageCode] = t.condition;
        const targets = [];
        for (const code of codes) {
          const st = statusOf(p.condition, per[code], normText);
          if (st === 'missing') { targets.push(code); planned.push({ step: `${nameById[p.currentStepId] || p.currentStepId} → ${nameById[p.nextStepId] || p.nextStepId}`, field: 'condition', language: code, action: 'fill' }); }
          else if (st === 'differs') {
            if (overwrite) { targets.push(code); planned.push({ step: `${nameById[p.currentStepId] || p.currentStepId} → ${nameById[p.nextStepId] || p.nextStepId}`, field: 'condition', language: code, action: 'overwrite' }); }
            else conflicts.push({ step: `${nameById[p.currentStepId] || p.currentStepId} → ${nameById[p.nextStepId] || p.nextStepId}`, field: 'condition', language: code, note: 'exists but differs from default', default: truncate(p.condition, 120), current: truncate(per[code], 120) });
          }
        }
        if (targets.length) linkWork.push({ linkId: p.id, condition: p.condition, targets });
      }
    }

    const summary = {
      flow: { id: flow.id, name: flow.name },
      languages: { default: defaultCode, synced: codes },
      plannedCount: planned.length,
      stepsTouched: stepWork.size,
      linksTouched: linkWork.length,
      planned,
      conflicts,
      needsTranslation
    };

    if (dryRun) return { dryRun: true, saved: false, ...summary };

    const applied = [];
    const failed = [];

    for (const [stepId, work] of stepWork) {
      try {
        const loaded = await apiFetch(`/api/services/app/FlowStep/GetFlowStepForEdit?${new URLSearchParams({ Id: stepId })}`);
        const step = JSON.parse(JSON.stringify((loaded.result ?? loaded).flowStep));
        step.translations = Array.isArray(step.translations) ? step.translations : [];
        const rowFor = (code) => {
          let r = step.translations.find(t => t && t.languageCode === code);
          if (!r) { r = emptyStepRow(code); step.translations.push(r); }
          return r;
        };
        for (const code of work.msgLangs) rowFor(code).message = step.message;
        for (const code of work.seed) rowFor(code).metadata = step.metadata;
        for (const [code, pairs] of work.varLangs) {
          const r = rowFor(code);
          r.metadata = writeVars(r.metadata, pairs);
        }
        await apiFetch('/api/services/app/FlowStep/CreateOrUpdateFlowStep', {
          method: 'POST',
          body: JSON.stringify({ flowStep: step, parentFlowStepId: null, addAutoConnectorAction: false, createNewTaskCode: null, addToSolutionId: null })
        });
        applied.push({ step: work.name, languages: [...new Set([...work.msgLangs, ...work.seed, ...work.varLangs.keys()])] });
      } catch (err) {
        failed.push({ step: work.name, stepId, error: err.message });
      }
    }

    if (linkWork.length) {
      const listed = await apiFetch(`/api/services/app/FlowStep/GetAllLinks?${new URLSearchParams({ flowId: args.flowId })}`);
      const links = listed.result ?? listed;
      for (const lw of linkWork) {
        try {
          const dto = JSON.parse(JSON.stringify(links.find(l => l.linkId === lw.linkId)));
          dto.translations = Array.isArray(dto.translations) ? dto.translations : [];
          for (const code of lw.targets) {
            let r = dto.translations.find(t => t && t.languageCode === code);
            if (!r) { r = { id: EMPTY_ID, condition: null, languageCode: code, languageIcon: null, isCustomCondition: false }; dto.translations.push(r); }
            r.condition = lw.condition;
          }
          await apiFetch('/api/services/app/FlowStep/SaveLink', {
            method: 'POST',
            body: JSON.stringify({
              parentStepId: dto.parentStepId, childStepId: dto.childStepId, botId: dto.botId,
              linkId: dto.linkId, condition: dto.condition,
              parentStepName: dto.parentStepName ?? null, childStepName: dto.childStepName ?? null,
              translations: dto.translations,
              defaultBotLanguage: dto.defaultBotLanguage ?? null, defaultBotIcon: dto.defaultBotIcon ?? null,
              useAuthoringTranslation: dto.useAuthoringTranslation ?? false, botLanguages: dto.botLanguages ?? [],
              isSystemManaged: dto.isSystemManaged ?? false, comment: dto.comment ?? null,
              fromPort: dto.fromPort ?? null, toPort: dto.toPort ?? null
            })
          });
          applied.push({ link: lw.linkId, languages: lw.targets });
        } catch (err) {
          failed.push({ link: lw.linkId, error: err.message });
        }
      }
    }

    return { dryRun: false, saved: failed.length === 0, ...summary, applied, failed };
  }
};
