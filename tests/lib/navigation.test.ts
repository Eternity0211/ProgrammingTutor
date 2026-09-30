import {
  isNavigationPathActive,
  resolveSafeCallbackPath,
} from "@/lib/navigation";

describe("safe authentication callbacks", () => {
  const origin = "https://gradeit.example";

  it.each([
    ["/classes/CPP101/assignment-1", "/classes/CPP101/assignment-1"],
    ["/classes?join=CPP%20101", "/classes?join=CPP%20101"],
    [
      "https://gradeit.example/classes/CPP101?tab=people#members",
      "/classes/CPP101?tab=people#members",
    ],
  ])("preserves a same-origin target: %s", (value, expected) => {
    expect(resolveSafeCallbackPath(value, origin)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "https://malicious.example/steal",
    "//malicious.example/steal",
    "javascript:alert(1)",
    "not a valid callback",
  ])("falls back for an unsafe target: %s", (value) => {
    expect(resolveSafeCallbackPath(value, origin)).toBe("/classes");
  });
});

describe("navigation path matching", () => {
  it.each([
    ["/classes/CPP101", "/classes/CPP101", true],
    ["/classes/CPP101/assignment-1", "/classes/CPP101", true],
    ["/classes/CPP101", "/classes/CPP10", false],
    ["/classes/CPP101", "/classes/CPP101/", true],
    ["/privacy", "/", false],
    ["/", "/", true],
  ])("matches %s against %s as %s", (pathname, target, expected) => {
    expect(isNavigationPathActive(pathname, target)).toBe(expected);
  });
});
