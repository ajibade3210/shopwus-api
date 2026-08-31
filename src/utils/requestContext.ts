import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "../types/requestContext";

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
