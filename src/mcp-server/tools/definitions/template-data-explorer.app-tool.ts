/**
 * @fileoverview MCP App tool that generates sample sales data with an interactive explorer UI.
 *
 * Demonstrates the MCP Apps extension (SEP-1865) with a practical use case: the tool
 * returns structured tabular data, and the linked UI resource renders it as a sortable,
 * filterable table with row selection. Users interact directly with the data — sorting
 * columns, searching, selecting rows — while the model sees context updates.
 *
 * Hosts without MCP Apps support receive a formatted text table as fallback.
 *
 * @module src/mcp-server/tools/definitions/template-data-explorer.app-tool
 * @see {@link ../../../docs/mcp-apps.md} for full MCP Apps overview
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { type RequestContext, logger } from '@/utils/index.js';

const TOOL_NAME = 'template_data_explorer';
const TOOL_TITLE = 'Template Data Explorer';
const TOOL_DESCRIPTION =
  'Generates sample sales data and renders an interactive explorer. Users can sort columns, filter rows, and select entries directly in the UI. Hosts without MCP Apps support receive a text table.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

/** The UI Resource URI that hosts will fetch and render as a sandboxed iframe. */
const UI_RESOURCE_URI = 'ui://template-data-explorer/app.html';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const InputSchema = z
  .object({
    rowCount: z
      .number()
      .int()
      .min(5)
      .max(100)
      .default(20)
      .describe('Number of sample rows to generate (5–100).'),
  })
  .describe('Parameters for generating sample sales data.');

const SaleRowSchema = z.object({
  id: z.number().int().describe('Unique row identifier.'),
  region: z.string().describe('Sales region name.'),
  product: z.string().describe('Product name.'),
  units: z.number().int().describe('Units sold.'),
  revenue: z.number().describe('Revenue in USD.'),
  date: z.string().describe('Sale date (YYYY-MM-DD).'),
});

const OutputSchema = z
  .object({
    rows: z.array(SaleRowSchema).describe('Generated sales data rows.'),
    generatedAt: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp when data was generated.'),
    summary: z
      .object({
        totalRows: z.number().int().describe('Total number of rows.'),
        totalRevenue: z.number().describe('Sum of all revenue.'),
        totalUnits: z.number().int().describe('Sum of all units sold.'),
      })
      .describe('Aggregate summary of the dataset.'),
  })
  .describe('Sales data explorer response payload.');

type DataExplorerInput = z.infer<typeof InputSchema>;
type DataExplorerOutput = z.infer<typeof OutputSchema>;

// ─── Data Generation ──────────────────────────────────────────────────────────

const REGIONS = [
  'North America',
  'Europe',
  'Asia Pacific',
  'Latin America',
  'Middle East',
];
const PRODUCTS = [
  'Widget Pro',
  'Gadget X',
  'Module Z',
  'Sensor Alpha',
  'Platform Core',
];

function generateSalesData(rowCount: number): DataExplorerOutput {
  const rows = Array.from({ length: rowCount }, (_, i) => {
    const units = Math.floor(Math.random() * 500) + 10;
    const pricePerUnit = Math.floor(Math.random() * 200) + 20;
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    return {
      id: i + 1,
      region: REGIONS[Math.floor(Math.random() * REGIONS.length)]!,
      product: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]!,
      units,
      revenue: units * pricePerUnit,
      date: `2025-${month}-${day}`,
    };
  });

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalUnits = rows.reduce((sum, r) => sum + r.units, 0);

  return {
    rows,
    generatedAt: new Date().toISOString(),
    summary: { totalRows: rows.length, totalRevenue, totalUnits },
  };
}

// ─── Logic ────────────────────────────────────────────────────────────────────

function dataExplorerLogic(
  input: DataExplorerInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): DataExplorerOutput {
  logger.debug('Generating sample sales data.', {
    ...appContext,
    rowCount: input.rowCount,
  });

  return generateSalesData(input.rowCount);
}

// ─── Response Formatter (text fallback for non-app hosts) ─────────────────────

function responseFormatter(result: DataExplorerOutput): ContentBlock[] {
  const header =
    'ID  | Region           | Product        | Units | Revenue    | Date';
  const sep =
    '----|------------------|----------------|-------|------------|----------';
  const rows = result.rows.map(
    (r) =>
      `${String(r.id).padStart(3)} | ${r.region.padEnd(16)} | ${r.product.padEnd(14)} | ${String(r.units).padStart(5)} | $${r.revenue.toLocaleString('en-US').padStart(9)} | ${r.date}`,
  );
  const summary = `\nTotal: ${result.summary.totalRows} rows | ${result.summary.totalUnits.toLocaleString()} units | $${result.summary.totalRevenue.toLocaleString('en-US')} revenue`;

  return [
    {
      type: 'text',
      text: [header, sep, ...rows, summary].join('\n'),
    },
  ];
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const dataExplorerAppTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:data-explorer:read'], dataExplorerLogic),
  responseFormatter,
  _meta: {
    ui: { resourceUri: UI_RESOURCE_URI },
  },
};
