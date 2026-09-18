import { apiFetch } from '../auth.js';
import {
  SAME, normText, normCode, parseMeta, metaString,
  statusOf, langCell, languagesOf, setVariablesOf
} from '../lib/i18n.js';

function actionNames(meta) {
  if (!meta) return undefined;
  const names = [];
  for (const key of ['preActions', 'postActions', 'preInternalActions', 'postInternalActions', 'parallelPreActions', 'parallelPostActions']) {
    const arr = meta[key];
    if (Array.isArray(arr)) for (const a of arr) if (a && a.name) names.push(a.name);
  }
  return names.length ? names : undefined;
}

function bump(counts, code, status) {
  if (!status || status === 'same') return;
  counts[code] = counts[code] || { differs: 0, missing: 0, extra: 0 };
  counts[code][status] = (counts[code][status] || 0) + 1;
}

export const getFlowLightTool = {
  name: 'get_flow_light',
  description: 'Compact, language-aware view of a whole flow in ONE call. Returns every step (id, name, type, sub-flow, message, setVariables, code extension, agentic toolCode, connector action names) and every conditional transition, with each translatable value shown per language: the default language verbatim, "=" when a language matches it, the differing text when it does not, and null when that language has no value. Use this to survey or audit a flow, including which parts are translated. Use get_flow_step_for_edit / get_all_links when you need the full untrimmed payload for a deep edit.',
  inputSchema: {
    type: 'object',
    required: ['flowId'],
    properties: {
      flowId:              { type: 'string', description: 'Flow ID (UUID)' },
      maxValueLength:      { type: 'number', description: 'Truncate each value to this many characters (default 300, 0 = no truncation)' },
      detail:              { type: 'boolean', description: 'Shorthand for maxValueLength 0 — return full untruncated values (default false)' },
      includeVars:         { type: 'boolean', description: 'Include setVariables (default true)' },
      includePaths:        { type: 'boolean', description: 'Include transitions (default true)' },
      includeUnconditional:{ type: 'boolean', description: 'Include transitions that have no condition in any language (default false)' },
      onlyDrift:           { type: 'boolean', description: 'Return only steps and paths where some language differs from or is missing against the default (default false)' },
      stepFilter:          { type: 'string', description: 'Case-insensitive substring match on step name' }
    }
  },

  async execute(args) {
    const max = args.detail ? 0 : (args.maxValueLength === undefined ? 300 : args.maxValueLength);
    const includeVars = args.includeVars !== false;
    const includePaths = args.includePaths !== false;
    const filter = args.stepFilter ? String(args.stepFilter).toLowerCase() : null;

    const params = new URLSearchParams({ Id: args.flowId });
    const data = await apiFetch(`/api/services/app/Flow/GetFlowMap?${params}`);
    const flow = (data.result ?? data).flow ?? (data.result ?? data);

    const { defaultCode, otherCodes } = languagesOf(flow.languages);
    const counts = {};
    const nameById = {};
    for (const s of flow.steps || []) nameById[s.id] = s.name;

    const steps = [];
    for (const s of flow.steps || []) {
      if (filter && !String(s.name || '').toLowerCase().includes(filter)) continue;

      const byLang = {};
      for (const t of s.translations || []) if (t && t.languageCode) byLang[t.languageCode] = t;

      const row = { id: s.id, name: s.name, type: s.type };
      if (s.isFirstStep) row.first = true;
      if (s.isLastStep) row.last = true;
      if (s.subFlowName || s.subFlowId) row.subFlow = s.subFlowName || s.subFlowId;
      if (normText(s.inputMapping)) row.input = s.inputMapping;

      let drift = false;

      const msgByLang = {};
      for (const code of otherCodes) msgByLang[code] = byLang[code] ? byLang[code].message : null;
      const hasMsg = normText(s.message) !== null || otherCodes.some(c => normText(msgByLang[c]) !== null);
      if (hasMsg) {
        row.message = langCell(defaultCode, otherCodes, s.message, msgByLang, normText, max);
        for (const code of otherCodes) {
          const st = statusOf(s.message, msgByLang[code], normText);
          bump(counts, code, st);
          if (st === 'differs' || st === 'missing') drift = true;
        }
      }

      const defMetaStr = metaString(s);
      const defMeta = parseMeta(defMetaStr);

      if (includeVars) {
        const defVars = setVariablesOf(defMetaStr);
        const langVars = {};
        for (const code of otherCodes) langVars[code] = setVariablesOf(metaString(byLang[code]));

        const lefts = [...defVars.order];
        for (const code of otherCodes) for (const l of langVars[code].order) if (!lefts.includes(l)) lefts.push(l);

        if (lefts.length) {
          row.vars = lefts.map(left => {
            const per = {};
            for (const code of otherCodes) per[code] = langVars[code].values[left];
            const cell = langCell(defaultCode, otherCodes, defVars.values[left], per, normCode, max);
            for (const code of otherCodes) {
              const st = statusOf(defVars.values[left], per[code], normCode);
              bump(counts, code, st);
              if (st === 'differs' || st === 'missing') drift = true;
            }
            return { left, ...cell };
          });
        }
      }

      const extByLang = {};
      for (const code of otherCodes) extByLang[code] = byLang[code] ? byLang[code].codeExtension : null;
      const hasExt = normText(s.codeExtension) !== null || otherCodes.some(c => normText(extByLang[c]) !== null);
      if (hasExt) {
        const extMax = max === 0 ? 0 : Math.min(max, 200);
        row.codeExtension = langCell(defaultCode, otherCodes, s.codeExtension, extByLang, normCode, extMax);
        for (const code of otherCodes) {
          const st = statusOf(s.codeExtension, extByLang[code], normCode);
          bump(counts, code, st);
          if (st === 'differs' || st === 'missing') drift = true;
        }
      }

      const tool = defMeta && defMeta.agentic ? defMeta.agentic.toolCode : undefined;
      if (tool) row.tool = tool;
      const acts = actionNames(defMeta);
      if (acts) row.actions = acts;

      const missingMetaLangs = otherCodes.filter(c => byLang[c] && metaString(byLang[c]) === null && defMetaStr !== null);
      if (missingMetaLangs.length && (row.message || row.vars)) row.metaMissingIn = missingMetaLangs;

      if (!args.onlyDrift || drift) steps.push(row);
    }

    const paths = [];
    if (includePaths) {
      for (const p of flow.paths || []) {
        const per = {};
        for (const t of p.translations || []) if (t && t.languageCode) per[t.languageCode] = t.condition;

        const anyCond = normText(p.condition) !== null || otherCodes.some(c => normText(per[c]) !== null);
        if (!anyCond && !args.includeUnconditional) continue;

        const row = {
          linkId: p.id,
          from: nameById[p.currentStepId] || p.currentStepId,
          to: nameById[p.nextStepId] || p.nextStepId
        };
        let drift = false;
        if (anyCond) {
          row.cond = langCell(defaultCode, otherCodes, p.condition, per, normText, max);
          for (const code of otherCodes) {
            const st = statusOf(p.condition, per[code], normText);
            bump(counts, code, st);
            if (st === 'differs' || st === 'missing') drift = true;
          }
        }
        if (!args.onlyDrift || drift) paths.push(row);
      }
    }

    return {
      flow: { id: flow.id, name: flow.name, category: flow.category, isDisabled: flow.isDisabled },
      languages: { default: defaultCode, others: otherCodes },
      legend: `"${SAME}" = identical to ${defaultCode} after normalizing line endings and JSON key order; null = no value stored for that language`,
      counts,
      totals: { steps: (flow.steps || []).length, stepsReturned: steps.length, paths: (flow.paths || []).length, pathsReturned: paths.length },
      steps,
      paths
    };
  }
};
