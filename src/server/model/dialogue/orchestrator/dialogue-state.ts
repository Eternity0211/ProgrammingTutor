import type { TraceLogger } from "../shared/trace-logger";
import type {
  ChatMessage,
  DialogueIntent,
  DialogueRequest,
  DialogueResponse,
  DialogueAgentResults,
  IntentRecognitionResult,
  SessionState,
  StudentProfile,
} from "../types";
import type { TrimmedContext } from "../memory/context-trimmer";

export interface DialogueNodeResult {
  reply: string;
  agentResults?: DialogueAgentResults;
  sessionStateUpdate?: Partial<SessionState>;
}

export type DialoguePhase = "session" | "context" | "intent" | "handler" | "persist" | "completed" | "failed";

export interface DialogueState {
  phase: DialoguePhase;
  request: DialogueRequest;
  traceLogger: TraceLogger;
  sessionId?: string;
  messages?: ChatMessage[];
  trimmed?: TrimmedContext;
  profile?: StudentProfile | null;
  profileSummary?: string;
  intent?: IntentRecognitionResult;
  result?: DialogueNodeResult;
  sessionState?: SessionState;
  response?: DialogueResponse;
  error?: string;
}

export type DialogueNode = (state: DialogueState) => Promise<DialogueState>;

export const DIALOGUE_GRAPH_END = "__end__" as const;

export class DialogueStateGraph {
  private readonly nodes = new Map<string, DialogueNode>();
  private readonly edges = new Map<string, string>();
  private entryPoint?: string;

  addNode(name: string, node: DialogueNode): this {
    if (!name || name === DIALOGUE_GRAPH_END) throw new Error("Invalid dialogue graph node name");
    if (this.nodes.has(name)) throw new Error(`Dialogue graph node already exists: ${name}`);
    this.nodes.set(name, node);
    return this;
  }

  addEdge(from: string, to: string): this {
    if (!this.nodes.has(from)) throw new Error(`Unknown dialogue graph source node: ${from}`);
    if (to !== DIALOGUE_GRAPH_END && !this.nodes.has(to)) {
      throw new Error(`Unknown dialogue graph target node: ${to}`);
    }
    this.edges.set(from, to);
    return this;
  }

  setEntryPoint(name: string): this {
    if (!this.nodes.has(name)) throw new Error(`Unknown dialogue graph entry node: ${name}`);
    this.entryPoint = name;
    return this;
  }

  async run(initialState: DialogueState, maxSteps = 32): Promise<DialogueState> {
    if (!this.entryPoint) throw new Error("Dialogue graph entry point is not configured");
    let current = this.entryPoint;
    let state = initialState;
    const visited = new Set<string>();

    for (let step = 0; step < maxSteps; step += 1) {
      const node = this.nodes.get(current);
      if (!node) throw new Error(`Dialogue graph node is not configured: ${current}`);
      state = await node(state);
      const next = this.edges.get(current) ?? DIALOGUE_GRAPH_END;
      if (next === DIALOGUE_GRAPH_END) return state;
      if (visited.has(next)) throw new Error(`Dialogue graph cycle detected at node: ${next}`);
      visited.add(current);
      current = next;
    }
    throw new Error(`Dialogue graph exceeded maximum steps (${maxSteps})`);
  }
}

export function transition(state: DialogueState, phase: DialoguePhase): DialogueState {
  return { ...state, phase };
}

export function intentOrFallback(intent?: IntentRecognitionResult): DialogueIntent {
  return intent?.intent ?? "THOUGHT_FOLLOWUP";
}
