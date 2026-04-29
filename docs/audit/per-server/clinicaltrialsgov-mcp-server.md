# clinicaltrialsgov-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 7

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `clinicaltrials_find_eligible` | 1. Empty-result recovery | `noMatchHints?: string[]` | `result.studies.length === 0` | Yes — `z.array(z.string()).optional()` | find-eligible.tool.ts:99–103, 157–192 |
| `clinicaltrials_find_eligible` | 1. Empty-result recovery (format) | hints rendered as `- ${hint}` lines | `result.noMatchHints?.length` truthy | n/a (format-only rendering of typed field) | find-eligible.tool.ts:213–215 |
| `clinicaltrials_search_studies` | 1. Empty-result recovery | `noMatchHints?: string[]` | `result.studies.length === 0` | Yes — `z.array(z.string()).optional()` | search-studies.tool.ts:129–132, 178–202 |
| `clinicaltrials_search_studies` | 1. Empty-result recovery (format) | hardcoded fallback `'Try broader search terms or fewer filters.'` | `count === 0 && !result.noMatchHints?.length` | No — format-only, no schema field | search-studies.tool.ts:223–226 |
| `clinicaltrials_get_study_count` | 1. Empty-result recovery | `noMatchHints?: string[]` | `totalCount === 0` | Yes — `z.array(z.string()).optional()` | get-study-count.tool.ts:63–67, 99 |
| `clinicaltrials_search_studies` | 3. Next-step pointers | `searchCriteria?: Record<string, unknown>` echoed back with no-match state | `result.studies.length === 0` | Yes — `z.record(z.string(), z.unknown()).optional()` | search-studies.tool.ts:123–127, 163–176 |
| `clinicaltrials_get_study_count` | 3. Next-step pointers | `searchCriteria?: Record<string, unknown>` echoed back always | always when any criterion is set | Yes — `z.record(z.string(), z.unknown()).optional()` | get-study-count.tool.ts:59–62, 87–98 |
| `clinicaltrials_get_study_results` | 5. Partial-success envelopes | `{ results: StudyResult[], studiesWithoutResults?: string[], fetchErrors?: Array<{ nctId: string; error: string }> }` | batch: any ID has no results (`studiesWithoutResults`) or throws (`fetchErrors`) | Yes — all three fields typed in output schema | get-study-results.tool.ts:339–381, 484–488 |
| `clinicaltrials_get_study_results` | 7. Warnings | `studiesWithoutResults?: string[]` | study fetched but `hasResults === false` | Yes — `z.array(z.string()).optional()` | get-study-results.tool.ts:368–371, 450–454 |
| `clinicaltrials_get_study_results` | 8. Recovery on errors (batch fallback) | `fetchErrors?: Array<{ nctId: string; error: string }>` + handler falls back from batch to per-ID sequential fetch | batch fetch throws | Yes — typed in output schema | get-study-results.tool.ts:410–431, 372–381 |
| `clinicaltrials_get_study` | 3. Next-step pointers | format-only: `'yes — fetch via clinicaltrials_get_study_results'` appended to has-results field | `s.hasResults` truthy | No — format-only string, not in schema | get-study.tool.ts:117–120 |
| `clinicaltrials_get_study` | 3. Next-step pointers | format-only: `'Use clinicaltrials_get_study_results for full data.'` in Results Summary section | `s.hasResults && s.resultsSection` | No — format-only string, not in schema | get-study.tool.ts:257–258 |
| `clinicaltrials_find_eligible` | 4. Auto-resolution | multi-condition query joined with ` OR `, each multi-word condition auto-quoted | always | No — input transformation, not schema | find-eligible.tool.ts:108–110 |
| `clinicaltrials_get_study_results` | 4. Auto-resolution | single `nctId` string coerced to array; `sections` string coerced to array | `!Array.isArray(input.nctIds)`, `!Array.isArray(input.sections)` | No — input transformation | get-study-results.tool.ts:385–390 |
| `clinicaltrials_get_field_values` | 4. Auto-resolution | single `fields` string coerced to array | `!Array.isArray(input.fields)` | No — input transformation | get-field-values.tool.ts:71 |
| `clinicaltrials_search_studies` | 4. Auto-resolution | `statusFilter`/`nctIds` scalar coerced to array via `toArray()` | always | No — input transformation | search-studies.tool.ts:145–148 |

## Tool inventory

| Tool | Purpose | Patterns |
|:-----|:--------|:---------|
| `clinicaltrials_search_studies` | Full-text and field-specific search across all ClinicalTrials.gov studies with pagination | 1, 3, 4 |
| `clinicaltrials_find_eligible` | Match patient demographics to recruiting trials by age/sex/condition/location | 1, 4 |
| `clinicaltrials_get_study_results` | Fetch outcomes, adverse events, participant flow, baseline for completed studies | 4, 5, 7, 8 |
| `clinicaltrials_get_study_count` | Lightweight count query without fetching study data | 1, 3 |
| `clinicaltrials_get_study` | Single-study lookup by NCT ID returning full record | 3 |
| `clinicaltrials_get_field_definitions` | Browse the ClinicalTrials.gov study data model field tree | 4 |
| `clinicaltrials_get_field_values` | Discover valid enum/string values per field with study frequency counts | 4 |

## Idiosyncratic patterns

**Condition auto-quoting in `find-eligible`** (`find-eligible.tool.ts:108–110`):

Multi-word conditions are automatically wrapped in quotes before being sent to the API's OR query. Single-word conditions are sent bare. This is a domain-specific normalization for ClinicalTrials.gov's Essie query syntax:

```ts
const conditionQuery = input.conditions
  .map((c) => (c.includes(' ') ? `"${c}"` : c))
  .join(' OR ');
```

**Batch-to-sequential fallback in `get-study-results`** (`get-study-results.tool.ts:410–431`):

The handler attempts a batch API call first. If the batch endpoint rejects (which it does for any single malformed/nonexistent ID), it falls back silently to sequential per-ID fetches. Each failing ID is then captured in `fetchErrors` individually. This is a reliability pattern specific to the ClinicalTrials.gov batch API's all-or-nothing rejection behavior:

```ts
try {
  fetched = (await service.getStudiesBatch(nctIds, ctx)) as RawStudyShape[];
} catch (err) {
  ctx.log.warning('Batch fetch rejected; falling back to per-ID fetches', { ... });
  fetched = [];
  for (const nctId of nctIds) {
    try {
      fetched.push((await service.getStudy(nctId, ctx)) as RawStudyShape);
    } catch (perIdErr) {
      fetchErrors.push({ nctId, error: perIdMessage });
      erroredIds.add(nctId);
    }
  }
}
```

**Results-section forwarding pointer in `get-study`** (`get-study.tool.ts:238–258`):

When a study has results, `format()` renders a count-only summary stub (outcome measure count, adverse event count, etc.) and explicitly names `clinicaltrials_get_study_results` as the follow-on tool. This is a cross-tool chaining hint entirely in `format()` with no corresponding typed output field:

```ts
// Results availability — chaining signal for clinicaltrials_get_study_results
if (s.hasResults != null) {
  lines.push(
    `**Has Results:** ${s.hasResults ? 'yes — fetch via clinicaltrials_get_study_results' : 'no'}`,
  );
}
// ...
lines.push('Use clinicaltrials_get_study_results for full data.');
```

**`noMatchHints` divergence between `find-eligible` and `search-studies`**: Both tools use the identical field name (`noMatchHints?: string[]`) but generate hints with different specificity. `find-eligible` generates per-parameter hints (age extremes, sex=ALL, healthyVolunteer, recruitingOnly, location granularity) while `search-studies` generates structural hints (query vs. filter diagnostic). Same field shape, meaningfully different content strategy.

**`get-field-definitions` error throw on bad path** (`get-field-definitions.tool.ts:89–93`):

When a dot-notation path is not found in the tree, the handler throws a plain `Error` whose message includes the valid top-level section names. This is a recovery hint embedded in the error message rather than in a structured output field or error data:

```ts
if (!node) {
  throw new Error(
    `Path '${input.path}' not found. Top-level sections: ` +
      `${tree.map((n) => n.name).join(', ')}.`,
  );
}
```

## Adoption gaps

- **`clinicaltrials_get_study`**: No empty-result or not-found handling is visible — the handler simply calls `service.getStudy()` and throws if the service throws. A study not found by NCT ID surfaces as an unstructured error with no structured recovery hint or suggestion (e.g., "use `search_studies` to find the correct NCT ID"). Given it's the most direct lookup tool, a typed `notFound` flag or structured error data with a next-step suggestion would be consistent with the rest of the server.

- **`clinicaltrials_get_field_definitions`**: The bad-path error includes top-level section names in the message string but does not expose them as structured data (e.g., `validSections: string[]` in `error.data`). Callers consuming the error programmatically cannot extract the valid options without parsing the message.

- **`clinicaltrials_get_field_values`**: No hints when a requested field name is invalid or returns zero values. The format renders `'No recorded values for this field.'` for empty `topValues`, but there is no `noMatchHints` or `suggestedFields` in the output schema to guide the caller toward valid `piece` names (which `get_field_definitions` could provide).

## Concrete shape excerpts

**Shape A — `noMatchHints?: string[]`** (used in `find-eligible`, `search-studies`, `get-study-count`):

```ts
// find-eligible.tool.ts:99–103 (output schema)
noMatchHints: z
  .array(z.string())
  .optional()
  .describe('Hints when no studies match, with suggestions to broaden the search.'),

// find-eligible.tool.ts:157–192 (handler population)
let noMatchHints: string[] | undefined;
if (result.studies.length === 0) {
  noMatchHints = [
    `No studies found for "${input.conditions.join(', ')}" matching the specified criteria.`,
  ];
  if (input.age <= 1 || input.age >= 100)
    noMatchHints.push(`Age ${input.age} is at the extreme of typical trial ranges. Few trials enroll this age group.`);
  if (input.sex !== 'ALL')
    noMatchHints.push('Try sex="ALL" to include studies not restricted by sex.');
  if (input.healthyVolunteer)
    noMatchHints.push('Many studies do not accept healthy volunteers. Set healthyVolunteer=false if the patient has a relevant condition.');
  if (input.recruitingOnly)
    noMatchHints.push('Set recruitingOnly=false to include completed, active, and not-yet-recruiting studies.');
  if (input.location.city || input.location.state)
    noMatchHints.push('Try searching with just the country to find studies in other cities/states.');
}

// get-study-count.tool.ts:99 (simplest form — single static string)
...(totalCount === 0 ? { noMatchHints: ['Try broader search terms or fewer filters.'] } : {}),
```

**Shape B — `searchCriteria?: Record<string, unknown>`** (used in `search-studies`, `get-study-count`):

```ts
// search-studies.tool.ts:123–127 (output schema)
searchCriteria: z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Echo of query/filter criteria used. Present when results are empty.'),

// search-studies.tool.ts:163–176 (handler — only populated on empty)
if (result.studies.length === 0) {
  const criteria: Record<string, unknown> = {};
  if (input.query) criteria.query = input.query;
  if (input.conditionQuery) criteria.conditionQuery = input.conditionQuery;
  // ... etc for every input field
  return { ...result, searchCriteria: criteria, noMatchHints: hints };
}

// get-study-count.tool.ts:87–98 (always populated when any criterion is set)
const criteria: Record<string, unknown> = {};
if (input.query) criteria.query = input.query;
// ...
return {
  totalCount,
  ...(Object.keys(criteria).length > 0 ? { searchCriteria: criteria } : {}),
  ...(totalCount === 0 ? { noMatchHints: [...] } : {}),
};
```

**Shape C — partial-success envelope** (`get-study-results`):

```ts
// get-study-results.tool.ts:364–381 (output schema)
studiesWithoutResults: z
  .array(z.string())
  .optional()
  .describe('NCT IDs that do not have results data.'),
fetchErrors: z
  .array(
    z.object({
      nctId: z.string().describe('NCT ID.'),
      error: z.string().describe('Error message.'),
    }).describe('A single fetch error.'),
  )
  .optional()
  .describe('Studies that could not be fetched.'),

// get-study-results.tool.ts:484–488 (handler return)
return {
  results,
  ...(studiesWithoutResults.length > 0 ? { studiesWithoutResults } : {}),
  ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
};
```

**Shape D — format-only next-step pointer** (`get-study`):

```ts
// get-study.tool.ts:117–120 (format body, no output schema field)
if (s.hasResults != null) {
  lines.push(
    `**Has Results:** ${s.hasResults ? 'yes — fetch via clinicaltrials_get_study_results' : 'no'}`,
  );
}

// get-study.tool.ts:257–258 (format body, Results Summary section)
lines.push('Use clinicaltrials_get_study_results for full data.');
```

**Shape E — scalar-to-array coercion** (used in all tools accepting union input):

```ts
// get-study-results.tool.ts:385–390
const nctIds = Array.isArray(input.nctIds) ? input.nctIds : [input.nctIds];
const sections: Section[] = input.sections
  ? Array.isArray(input.sections)
    ? input.sections
    : [input.sections]
  : [...VALID_SECTIONS];

// get-field-values.tool.ts:71 (simplest form)
const fields = Array.isArray(input.fields) ? input.fields : [input.fields];
```
