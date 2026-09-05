import { describe, expect, it } from "vitest";

describe("privacy poll vote delta calculation", () => {
  it("accurately computes options to remove and add when a vote changes", () => {
    const previousIds = [101, 102];
    const nextIds = [102, 103];

    const toRemove = previousIds.filter((id) => !nextIds.includes(id));
    const toAdd = nextIds.filter((id) => !previousIds.includes(id));

    expect(toRemove).toEqual([101]);
    expect(toAdd).toEqual([103]);
  });

  it("does not remove or re-add options when user submits identical votes", () => {
    const previousIds = [101, 102];
    const nextIds = [101, 102];

    const toRemove = previousIds.filter((id) => !nextIds.includes(id));
    const toAdd = nextIds.filter((id) => !previousIds.includes(id));

    expect(toRemove).toEqual([]);
    expect(toAdd).toEqual([]);
  });

  it("removes all previous votes if changing to a completely different option", () => {
    const previousIds = [101];
    const nextIds = [202];

    const toRemove = previousIds.filter((id) => !nextIds.includes(id));
    const toAdd = nextIds.filter((id) => !previousIds.includes(id));

    expect(toRemove).toEqual([101]);
    expect(toAdd).toEqual([202]);
  });
});
