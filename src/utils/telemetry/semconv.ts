/**
 * @fileoverview Defines local OpenTelemetry semantic convention constants to ensure
 * stability and avoid dependency conflicts with different versions of
 * `@opentelemetry/semantic-conventions`.
 * @module src/utils/telemetry/semconv
 */

/**
 * The method or function name, or equivalent (usually rightmost part of the code unit's name).
 */
export const ATTR_CODE_FUNCTION = "code.function";

/**
 * The "namespace" within which `code.function` is defined.
 * Usually the qualified class or module name, etc.
 */
export const ATTR_CODE_NAMESPACE = "code.namespace";
