import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { evaluateRuntimeExecution } from "@/server/model/pipeline/runtime-evaluation-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { code, language, input } = await req.json();
    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const runtimeResult = await evaluateRuntimeExecution(code);

    const newResult = {
      input: input,
      runtime: `${Math.round(runtimeResult.runtimeMs / 1000)}s`,
      memory: `N/A`,
      status: runtimeResult.status,
      output: runtimeResult.output,
      error: runtimeResult.error,
      hidden: false,
    };

    return NextResponse.json({
      status: 200,
      output: newResult,
    });
  } catch (e: any) {
    console.error("Error running code:", e);
    return NextResponse.json(
      {
        status: 500,
        output: {
          input: "",
          runtime: `${0}s`,
          memory: `${0} MB`,
          status: "failed",
          output: "",
          error: e?.message || "Failed to run code. Please try again.",
          hidden: false,
        },
      },
      { status: 500 },
    );
  }
}
