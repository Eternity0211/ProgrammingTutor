import { describe, expect, it } from "@jest/globals";
import { DialogueStateGraph, transition, type DialogueState } from "@/server/model/dialogue/orchestrator/dialogue-state";

const state = { phase: "session", request: {} as DialogueState["request"], traceLogger: {} as DialogueState["traceLogger"] } satisfies DialogueState;

describe("DialogueStateGraph", () => {
  it("runs nodes in declared order", async () => {
    const order: string[] = [];
    const graph = new DialogueStateGraph()
      .addNode("first", async (current) => { order.push("first"); return transition(current, "context"); })
      .addNode("second", async (current) => { order.push("second"); return transition(current, "completed"); })
      .setEntryPoint("first")
      .addEdge("first", "second");

    const result = await graph.run(state);
    expect(order).toEqual(["first", "second"]);
    expect(result.phase).toBe("completed");
  });

  it("rejects cycles and missing entry points", async () => {
    const graph = new DialogueStateGraph().addNode("only", async (current) => current);
    await expect(graph.run(state)).rejects.toThrow("entry point");
    graph.setEntryPoint("only").addEdge("only", "only");
    await expect(graph.run(state)).rejects.toThrow("cycle");
  });
});
