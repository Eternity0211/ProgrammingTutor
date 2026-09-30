import { buildClassTabHref, resolveClassTab } from "@/lib/class-tabs";

describe("class tab URL state", () => {
  it.each([
    ["assignments", "assignments"],
    ["people", "people"],
    ["settings", "settings"],
    ["unknown", "assignments"],
    [undefined, "assignments"],
  ])("resolves %s to %s", (value, expected) => {
    expect(resolveClassTab(value)).toBe(expected);
  });

  it("updates the tab while preserving unrelated query parameters", () => {
    expect(
      buildClassTabHref(
        "/classes/CPP101",
        "from=notification&tab=assignments",
        "people",
      ),
    ).toBe("/classes/CPP101?from=notification&tab=people");
  });
});
