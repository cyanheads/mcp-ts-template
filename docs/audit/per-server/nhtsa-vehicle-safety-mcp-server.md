# nhtsa-vehicle-safety-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 7

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `nhtsa_search_recalls` | 1. Empty-result recovery | `format()` only: static string with `nhtsa_lookup_vehicles` pointer | `result.totalCount === 0` | No | search-recalls.tool.ts:170–177 |
| `nhtsa_search_recalls` | 8. Recovery on errors | Error message in thrown `notFound()`: `'Verify the campaign number format (e.g., "24V744000").'` | campaign not found | No (in thrown error message) | search-recalls.tool.ts:95–98 |
| `nhtsa_get_safety_ratings` | 1. Empty-result recovery | `message?: string` — typed in output | `variants.length === 0` or `vehicleId` not found | Yes | get-safety-ratings.tool.ts:117–118, 130–131, 144–145 |
| `nhtsa_get_safety_ratings` | 1. Empty-result recovery | `format()` fallback: `result.message ?? 'No NCAP safety ratings available…'` | `result.ratings.length === 0` | Redundant (format() mirrors typed field) | get-safety-ratings.tool.ts:164–173 |
| `nhtsa_get_vehicle_safety` | 7. Warnings | `warnings: z.array(z.string())` — always present, even when empty | any section fetch failure; also when `variants.length === 0`; partial variant load | Yes | get-vehicle-safety.tool.ts:128–130 |
| `nhtsa_get_vehicle_safety` | 5. Partial-success envelopes | `sectionStatus: { safetyRatings: 'available'\|'partial'\|'unavailable'; recalls: ...; complaints: ... }` | per-section fetch failure or empty variant list | Yes | get-vehicle-safety.tool.ts:107–117 |
| `nhtsa_get_vehicle_safety` | 1. Empty-result recovery | `format()` section text: `'Use nhtsa_get_safety_ratings to retry specific variants or adjacent model years.'` | `sectionStatus.safetyRatings === 'unavailable'` or `ratings.length === 0` | No (format() only) | get-vehicle-safety.tool.ts:215–228 |
| `nhtsa_get_vehicle_safety` | 3. Next-step pointers | Inline in `format()`: `'Use nhtsa_get_safety_ratings to check specific variants or adjacent years.'` | ratings section empty or unavailable | No | get-vehicle-safety.tool.ts:224–226 |
| `nhtsa_decode_vin` | 7. Warnings | `errorCode?: string; errorText?: string` on each decoded vehicle | non-zero VPIC errorCode | Yes (per-item in output schema) | decode-vin.tool.ts:38–39 |
| `nhtsa_decode_vin` | 7. Warnings | `format()` renders: `**Warning (errorCode: ${v.errorCode}):** ${v.errorText ?? '…'}` | `v.errorCode != null && v.errorCode !== '0'` | Typed in output schema (mirrored in format) | decode-vin.tool.ts:105–110 |
| `nhtsa_search_investigations` | 1. Empty-result recovery | `message?: string` — typed in output | `totalCount === 0` | Yes | search-investigations.tool.ts:67–69 |
| `nhtsa_search_investigations` | 1. Empty-result recovery | Two-branch message: (a) no-filter branch suggests dataset issue; (b) filter branch names applied filters + broadening advice | `totalCount === 0`, conditioned on `appliedFilters.length` | Yes (message is typed) | search-investigations.tool.ts:131–143 |
| `nhtsa_search_investigations` | 1. Empty-result recovery | `format()` fallback: `result.message ?? 'No investigations found…Try broadening the search…'` | `result.totalCount === 0` | Mirrors typed field in format() | search-investigations.tool.ts:165–173 |
| `nhtsa_search_complaints` | 1. Empty-result recovery | `format()` only: static string with `nhtsa_lookup_vehicles` pointer | `result.totalCount === 0` | No | search-complaints.tool.ts:139–145 |
| `nhtsa_search_complaints` | 3. Next-step pointers | `format()` inline: `'Use offset=${...} to retrieve the next page.'` | `result.offset + result.returned < result.totalCount` | No | search-complaints.tool.ts:166–168 |
| `nhtsa_lookup_vehicles` | 1. Empty-result recovery | `message?: string` — typed in output | `all.length === 0` (no results) or `slice.length === 0` (pagination OOB) | Yes | lookup-vehicles.tool.ts:58–62 |
| `nhtsa_lookup_vehicles` | 1. Empty-result recovery | Per-operation message variants: `'models'` → `'Verify the make spelling with operation="makes"'`; `'vehicle_types'` → same; `'manufacturer'` → `'Try a shorter or different query.'`; `'makes'` → OOB only | `all.length === 0` or OOB page | Yes | lookup-vehicles.tool.ts:170–186, 200–212, 238–248 |
| `nhtsa_lookup_vehicles` | 1. Empty-result recovery | `format()` fallback: `result.message ?? 'No results for "…" lookup. Check the spelling…'` | `result.returned === 0` | Mirrors typed field | lookup-vehicles.tool.ts:259–267 |
| `nhtsa_lookup_vehicles` | 3. Next-step pointers | OOB message: `'${totalCount} total — try a smaller offset.'` | pagination offset beyond result set | Yes (in `message` field) | lookup-vehicles.tool.ts:129–130, 143, 177, 209, 243 |

## Tool inventory

- `nhtsa_search_recalls` — Search recall campaigns by vehicle (make/model/year) or NHTSA campaign number, with optional local date-range filtering.
- `nhtsa_get_safety_ratings` — Fetch NCAP crash test ratings and ADAS feature data per vehicle variant; two-step lookup resolves variants from year/make/model then fetches each by vehicleId.
- `nhtsa_get_vehicle_safety` — Composite profile combining NCAP ratings, recalls, and complaint summary for a make/model/year; fan-out with per-section partial-success handling.
- `nhtsa_decode_vin` — Decode one or a batch (up to 50) VINs via VPIC; exposes VPIC error/warning codes per decoded vehicle.
- `nhtsa_search_investigations` — Search defect investigations (PE/EA/DP/RQ); downloads and caches the full ~4,200-record index and filters locally.
- `nhtsa_search_complaints` — Search consumer complaints by vehicle; returns component breakdown over all results plus a paginated slice of recent complaints.
- `nhtsa_lookup_vehicles` — Reference data lookup: all makes, models for a make, vehicle types for a make, or manufacturer details. Used by other tools as a "verify spelling" recovery step.

## Idiosyncratic patterns

**Service-layer HTTP 400 recovery hint.** In `NhtsaService.fetchJson`, a 400 response from NHTSA throws with an embedded tool pointer:

```ts
// nhtsa-service.ts:143–146
throw new Error(
  `NHTSA API returned no data for this request (HTTP 400). The vehicle may not exist in NHTSA's database — verify make/model spelling with nhtsa_lookup_vehicles.`,
);
```

This is not in any output schema — it surfaces only as an error message string. The recovery hint (`nhtsa_lookup_vehicles`) is buried in a plain `Error`, reaching the client only through the framework's error classifier.

**Code-label translation in output.** `nhtsa_search_investigations` populates both the raw code and a human-readable name on each investigation object, translated from a local lookup table:

```ts
// search-investigations.tool.ts:148–155
investigationType: i.investigationType,
investigationTypeName: i.investigationType
  ? (INVESTIGATION_TYPE_MAP[i.investigationType] ?? i.investigationType)
  : undefined,
status: i.status,
statusName: i.status ? (STATUS_MAP[i.status] ?? i.status) : undefined,
```

This is a parallel-field code-expansion pattern: both the raw code (`PE`) and its English label (`Preliminary Evaluation`) are present in the structured output.

**`nhtsa_get_vehicle_safety` deduplicates error-surface roles.** The `warnings` array and `sectionStatus` discriminated enum serve overlapping purposes: `sectionStatus` is machine-readable state (drives `format()` branching); `warnings` is human-readable explanation for the same failures. Both are always present in the output (warnings may be empty). This is the only tool in the server that separates machine-readable status from human-readable explanation into two distinct typed fields.

**Pagination next-page hint in `format()` only.** `nhtsa_search_complaints` computes the next offset and renders it as prose in `format()` but does not expose it as a typed output field:

```ts
// search-complaints.tool.ts:166–168
if (result.offset + result.returned < result.totalCount) {
  lines.push(`*Use offset=${result.offset + result.returned} to retrieve the next page.*\n`);
}
```

The pagination envelope fields (`offset`, `returned`, `limit`, `totalCount`) are all typed, so a consumer could compute the next offset themselves — but the tool only renders the calculated value in `format()`.

**VPIC `errorCode: '0'` sentinel.** The VPIC API returns `errorCode: '0'` for successful decodes. The schema types `errorCode?: string` with a `.describe('VPIC error code (0 = no error)')`. The `format()` body tests `v.errorCode !== '0'` to decide whether to render a warning. This sentinel convention is domain-specific and not abstracted.

```ts
// decode-vin.tool.ts:105–110
const hasError = v.errorCode != null && v.errorCode !== '0';
if (hasError) {
  lines.push(
    `**Warning (errorCode: ${v.errorCode}):** ${v.errorText ?? 'VPIC returned a decode warning.'}\n`,
  );
}
```

## Adoption gaps

- **`nhtsa_search_recalls` (vehicle lookup path):** Returns `{ recalls: [], totalCount: 0 }` typed output with no `message` field. The `format()` has a hardcoded string pointing to `nhtsa_lookup_vehicles`, but structuredContent clients get only `totalCount: 0` — they cannot distinguish "no recalls exist for this vehicle" from "wrong make/model/year spelling" without the prose hint.

- **`nhtsa_search_complaints`:** Same gap as `search-recalls` — zero-result guidance exists in `format()` only, not in the typed output schema. The tool already returns rich pagination metadata; a `message?: string` field following the same pattern as `nhtsa_get_safety_ratings`, `nhtsa_search_investigations`, and `nhtsa_lookup_vehicles` would be consistent with the rest of the server.

- **`nhtsa_decode_vin`:** Partial VIN and wildcard inputs are accepted, but there is no typed field indicating decode confidence or completeness. The VPIC `errorCode`/`errorText` fields carry this, but their semantics (string `'0'` = success) are opaque to downstream consumers without reading the `describe()` annotation. A `decodedSuccessfully: boolean` computed from `errorCode !== '0'` would make the per-item warning machine-readable without schema surgery.

## Concrete shape excerpts

**`message?: string` — typed empty-result guidance (used by `nhtsa_get_safety_ratings`, `nhtsa_search_investigations`, `nhtsa_lookup_vehicles`):**

```ts
// get-safety-ratings.tool.ts:115–118
message: z
  .string()
  .optional()
  .describe('Contextual guidance populated when no ratings are returned'),
```

**`sectionStatus` discriminated enum (unique to `nhtsa_get_vehicle_safety`):**

```ts
// get-vehicle-safety.tool.ts:107–117
const sectionStatusSchema = z.object({
  safetyRatings: z
    .enum(['available', 'partial', 'unavailable'])
    .describe('Availability of NCAP safety ratings in this response'),
  recalls: z
    .enum(['available', 'partial', 'unavailable'])
    .describe('Availability of recall data in this response'),
  complaints: z
    .enum(['available', 'partial', 'unavailable'])
    .describe('Availability of complaint data in this response'),
});
```

**`warnings: z.array(z.string())` — always-present non-fatal alert list (unique to `nhtsa_get_vehicle_safety`):**

```ts
// get-vehicle-safety.tool.ts:128–130
warnings: z
  .array(z.string())
  .describe('Warnings about sections that could not be loaded from NHTSA'),
```

**`errorCode?: string; errorText?: string` — per-item VPIC decode warning (unique to `nhtsa_decode_vin`):**

```ts
// decode-vin.tool.ts:38–39
errorCode: z.string().optional().describe('VPIC error code (0 = no error)'),
errorText: z.string().optional().describe('VPIC error or warning text'),
```

**`format()`-only empty-result hint with tool pointer (used by `nhtsa_search_recalls`, `nhtsa_search_complaints`):**

```ts
// search-recalls.tool.ts:170–177
if (result.totalCount === 0) {
  return [
    {
      type: 'text' as const,
      text: 'No recalls found matching the search criteria. This vehicle may have no recalls on file, or the make/model/year may not match NHTSA records. Use nhtsa_lookup_vehicles to verify.',
    },
  ];
}
```

**`message` with two-branch content based on filter state (`nhtsa_search_investigations`):**

```ts
// search-investigations.tool.ts:131–143
const message =
  totalCount === 0
    ? appliedFilters.length === 0
      ? 'No investigations found. This is unexpected — the investigations dataset should contain thousands of records.'
      : `No investigations matched the applied filters (${appliedFilters.join(', ')}). Filters are ANDed; try broadening by removing a filter or searching make-only. make/model/query all search subject+description text — try a shorter term.`
    : undefined;
```

**Pagination OOB recovery in typed `message` (`nhtsa_lookup_vehicles`):**

```ts
// lookup-vehicles.tool.ts:129–130
const outOfBoundsMessage = (totalCount: number): string =>
  `No results for this page (offset ${offset}, limit ${limit}). ${totalCount} total — try a smaller offset.`;
```
