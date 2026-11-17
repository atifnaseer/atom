import { describe, expect, it } from "vitest";
import {
  STORE_ATTRIBUTE,
  storeAttributes,
  storeState,
} from "@/lib/ejad/store-messages";

const ATTRS = { source: "magistrala", route: "cold-room", tags: ["a"] };

describe("storeState", () => {
  it("is on only when the attribute is exactly true", () => {
    expect(
      storeState({ attributes: { ...ATTRS, store_messages: true } }),
    ).toEqual({
      enabled: true,
    });
    expect(
      storeState({ attributes: { ...ATTRS, store_messages: "true" } }),
    ).toEqual({ enabled: false });
    expect(storeState({ attributes: ATTRS })).toEqual({ enabled: false });
    expect(storeState({ attributes: null })).toEqual({ enabled: false });
  });
});

describe("storeAttributes", () => {
  it("sets the flag and keeps every other attribute", () => {
    expect(storeAttributes(ATTRS, true)).toEqual({
      ...ATTRS,
      [STORE_ATTRIBUTE]: true,
    });
  });

  it("removes the flag when turned off", () => {
    expect(storeAttributes({ ...ATTRS, store_messages: true }, false)).toEqual(
      ATTRS,
    );
  });

  it("handles a channel with no attributes", () => {
    expect(storeAttributes(null, true)).toEqual({ store_messages: true });
    expect(storeAttributes(null, false)).toEqual({});
  });

  it("does not mutate the input", () => {
    const input = { ...ATTRS, store_messages: true };
    storeAttributes(input, false);
    expect(input.store_messages).toBe(true);
  });
});
