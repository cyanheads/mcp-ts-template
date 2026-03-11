/**
 * @fileoverview Defines local OpenTelemetry semantic convention constants to ensure
 * stability and avoid dependency conflicts with different versions of
 * `@opentelemetry/semantic-conventions`.
 *
 * This module provides both standard OTEL conventions (aligned with 1.37+) and
 * custom MCP-specific attributes for tool execution and resource monitoring.
 *
 * @module src/utils/telemetry/semconv
 */

// ============================================================================
// Standard OpenTelemetry Semantic Conventions (Stable)
// ============================================================================

/**
 * Logical name of the service (e.g., `my-mcp-server`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/#service
 */
export const ATTR_SERVICE_NAME = 'service.name';

/** Semantic version of the service (e.g., `1.2.3`). */
export const ATTR_SERVICE_VERSION = 'service.version';

/** Unique ID of the running service instance (e.g., a UUID or pod name). */
export const ATTR_SERVICE_INSTANCE_ID = 'service.instance.id';

/**
 * Name of the deployment environment (e.g., `production`, `staging`, `development`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
 */
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

/**
 * Name of the cloud provider (e.g., `aws`, `gcp`, `azure`, `cloudflare`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/cloud/
 */
export const ATTR_CLOUD_PROVIDER = 'cloud.provider';

/** Cloud platform within the provider (e.g., `aws_lambda`, `gcp_cloud_run`, `cloudflare_workers`). */
export const ATTR_CLOUD_PLATFORM = 'cloud.platform';

/** Geographic region of the cloud resource (e.g., `us-east-1`). */
export const ATTR_CLOUD_REGION = 'cloud.region';

/** Availability zone within the cloud region. */
export const ATTR_CLOUD_AVAILABILITY_ZONE = 'cloud.availability_zone';

/** Cloud account or project ID that owns the resource. */
export const ATTR_CLOUD_ACCOUNT_ID = 'cloud.account.id';

/**
 * HTTP request method (e.g., `GET`, `POST`).
 * @see https://opentelemetry.io/docs/specs/semconv/http/
 */
export const ATTR_HTTP_REQUEST_METHOD = 'http.request.method';

/** HTTP response status code (e.g., `200`, `404`). */
export const ATTR_HTTP_RESPONSE_STATUS_CODE = 'http.response.status_code';

/** HTTP route template matched by the server (e.g., `/users/:id`). */
export const ATTR_HTTP_ROUTE = 'http.route';

/** Size of the HTTP request body in bytes. */
export const ATTR_HTTP_REQUEST_BODY_SIZE = 'http.request.body.size';

/** Size of the HTTP response body in bytes. */
export const ATTR_HTTP_RESPONSE_BODY_SIZE = 'http.response.body.size';

/** Full URL of the request including scheme, host, path, and query. */
export const ATTR_URL_FULL = 'url.full';

/** URL path component (e.g., `/api/users`). */
export const ATTR_URL_PATH = 'url.path';

/** URL query string (e.g., `?limit=10&offset=0`). */
export const ATTR_URL_QUERY = 'url.query';

/** URL scheme (e.g., `http`, `https`). */
export const ATTR_URL_SCHEME = 'url.scheme';

/**
 * Describes the class or type of error (e.g., `TimeoutError`, `500`).
 * @see https://opentelemetry.io/docs/specs/semconv/exceptions/
 */
export const ATTR_ERROR_TYPE = 'error.type';

/** Fully qualified exception class name (e.g., `java.io.IOException`). */
export const ATTR_EXCEPTION_TYPE = 'exception.type';

/** Exception message string. */
export const ATTR_EXCEPTION_MESSAGE = 'exception.message';

/** Full exception stack trace as a string. */
export const ATTR_EXCEPTION_STACKTRACE = 'exception.stacktrace';

/**
 * Name of the function or method being instrumented.
 * @see https://opentelemetry.io/docs/specs/semconv/general/attributes/
 */
export const ATTR_CODE_FUNCTION = 'code.function';

/** Fully qualified namespace or module containing the function (e.g., `com.example.MyClass`). */
export const ATTR_CODE_NAMESPACE = 'code.namespace';

/** Source file path containing the instrumented code. */
export const ATTR_CODE_FILEPATH = 'code.filepath';

/** Line number in the source file where the instrumented code starts. */
export const ATTR_CODE_LINENO = 'code.lineno';

/**
 * IP address or hostname of the remote peer.
 * @see https://opentelemetry.io/docs/specs/semconv/general/attributes/
 */
export const ATTR_NETWORK_PEER_ADDRESS = 'network.peer.address';

/** Port number of the remote peer. */
export const ATTR_NETWORK_PEER_PORT = 'network.peer.port';

/** Application-layer protocol name (e.g., `http`, `grpc`, `amqp`). */
export const ATTR_NETWORK_PROTOCOL_NAME = 'network.protocol.name';

/** Version of the application-layer protocol (e.g., `1.1`, `2`). */
export const ATTR_NETWORK_PROTOCOL_VERSION = 'network.protocol.version';

/**
 * Unparsed `User-Agent` header value from the HTTP request.
 */
export const ATTR_USER_AGENT_ORIGINAL = 'user_agent.original';

// ============================================================================
// Custom MCP Tool Execution Attributes
// ============================================================================

/**
 * Registered name of the MCP tool being invoked (e.g., `echo_message`).
 * Custom attribute specific to MCP tool invocations.
 */
export const ATTR_MCP_TOOL_NAME = 'mcp.tool.name';

/** Serialized byte size of the tool's input arguments. */
export const ATTR_MCP_TOOL_INPUT_BYTES = 'mcp.tool.input_bytes';

/** Serialized byte size of the tool's output result. */
export const ATTR_MCP_TOOL_OUTPUT_BYTES = 'mcp.tool.output_bytes';

/** Wall-clock execution duration of the tool handler in milliseconds. */
export const ATTR_MCP_TOOL_DURATION_MS = 'mcp.tool.duration_ms';

/** Whether the tool handler completed successfully (`true`) or with an error (`false`). */
export const ATTR_MCP_TOOL_SUCCESS = 'mcp.tool.success';

/** JSON-RPC error code from the thrown `McpError`, present when `mcp.tool.success` is `false`. */
export const ATTR_MCP_TOOL_ERROR_CODE = 'mcp.tool.error_code';

/**
 * Process Resident Set Size (RSS) in bytes immediately before tool handler execution.
 */
export const ATTR_MCP_TOOL_MEMORY_RSS_BEFORE = 'mcp.tool.memory_rss_bytes.before';

/** Process RSS in bytes immediately after tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_RSS_AFTER = 'mcp.tool.memory_rss_bytes.after';

/** Change in process RSS (after minus before) during tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_RSS_DELTA = 'mcp.tool.memory_rss_bytes.delta';

/**
 * V8 heap memory used in bytes immediately before tool handler execution.
 */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE = 'mcp.tool.memory_heap_used_bytes.before';

/** V8 heap memory used in bytes immediately after tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER = 'mcp.tool.memory_heap_used_bytes.after';

/** Change in V8 heap used (after minus before) during tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA = 'mcp.tool.memory_heap_used_bytes.delta';

// ============================================================================
// Custom MCP Resource Attributes
// ============================================================================

/**
 * Full URI identifying the MCP resource being accessed (e.g., `myscheme://items/123`).
 */
export const ATTR_MCP_RESOURCE_URI = 'mcp.resource.uri';

/** MIME type of the resource content (e.g., `application/json`, `text/plain`). */
export const ATTR_MCP_RESOURCE_MIME_TYPE = 'mcp.resource.mime_type';

/** Byte size of the resource content returned by the handler. */
export const ATTR_MCP_RESOURCE_SIZE_BYTES = 'mcp.resource.size_bytes';

// ============================================================================
// Custom MCP Request Context Attributes
// ============================================================================

/**
 * Unique identifier for the MCP request, auto-generated per invocation.
 */
export const ATTR_MCP_REQUEST_ID = 'mcp.request.id';

/** Name of the MCP operation being performed (e.g., `tools/call`, `resources/read`). */
export const ATTR_MCP_OPERATION_NAME = 'mcp.operation.name';

/** Tenant identifier from the JWT `tid` claim, used for multi-tenant storage scoping. */
export const ATTR_MCP_TENANT_ID = 'mcp.tenant.id';

/** OAuth client identifier from the JWT `cid` or `client_id` claim. */
export const ATTR_MCP_CLIENT_ID = 'mcp.client.id';

/** MCP transport session identifier, scoped to a single client connection. */
export const ATTR_MCP_SESSION_ID = 'mcp.session.id';
