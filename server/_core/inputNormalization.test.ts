import { describe, expect, it, vi } from "vitest";
import {
  normalizeBlankStringsDeep,
  normalizeSerializedInput,
  normalizeTrpcRequestInputs,
} from "./inputNormalization";

describe("inputNormalization", () => {
  it("normalizes blank strings recursively", () => {
    expect(
      normalizeBlankStringsDeep({
        name: "",
        code: "PRD-001",
        nested: {
          remark: "   ",
          title: "有效值",
        },
        items: ["", "A", "  ", 1],
      }),
    ).toEqual({
      name: undefined,
      code: "PRD-001",
      nested: {
        remark: undefined,
        title: "有效值",
      },
      items: [undefined, "A", undefined, 1],
    });
  });

  it("normalizes serialized trpc input payload", () => {
    const normalized = normalizeSerializedInput(
      JSON.stringify({
        0: {
          json: {
            name: "",
            remark: "  ",
            status: "draft",
          },
        },
      }),
    );

    expect(normalized).toBe(
      JSON.stringify({
        0: {
          json: {
            status: "draft",
          },
        },
      }),
    );
  });

  it("normalizes request body and query input through middleware", () => {
    const req = {
      body: {
        name: "",
        platformName: "国家平台",
      },
      query: {
        input: JSON.stringify({
          0: {
            json: {
              search: "挂网",
              province: "   ",
            },
          },
        }),
      },
    } as any;
    const next = vi.fn();

    normalizeTrpcRequestInputs(req, {} as any, next);

    expect(req.body).toEqual({
      name: undefined,
      platformName: "国家平台",
    });
    expect(req.query.input).toBe(
      JSON.stringify({
        0: {
          json: {
            search: "挂网",
          },
        },
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
