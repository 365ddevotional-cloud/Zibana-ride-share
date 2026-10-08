import type { Request } from "express";

/** Reject wildcard/array parameters where an endpoint expects one identifier. */
export function routeParam(req: Pick<Request, "params">, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || !value.length) {
    throw Object.assign(new Error(`Invalid route parameter: ${name}`), { status: 400 });
  }
  return value;
}
