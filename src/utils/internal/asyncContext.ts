/**
 * @fileoverview Manages asynchronous context propagation using AsyncLocalStorage.
 * This module provides a mechanism to store and retrieve a `RequestContext` across
 * asynchronous operations, ensuring that critical metadata like `requestId` and trace
 * information is available throughout the entire call stack without prop drilling.
 * @module src/utils/internal/asyncContext
 * @see {@link src/utils/internal/requestContext.ts} for the definition of RequestContext.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "./requestContext.js";

/**
 * The singleton `AsyncLocalStorage` instance for storing the `RequestContext`.
 * This holds the context for the duration of a single asynchronous operation,
 * such as an incoming tool call or a scheduled job.
 */
export const requestContextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Retrieves the current `RequestContext` from the async local storage.
 * It is a synchronous call that depends on the execution context.
 *
 * @returns {RequestContext | undefined} The current `RequestContext` if it exists
 * in the current async context, otherwise `undefined`.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

/**
 * A higher-order function that runs a given function within a specified `RequestContext`.
 * This is the primary mechanism for establishing an async context for an operation.
 *
 * @template T The return type of the function to be executed.
 * @param {RequestContext} context - The `RequestContext` to set for the duration of the function's execution.
 * @param {() => T} fn - The function to execute within the context.
 * @returns {T} The result returned by the function `fn`.
 */
export function withRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStore.run(context, fn);
}
