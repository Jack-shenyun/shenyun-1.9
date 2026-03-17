import type { RequestHandler } from "express";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  return Object.getPrototypeOf(value) === Object.prototype;
}

export function normalizeBlankStringsDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim() === "" ? undefined : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeBlankStringsDeep(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeBlankStringsDeep(nestedValue),
      ]),
    );
  }

  return value;
}

export function normalizeSerializedInput(rawInput: unknown): unknown {
  if (typeof rawInput !== "string" || rawInput.trim() === "") {
    return rawInput;
  }

  try {
    return JSON.stringify(normalizeBlankStringsDeep(JSON.parse(rawInput)));
  } catch {
    return rawInput;
  }
}

export const normalizeTrpcRequestInputs: RequestHandler = (req, _res, next) => {
  req.body = normalizeBlankStringsDeep(req.body);

  if (typeof req.query?.input === "string") {
    req.query.input = normalizeSerializedInput(req.query.input) as string;
  } else if (Array.isArray(req.query?.input)) {
    req.query.input = req.query.input.map((item) =>
      typeof item === "string" ? normalizeSerializedInput(item) : item,
    ) as any;
  }

  next();
};
