import { apiFetch } from '../auth.js';
import { normText, normCode, metaString, statusOf, truncate, languagesOf, setVariablesOf } from '../lib/i18n.js';

const RTL_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const COMPARISON_HINT = /(indexOf|includes|startsWith|endsWith|split|==|!=|===|!==|case)\s*\(?\s*$/;

export function stringLiterals(src) {
  if (!src) return [];
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const value = m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]);
    const before = src.slice(Math.max(0, m.index - 14), m.index);
    out.push({ value: value || '', comparison: COMPARISON_HINT.test(before) });
  }
  return out;
}

export function isProse(literal) {
  if (!literal) return false;
  if (RTL_SCRIPT.test(literal)) return true;
  let s = literal.replace(/\\[nrt]/g, ' ').replace(/\[\[[^\]]*\]\](\s*\.\s*[A-Za-z0-9_]+)*/g, ' ');
  s = s.replace(/https?:\/\/\S+/g, ' ').replace(/\S+@\S+\.\S+/g, ' ');
  if (/\.(docx?|xlsx?|pptx?|pdf|png|jpe?g|gif|html?|txt|csv|json|xml)$/i.test(s.trim())) return false;
  if (!/\s/.test(s.trim())) return false;
  const words = s.match(/[A-Za-z]{2,}/g) || [];
  return words.length >= 3;
}

function proseIn(src) {
  const hits = stringLiterals(src).filter(l => isProse(l.value));
  if (!hits.length) return null;
  const real = hits.filter(h => !h.comparison);
  return {
    count: hits.length,
    comparisonOnly: real.length === 0,
    sample: truncate((real[0] || hits[0]).value, 110)
  };
}

export const findTranslatableContentTool = {
  name: 'find_translatable_content',
  description: 'Find every place in a flow that contains human-readable text needing per-language attention, beyond the step message: setVariables whose expression builds user-facing prose, and code extensions. Reports each one with its per-language status (same as default / differs / missing), so you can see which languages still hold the default-language wording. Literals that look like comparison values rather than output are flagged separately.',
  inputSchema: {
    type: 'object',
    required: ['flowId'],
    properties: {
      flowId:            { type: 'string', description: 'Flow ID (UUID)' },
      includeComparison: { type: 'boolean', description: 'Also list entries whose only prose literals look like comparison values, e.g. indexOf("business out leave") (default false)' },
      includeMessages:   { type: 'boolean', description: 'Also list step messages that contain prose (default false — use get_flow_light for those)' }
    }
  },

  async execute(args) {
    const mapRes = await apiFetch(`/api/services/app/Flow/GetFlowMap?${new URLSearchParams({ Id: args.flowId })}`);
    const flow = (mapRes.result ?? mapRes).flow ?? (mapRes.result ?? mapRes);
    const { defaultCode, otherCodes } = languagesOf(flow.languages);

    const variables = [];
    const codeExtensions = [];
    const messages = [];
    let comparisonSkipped = 0;

    for (const s of flow.steps || []) {
      const rows = {};
      for (const t of s.translations || []) if (t && t.languageCode) rows[t.languageCode] = t;

      const defMetaStr = metaString(s);
      const defVars = setVariablesOf(defMetaStr);
      const langVars = {};
      for (const code of otherCodes) langVars[code] = setVariablesOf(metaString(rows[code]));

      for (const left of defVars.order) {
        const value = defVars.values[left];
        const prose = proseIn(typeof value === 'string' ? value : String(value ?? ''));
        if (!prose) continue;
        if (prose.comparisonOnly && !args.includeComparison) { comparisonSkipped++; continue; }
        const langs = {};
        for (const code of otherCodes) langs[code] = statusOf(value, langVars[code].values[left], normCode) || 'missing';
        variables.push({
          step: s.name,
          stepId: s.id,
          variable: left,
          literals: prose.count,
          comparisonOnly: prose.comparisonOnly || undefined,
          sample: prose.sample,
          languages: langs
        });
      }

      const defExt = s.codeExtension;
      const anyExt = normText(defExt) !== null || otherCodes.some(c => rows[c] && normText(rows[c].codeExtension) !== null);
      if (anyExt) {
        const prose = proseIn(defExt || '');
        const langs = {};
        for (const code of otherCodes) langs[code] = statusOf(defExt, rows[code] ? rows[code].codeExtension : null, normCode) || 'missing';
        codeExtensions.push({
          step: s.name,
          stepId: s.id,
          hasProse: !!prose && !prose.comparisonOnly,
          literals: prose ? prose.count : 0,
          sample: prose ? prose.sample : null,
          languages: langs
        });
      }

      if (args.includeMessages) {
        const prose = proseIn(s.message || '');
        if (prose && !prose.comparisonOnly) {
          const langs = {};
          for (const code of otherCodes) langs[code] = statusOf(s.message, rows[code] ? rows[code].message : null, normText) || 'missing';
          messages.push({ step: s.name, stepId: s.id, sample: truncate(s.message, 110), languages: langs });
        }
      }
    }

    const needsWork = (row) => Object.values(row.languages).some(v => v === 'same' || v === 'missing');

    return {
      flow: { id: flow.id, name: flow.name },
      languages: { default: defaultCode, others: otherCodes },
      legend: "'same' = that language still holds the default-language wording (untranslated); 'missing' = no value stored; 'differs' = genuinely translated",
      totals: {
        variablesWithProse: variables.length,
        variablesNeedingWork: variables.filter(needsWork).length,
        codeExtensions: codeExtensions.length,
        codeExtensionsNeedingWork: codeExtensions.filter(r => r.hasProse && needsWork(r)).length,
        comparisonOnlySkipped: comparisonSkipped
      },
      variables,
      codeExtensions,
      messages: args.includeMessages ? messages : undefined
    };
  }
};
