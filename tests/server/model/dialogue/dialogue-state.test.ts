import { transition, type DialogueState } from "@/server/model/dialogue/orchestrator/dialogue-state";

describe("dialogue state", () => {
  it("models explicit phase transitions without mutating prior state", () => {
    const state = { phase: "session", request: {} as never, traceLogger: {} as never } satisfies DialogueState;
    const next = transition(state, "context");
    expect(state.phase).toBe("session");
    expect(next.phase).toBe("context");
  });
});
