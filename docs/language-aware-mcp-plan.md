# Making the Druid MCP language-aware

Evidence base: bot **SimSim** (`3c7af679-85f3-4c4f-744c-08dce20f729b`), languages `en-US` (default), `ar`, `ku`.
Two flows inspected:

- **01.00 hr_letter_request_bot (Agent)** (`09e74bb5-3178-44c6-b7a5-0131f1e106f6`) — 31 steps, 46 links
- **Orchestrator** (`4ab5f675-97a4-496b-1281-08ded8bd13b8`) — 62 steps, 92 links

## 1. Where per-language values live

### Step level — `FlowStepTranslationDto[]` on `CreateFlowStepInput.translations`

One row per non-default language, each able to carry its own `message`, `messageSpeak`,
`metadata` (the whole JSON blob — **this is where `setVariables` lives**), `utterances`,
`codeExtension`, `flowStepAdditionalMetadata.proactiveMessages`.

### Link level — `NextStepTranslationDto[]` on `LinkStepEditDto.translations`

Per language: `condition` + `isCustomCondition`.

### Three states a translation row can be in

| state | shape | example |
|---|---|---|
| **absent** | `tenantId: null`, every field `null` | every step in flow `09e74bb5` |
| **mirrored** | `tenantId: 531`, value byte-identical to default | `change_language - already active` (`e7521097`) — English text in both `ar` and `ku` |
| **diverged** | `tenantId: 531`, genuinely different value | `Prompt` (`0b18acae`) |

`Prompt` is the proof case. Default `"Hey @name, How can I help you today?"`;
`ar` `"مرحبًا @name، كيف يمكنني مساعدتك اليوم؟"`; `ku` `"هێی @name، ئەمڕۆ چۆن یارمەتیت بدەم؟"` —
each with its **own full copy of `metadata`, including `setVariables`**.

### The flags are not trustworthy

On `Prompt`, all three languages differ and **`isCustomMessage` and `isCustomMetadata` are still `false`**.
Across all 184 link translation rows in Orchestrator, `isCustomCondition` is `false` without exception.
So any tooling must **compare values**, not read `isCustom*`. A flag-based check reports a clean flow that
is in fact fully translated.

### The metadata copies drift structurally

The same `Prompt` step, three copies of one `setVariables` block:

- default — `\r\n` line endings, full key set, `comment: ""`, `debugMessage: ""`
- `ar` — `\n`, full key set, `comment: null`, `debugMessage: null`
- `ku` — `\n`, **only `setVariables`**; `exceptionHandler`, `keyboard`, `whatsAppComponent` and the rest are gone

Same JS logic in all three. So a diff must normalize line endings and key order or it drowns in noise,
and a set-variable change has to be applied three times into three different JSON shapes.

## 2. What the MCP does today

| tool | behaviour | problem |
|---|---|---|
| `get_flow_steps_by_flow_id` | returns `translations: []` always | verified on 3 flows; the list DTO strips them — enumeration is language-blind |
| `get_flow_step_for_edit` | returns the real `translations[]` | one step per call, and ~17k tokens of `flowNames` padding per call |
| `create_or_update_flow_step` | no `translations` in the tool schema | `CreateFlowStepInput` has it; every write sends it unset — this is where real Arabic and Kurdish text gets lost |
| `save_link` | body has no `translations` key | `LinkStepEditDto` has it |
| `get_all_links` | does return `translations[]` | raw, no diff |
| **`Flow/GetFlowMap`** | **not wrapped at all** | returns the whole flow with per-step `translations` in **one call** — the missing bulk read |

## 3. Measured state of the two flows

### Link conditions

Orchestrator, 92 links:

| default | `ar` | `ku` | count |
|---|---|---|---|
| set | set | set | 25 |
| set | — | — | 14 |
| — | — | — | 53 |

All 25 populated triples are **byte-identical across languages**; zero links branch differently per language.
The 14 default-only ones cluster in the newest link IDs (`08defcf1`, `08df0cee`, `08df0fe8`), i.e. links added
after the last translation pass — including `[[DataHr]].SubmitLeaveValidation == "OK"` and the two
`[[ChatUser]].DetectedLanguage.Code` language-routing conditions.

Flow `09e74bb5` shows the same shape at smaller scale: `ar` mirrored on 5 conditional links, `ku` null on all
but `end_conversation`, and all 7 `[[Gemini]].functionName == "..."` dispatch links null in both.

### Step content

- Orchestrator: translation rows exist (`tenantId: 531`) and at least one step (`Prompt`) is genuinely translated in message **and** metadata.
- `09e74bb5`: rows absent entirely on all 31 steps. Its sub-flow `01.01`'s `MessageForEmployee` (`8d7f42fe`) is English-only, so Arabic and Kurdish users get English.

### Variant-family drift (not language-tagged, same class of problem)

11 `F` steps in `09e74bb5` call sub-flow `1b034bff` with near-identical `setVariables`:

- `RequestDetails` reads `"...request for a bank letter..."` in 9 of 11, including To-Whom-It-May-Concern, embassy, installment and salary-transfer
- `installment_letter_template_kurdish` (`f4b0b723`) has `agentic.toolCode = "bank_letter_template_local_arabic"`
- `bank_letter_template_local_arabic` (`60f54567`) uses a name as `toolCode`; siblings use hex codes
- `to_whom_it_may_concern_template_arabic` (`9bb58738`) and `_kurdish` (`91ab3f18`) have `metadata: {}` — no agentic block at all

## 4. Plan

### Phase 0 — wrap `GetFlowMap`

`get_flow_map(flowId)`. One call returns every step with its `translations` and every transition.
Everything below reads from it instead of N × `get_flow_step_for_edit`. Do this first; it is a
30-line tool and it removes the per-step cost that makes the rest impractical.

### Phase 1 — see it

**`get_flow_i18n_map(flowId, { languages?, fields?, detail? })`**
Matrix of step/link × language. Per cell: `absent` / `mirrored` / `diverged`, plus a normalized hash.
Summary by default.

**`diff_flow_languages(flowId, base, target)`** — only cells that differ or are missing, values normalized
(line endings, key order, whitespace) so mirrored copies collapse to `mirrored` instead of noise.

**`lint_flow_i18n(flowId)`** — rules, all **value-based, never flag-based**:
- default has content, a language row is absent
- link condition set on default, null on some language
- language `metadata` whose `setVariables` **key set** differs from the default's
- language `metadata` missing top-level keys the default has (the `ku` case above)
- language message byte-identical to default on a step whose siblings are translated — untranslated, not intentional
- `isCustom*` true anywhere — currently never observed; flag it for review if it appears

### Phase 2 — variant families

**`group_flow_variants(flowId, { pattern? })`** — cluster steps by name token
(`arabic|english|kurdish|expat|ar|en|ku|local`) and by shared `subFlowId`, then diff `setVariables`
key by key. Output per key: same everywhere / differs / missing in N. This is what surfaces the
`RequestDetails` copy-paste and the `toolCode` mismatch in one call.

### Phase 3 — patch safely

Read-modify-write helpers, so nothing is written blind:

- `hydrateFlowStep(id)` → full `GetFlowStepForEdit` payload
- `writeFlowStep(id, patch)` → merge named fields only; re-send `translations`, `botLanguages`,
  `flowStepAdditionalMetadata` untouched
- `hydrateLink` / `writeLink` → same, preserving `translations`

Then:

- add `translations` to the `create_or_update_flow_step` and `save_link` input schemas
- **`patch_flow_step_language(stepId, languageCode, { message?, setVariables?, metadata? })`** —
  writes one language row, preserving that row's existing metadata shape rather than overwriting it with the default's
- **`patch_link_condition({ linkId | parentStepId+childStepId }, { default?, byLanguage?, mirror? })`** —
  `mirror: true` writes the same condition to every language, which matches how this bot is actually maintained

### Phase 4 — bulk

**`apply_variant_patch(flowId, { selector, set, languages, dryRun })`** — apply one `setVariables` key
across a matched family and across the chosen languages in one call, e.g. fix `RequestDetails` on all 11
`DO` steps. `dryRun: true` by default; returns the exact diff it would write.

## 5. Implementation notes

- `src/lib/i18n.js` — languages from `flowStep.botLanguages`; normalize a metadata string (parse, sort keys,
  normalize line endings) before any comparison; classify each cell `absent` / `mirrored` / `diverged`
- `src/lib/flowGraph.js` — one `GetFlowMap` per `flowId`, cached for the duration of a call
- new tools: `getFlowMap`, `getFlowI18nMap`, `diffFlowLanguages`, `lintFlowI18n`, `groupFlowVariants`,
  `patchFlowStepLanguage`, `patchLinkCondition`, `applyVariantPatch`
- fix `saveLink.js` and `createOrUpdateFlowStep.js` to pass `translations` through
- **output budget:** `get_flow_steps_by_flow_id` returns 174k characters on Orchestrator and `get_all_links`
  94k — both over the tool-result cap. Every new read tool summarizes by default, detail behind a flag.

## 6. Guardrails

- Never write a step or link without hydrating it first — a write without `translations` can drop real
  Arabic and Kurdish content, as `Prompt` demonstrates.
- Never infer "translated" from `isCustom*`. Compare normalized values.
- `get_pending_changes` before `publish_changes`.
- Verify the `save_link` and `create_or_update_flow_step` translation round-trip on a cloned flow before
  trusting either; the null-binding behaviour has not been confirmed against live data.

---

## 7. Built (Phase 0 + 1 + 3, first cut)

New files, nothing existing removed:

- `src/lib/i18n.js` — normalization (`\r\n` → `\n`, trim, JSON key-order-stable), `absent` / `same` / `differs` classification, `setVariables` extraction
- `src/tools/getFlowLight.js` — `get_flow_light`
- `src/tools/translateFlowStep.js` — `translate_flow_step`
- `src/tools/translateLinkCondition.js` — `translate_link_condition`
- `src/server.js` — three imports, three registrations

### `get_flow_light(flowId, …)`

One `Flow/GetFlowMap` call. Per step: `id`, `name`, `type`, sub-flow, `input`, `tool` (agentic
`toolCode`), `actions` (connector action names), `message`, `vars`. Per transition: `linkId`, `from`,
`to`, `cond`. Every translatable value is a per-language object: the default language verbatim,
`"="` where a language matches after normalization, the differing text where it does not, `null`
where nothing is stored.

Options: `maxValueLength` (default 300), `detail` (full values), `includeVars`, `includePaths`,
`includeUnconditional`, `onlyDrift`, `stepFilter`. Also emits `counts` per language and
`metaMissingIn` on steps where a language row has no metadata of its own.

`get_flow_steps_by_flow_id`, `get_flow_step_for_edit` and `get_all_links` are untouched — use them
for deep edits.

### `translate_flow_step(stepId, …)`

Reads the step, patches, re-sends the whole definition so `translations`, `botLanguages` and unrelated
metadata keys survive.

- `message` — string (default language only) or `{ "en-US": …, "ar": …, "ku": … }`
- `setVariables` — `{ "<left>": string | { per language } }`, matched on the left-hand side inside each
  language's own metadata copy
- `mirror` — copy the default value to languages not named
- `addIfMissing` — create a `setVariables` entry that does not exist yet
- `seedMetadata` — when a language row has no metadata at all, copy the default's before writing;
  without it that write is skipped and reported
- `dryRun` — **true by default**

Languages not named are untouched. The result always carries `driftAfterWrite`: every language whose
value now differs from, or is missing against, what was just written.

### `translate_link_condition(flowId, …)`

Same contract for a transition, targeted by `linkId` (from `get_flow_light`) or `fromStepId` +
`toStepId`. Re-sends the full `LinkStepEditDto` including `translations`, which is what plain
`save_link` drops. `mirror: true` writes one condition to every language — the way this bot is
actually maintained.

### Verification status

- Normalization unit-tested against the real `Prompt` (`0b18acae`) payload: the three `@name`
  `setVariables` copies collapse to `"="` despite `\r\n` vs `\n` and differing `comment` /
  `debugMessage` keys, while the Arabic and Kurdish messages correctly report as differing.
- Server loads and registers all three tools.
- **Not yet exercised against the live API** — neither shell in this session can reach
  `asiacellqa.druidplatform.com` (egress proxy). `GetFlowMap`'s response shape is coded from
  `swagger.json` (`FlowMapDto.steps[].translations`, `FlowMapDto.paths[].translations`,
  `FlowMapDto.languages`). Restart the MCP server, then run `get_flow_light` on
  `4ab5f675-97a4-496b-1281-08ded8bd13b8` and a `dryRun` `translate_flow_step` on a cloned flow before
  trusting the write path.
