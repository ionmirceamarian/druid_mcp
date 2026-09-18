import { apiFetch } from '../auth.js';
import { normText, normCode, parseMeta, statusOf, truncate } from '../lib/i18n.js';

const EMPTY_ID = '00000000-0000-0000-0000-000000000000';

function emptyRow(code) {
  return {
    id: EMPTY_ID,
    languageCode: code,
    message: null,
    messageSpeak: null,
    metadata: null,
    utterances: null,
    codeExtension: null,
    isCustomMessage: false,
    isCustomMetadata: false,
    isCustomMessageSpeak: false,
    isCustomSetVariables: false,
    isCustomUtterances: false,
    isCustomCodeExtension: false,
    isCustomProactiveMessages: false,
    flowStepAdditionalMetadata: { proactiveMessages: [] }
  };
}

function rowFor(step, code) {
  step.translations = Array.isArray(step.translations) ? step.translations : [];
  let row = step.translations.find(t => t && t.languageCode === code);
  if (!row) { row = emptyRow(code); step.translations.push(row); }
  return row;
}

function expand(input, defaultCode) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return { [defaultCode]: input };
  return { ...input };
}

function writeVar(metaStr, left, right, addIfMissing) {
  const obj = parseMeta(metaStr) || {};
  if (!Array.isArray(obj.setVariables)) obj.setVariables = [];
  const entry = obj.setVariables.find(v => v && v.left === left);
  if (entry) { entry.right = right; return { metadata: JSON.stringify(obj), applied: true, created: false }; }
  if (!addIfMissing) return { metadata: metaStr, applied: false, created: false };
  obj.setVariables.push({ left, right, comment: '' });
  return { metadata: JSON.stringify(obj), applied: true, created: true };
}

function readVar(metaStr, left) {
  const obj = parseMeta(metaStr);
  if (!obj || !Array.isArray(obj.setVariables)) return null;
  const entry = obj.setVariables.find(v => v && v.left === left);
  return entry ? (entry.right === undefined ? null : entry.right) : null;
}

export const translateFlowStepTool = {
  name: 'translate_flow_step',
  description: 'Patch one flow step in place, per language, without touching anything else. Set the step message, the code extension, and/or individual setVariables values for the default language, for named languages, or for all at once. Languages you do not name keep their current value byte-for-byte; the result warns about any language that now differs from or is missing against what you just wrote. Reads the step first and re-sends its full definition, so existing translations, botLanguages and metadata keys are preserved. Defaults to dryRun — pass dryRun:false to save. For structural changes (new steps, type changes, whole-metadata rewrites) use create_or_update_flow_step.',
  inputSchema: {
    type: 'object',
    required: ['stepId'],
    properties: {
      stepId:  { type: 'string', description: 'Flow step ID (UUID)' },
      message: {
        description: 'New step message. A plain string targets the default language only. An object keyed by language code (e.g. {"en-US":"Hi","ar":"مرحبًا"}) targets exactly those languages.',
        anyOf: [{ type: 'string' }, { type: 'object' }]
      },
      codeExtension: {
        description: 'New code extension source. A plain string targets the default language only. An object keyed by language code targets exactly those languages. Pass an empty string to clear a language.',
        anyOf: [{ type: 'string' }, { type: 'object' }]
      },
      setVariables: {
        type: 'object',
        description: 'Map of setVariables left-hand side to its new right-hand value. Each value is a plain string (default language only) or an object keyed by language code. Example: {"[[LetterRequest]].LetterName": {"en-US":"\\"Bank letter\\"","ar":"\\"Bank letter\\""}}'
      },
      mirror:       { type: 'boolean', description: 'Copy each default-language value you supply to every other bot language you did not name explicitly (default false)' },
      addIfMissing: { type: 'boolean', description: 'Create a setVariables entry when the left-hand side is not already present (default false)' },
      seedMetadata: { type: 'boolean', description: 'When a language row has no metadata of its own, seed it from the default metadata before writing the variable. Without this, a variable write to such a language is skipped and reported (default false)' },
      dryRun:       { type: 'boolean', description: 'Report the diff without saving (default true)' }
    }
  },

  async execute(args) {
    const dryRun = args.dryRun !== false;
    const params = new URLSearchParams({ Id: args.stepId });
    const loaded = await apiFetch(`/api/services/app/FlowStep/GetFlowStepForEdit?${params}`);
    const payload = loaded.result ?? loaded;
    const step = JSON.parse(JSON.stringify(payload.flowStep));

    const defaultCode = step.defaultBotLaguage || step.defaultBotLanguage || 'en-US';
    const allCodes = (step.botLanguages || []).map(l => l.name).filter(Boolean);
    const otherCodes = allCodes.filter(c => c !== defaultCode);

    const changes = [];
    const skipped = [];
    const warnings = [];
    const touched = { message: false, codeExtension: false, vars: [] };

    const msgIn = expand(args.message, defaultCode);
    if (msgIn) {
      const targets = { ...msgIn };
      if (args.mirror && targets[defaultCode] !== undefined) {
        for (const c of otherCodes) if (targets[c] === undefined) targets[c] = targets[defaultCode];
      }
      for (const [code, value] of Object.entries(targets)) {
        if (code !== defaultCode && !allCodes.includes(code)) { skipped.push({ field: 'message', language: code, reason: 'not a bot language' }); continue; }
        const before = code === defaultCode ? step.message : (rowFor(step, code).message);
        if (code === defaultCode) step.message = value;
        else rowFor(step, code).message = value;
        changes.push({ field: 'message', language: code, before: truncate(before, 200), after: truncate(value, 200) });
      }
      touched.message = true;
    }

    const extIn = expand(args.codeExtension, defaultCode);
    if (extIn) {
      const targets = { ...extIn };
      if (args.mirror && targets[defaultCode] !== undefined) {
        for (const c of otherCodes) if (targets[c] === undefined) targets[c] = targets[defaultCode];
      }
      for (const [code, value] of Object.entries(targets)) {
        if (code !== defaultCode && !allCodes.includes(code)) { skipped.push({ field: 'codeExtension', language: code, reason: 'not a bot language' }); continue; }
        const before = code === defaultCode ? step.codeExtension : rowFor(step, code).codeExtension;
        if (code === defaultCode) step.codeExtension = value;
        else rowFor(step, code).codeExtension = value;
        changes.push({ field: 'codeExtension', language: code, before: truncate(before, 200), after: truncate(value, 200) });
      }
      touched.codeExtension = true;
    }

    if (args.setVariables && typeof args.setVariables === 'object') {
      for (const [left, raw] of Object.entries(args.setVariables)) {
        const targets = expand(raw, defaultCode) || {};
        if (args.mirror && targets[defaultCode] !== undefined) {
          for (const c of otherCodes) if (targets[c] === undefined) targets[c] = targets[defaultCode];
        }
        for (const [code, value] of Object.entries(targets)) {
          if (code !== defaultCode && !allCodes.includes(code)) { skipped.push({ field: left, language: code, reason: 'not a bot language' }); continue; }

          if (code === defaultCode) {
            const before = readVar(step.metadata, left);
            const res = writeVar(step.metadata, left, value, args.addIfMissing === true);
            if (!res.applied) { skipped.push({ field: left, language: code, reason: 'left-hand side not present; pass addIfMissing:true' }); continue; }
            step.metadata = res.metadata;
            changes.push({ field: left, language: code, before: truncate(before, 200), after: truncate(value, 200), created: res.created });
          } else {
            const row = rowFor(step, code);
            if (row.metadata === null || row.metadata === undefined || String(row.metadata).trim() === '') {
              if (!args.seedMetadata) { skipped.push({ field: left, language: code, reason: 'language has no metadata of its own; pass seedMetadata:true to copy the default metadata into it first' }); continue; }
              row.metadata = step.metadata;
              warnings.push(`seeded ${code} metadata from ${defaultCode} on this step`);
            }
            const before = readVar(row.metadata, left);
            const res = writeVar(row.metadata, left, value, args.addIfMissing === true);
            if (!res.applied) { skipped.push({ field: left, language: code, reason: 'left-hand side not present; pass addIfMissing:true' }); continue; }
            row.metadata = res.metadata;
            changes.push({ field: left, language: code, before: truncate(before, 200), after: truncate(value, 200), created: res.created });
          }
        }
        touched.vars.push(left);
      }
    }

    if (!changes.length) {
      return { stepId: args.stepId, name: step.name, saved: false, changes: [], skipped, warnings, note: 'nothing to change' };
    }

    const drift = [];
    if (touched.message) {
      for (const code of otherCodes) {
        const row = (step.translations || []).find(t => t && t.languageCode === code);
        const st = statusOf(step.message, row ? row.message : null, normText);
        if (st === 'differs' || st === 'missing') drift.push({ field: 'message', language: code, status: st });
      }
    }
    if (touched.codeExtension) {
      for (const code of otherCodes) {
        const row = (step.translations || []).find(t => t && t.languageCode === code);
        const st = statusOf(step.codeExtension, row ? row.codeExtension : null, normCode);
        if (st === 'differs' || st === 'missing') drift.push({ field: 'codeExtension', language: code, status: st });
      }
    }
    for (const left of touched.vars) {
      const def = readVar(step.metadata, left);
      for (const code of otherCodes) {
        const row = (step.translations || []).find(t => t && t.languageCode === code);
        const cur = row ? readVar(row.metadata, left) : null;
        const st = statusOf(def, cur, normCode);
        if (st === 'differs' || st === 'missing') drift.push({ field: left, language: code, status: st });
      }
    }

    if (dryRun) {
      return { stepId: args.stepId, name: step.name, dryRun: true, saved: false, defaultLanguage: defaultCode, changes, skipped, warnings, driftAfterWrite: drift };
    }

    const body = {
      flowStep: step,
      parentFlowStepId: null,
      addAutoConnectorAction: false,
      createNewTaskCode: null,
      addToSolutionId: null
    };
    const saved = await apiFetch('/api/services/app/FlowStep/CreateOrUpdateFlowStep', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return {
      stepId: args.stepId,
      name: step.name,
      saved: true,
      defaultLanguage: defaultCode,
      changes,
      skipped,
      warnings,
      driftAfterWrite: drift,
      result: saved.result ?? saved
    };
  }
};
