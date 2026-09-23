import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getAuthenticatedUser: jest.fn(),
}));
jest.mock("@/server/model/dialogue", () => ({
  getDialogueOrchestrator: jest.fn(),
}));

import { getAuthenticatedUser } from "@/lib/auth";
import { getDialogueOrchestrator } from "@/server/model/dialogue";
import { POST } from "@/app/api/dialogue/route";

describe("dialogue API integration", () => {
  it("rejects unauthenticated requests", async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
    const response = await POST(new NextRequest("http://localhost/api/dialogue", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    }));
    expect(response.status).toBe(401);
  });

  it("propagates trace id and returns orchestrator response", async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: "user-1" });
    (getDialogueOrchestrator as jest.Mock).mockReturnValue({
      chat: jest.fn().mockResolvedValue({
        reply: "ok",
        intent: "THOUGHT_FOLLOWUP",
        sessionId: "session-1",
        traceId: "trace-1",
      }),
    });
    const response = await POST(new NextRequest("http://localhost/api/dialogue", {
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": "trace-1" },
      body: JSON.stringify({ message: "hello" }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBe("trace-1");
    expect(await response.json()).toMatchObject({ reply: "ok", traceId: "trace-1" });
  });
});
