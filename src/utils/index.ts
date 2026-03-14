/**
 * @fileoverview Unified barrel export for all utility modules.
 * @module utils
 */

// Formatting
export {
  type Alignment,
  type DiffFormat,
  DiffFormatter,
  type DiffFormatterOptions,
  diffFormatter,
  MarkdownBuilder,
  markdown,
  TableFormatter,
  type TableFormatterOptions,
  type TableStyle,
  TreeFormatter,
  type TreeFormatterOptions,
  type TreeNode,
  type TreeStyle,
  tableFormatter,
  treeFormatter,
} from './formatting/index.js';
// Encoding
export { arrayBufferToBase64, base64ToString, stringToBase64 } from './internal/encoding.js';
// Error handler
export { ErrorHandler } from './internal/error-handler/errorHandler.js';
export type {
  BaseErrorMapping,
  ErrorContext,
  ErrorHandlerOptions,
  ErrorMapping,
} from './internal/error-handler/types.js';
// Logger
export { Logger, logger, type McpLogLevel } from './internal/logger.js';
// Request context
export {
  type AuthContext,
  type CreateRequestContextParams,
  type RequestContext,
  requestContextService,
} from './internal/requestContext.js';
// Runtime
export { type RuntimeCapabilities, runtimeCaps } from './internal/runtime.js';
// Token counting
export {
  type ChatMessage,
  countChatTokens,
  countTokens,
  type ModelHeuristics,
} from './metrics/tokenCounter.js';
// Network
export { type FetchWithTimeoutOptions, fetchWithTimeout } from './network/fetchWithTimeout.js';
// Pagination
export {
  DEFAULT_PAGINATION_CONFIG,
  decodeCursor,
  encodeCursor,
  extractCursor,
  type PaginatedResult,
  type PaginationState,
  paginateArray,
} from './pagination/pagination.js';
// Parsing
export {
  type AddPageOptions,
  Allow,
  CsvParser,
  csvParser,
  type DrawImageOptions,
  type DrawTextOptions,
  dateParser,
  type EmbedImageOptions,
  type ExtractTextOptions,
  type ExtractTextResult,
  type FillFormOptions,
  FrontmatterParser,
  type FrontmatterResult,
  frontmatterParser,
  JsonParser,
  jsonParser,
  type PageRange,
  type PdfMetadata,
  PdfParser,
  parseDateString,
  parseDateStringDetailed,
  pdfParser,
  type SetMetadataOptions,
  thinkBlockRegex,
  XmlParser,
  xmlParser,
  YamlParser,
  yamlParser,
} from './parsing/index.js';
// Scheduling
export { type Job, SchedulerService, schedulerService } from './scheduling/scheduler.js';
// Security
export {
  type EntityPrefixConfig,
  generateRequestContextId,
  generateUUID,
  type HtmlSanitizeConfig,
  type IdGenerationOptions,
  IdGenerator,
  idGenerator,
  type PathSanitizeOptions,
  type RateLimitConfig,
  type RateLimitEntry,
  RateLimiter,
  Sanitization,
  type SanitizedPathInfo,
  type SanitizeStringOptions,
  sanitization,
  sanitizeInputForLogging,
} from './security/index.js';
// Telemetry — instrumentation
export {
  initializeOpenTelemetry,
  sdk,
  shutdownOpenTelemetry,
} from './telemetry/instrumentation.js';
// Telemetry — metrics
export {
  createCounter,
  createHistogram,
  createObservableCounter,
  createObservableGauge,
  createObservableUpDownCounter,
  createUpDownCounter,
  getMeter,
} from './telemetry/metrics.js';
// Telemetry — semantic conventions
export {
  ATTR_CLOUD_ACCOUNT_ID,
  ATTR_CLOUD_AVAILABILITY_ZONE,
  ATTR_CLOUD_PLATFORM,
  ATTR_CLOUD_PROVIDER,
  ATTR_CLOUD_REGION,
  ATTR_CODE_FILEPATH,
  ATTR_CODE_FUNCTION,
  ATTR_CODE_LINENO,
  ATTR_CODE_NAMESPACE,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_ERROR_TYPE,
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
  ATTR_HTTP_REQUEST_BODY_SIZE,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_BODY_SIZE,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_MCP_CLIENT_ID,
  ATTR_MCP_OPERATION_NAME,
  ATTR_MCP_REQUEST_ID,
  ATTR_MCP_RESOURCE_MIME_TYPE,
  ATTR_MCP_RESOURCE_SIZE_BYTES,
  ATTR_MCP_RESOURCE_URI,
  ATTR_MCP_SESSION_ID,
  ATTR_MCP_TENANT_ID,
  ATTR_MCP_TOOL_DURATION_MS,
  ATTR_MCP_TOOL_ERROR_CODE,
  ATTR_MCP_TOOL_INPUT_BYTES,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE,
  ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA,
  ATTR_MCP_TOOL_MEMORY_RSS_AFTER,
  ATTR_MCP_TOOL_MEMORY_RSS_BEFORE,
  ATTR_MCP_TOOL_MEMORY_RSS_DELTA,
  ATTR_MCP_TOOL_NAME,
  ATTR_MCP_TOOL_OUTPUT_BYTES,
  ATTR_MCP_TOOL_SUCCESS,
  ATTR_NETWORK_PEER_ADDRESS,
  ATTR_NETWORK_PEER_PORT,
  ATTR_NETWORK_PROTOCOL_NAME,
  ATTR_NETWORK_PROTOCOL_VERSION,
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
  ATTR_URL_PATH,
  ATTR_URL_QUERY,
  ATTR_URL_SCHEME,
  ATTR_USER_AGENT_ORIGINAL,
} from './telemetry/semconv.js';
// Telemetry — trace
export {
  buildTraceparent,
  createContextWithParentTrace,
  extractTraceparent,
  injectCurrentContextInto,
  runInContext,
  type TraceparentInfo,
  withSpan,
} from './telemetry/trace.js';
// Type guards
export { isErrorWithCode, isRecord } from './types/index.js';
