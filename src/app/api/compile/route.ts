import { LANGUAGE_ID_MAP } from "@/config/constants";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

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

    const languageId =
      LANGUAGE_ID_MAP[language as keyof typeof LANGUAGE_ID_MAP];
    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 },
      );
    }

    const judgeHost = process.env.JUDGE0_API_HOST;
    const judgeKey = process.env.JUDGE0_API_KEY;

    if (!judgeHost) {
      throw new Error("Judge0 is not configured. Please set JUDGE0_API_HOST.");
    }

    const isRapidApiHost = judgeHost.includes("rapidapi.com");
    if (isRapidApiHost && !judgeKey) {
      throw new Error(
        "Judge0 RapidAPI key is missing. Please set JUDGE0_API_KEY.",
      );
    }

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isRapidApiHost) {
      requestHeaders["x-rapidapi-key"] = judgeKey as string;
      requestHeaders["x-rapidapi-host"] = judgeHost;
    }

    const response = await fetch(
      `https://${judgeHost}/submissions?base64_encoded=true&fields=*`,
      {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          language_id: languageId,
          source_code: Buffer.from(code).toString("base64"),
          stdin: input ? Buffer.from(input).toString("base64") : "",
          cpu_time_limit: 2,
          memory_limit: 128000,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      if (
        response.status === 403 &&
        /not subscribed to this api/i.test(errorText)
      ) {
        throw new Error(
          "Judge0 RapidAPI subscription is missing for this API key. Subscribe to Judge0 CE on RapidAPI or switch JUDGE0_API_HOST to your self-hosted Judge0 endpoint.",
        );
      }

      throw new Error(
        `Judge0 submit failed (${response.status}): ${errorText || "No response body"}`,
      );
    }

    const judgeData = await response.json();
    if (!judgeData.token) {
      throw new Error(
        `Failed to compile code: ${
          judgeData.error || judgeData.message || "Judge0 did not return token"
        }`,
      );
    }

    let resultData;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const resultResponse = await fetch(
        `https://${judgeHost}/submissions/${judgeData.token}?base64_encoded=true&fields=*`,
        {
          method: "GET",
          headers: isRapidApiHost
            ? {
                "x-rapidapi-key": judgeKey as string,
                "x-rapidapi-host": judgeHost,
              }
            : undefined,
        },
      );

      if (!resultResponse.ok) {
        const pollErrorText = await resultResponse.text();
        throw new Error(
          `Judge0 polling failed (${resultResponse.status}): ${pollErrorText || "No response body"}`,
        );
      }

      resultData = await resultResponse.json();

      if (resultData.status && resultData.status.id >= 3) {
        break;
      }
    }

    if (!resultData?.status) {
      throw new Error(
        "Judge0 did not return a final execution status in time.",
      );
    }

    const newResult = {
      input: input,
      runtime: `${0}s`,
      memory: `${0} MB`,
      status: "failed",
      output: "",
      error: "",
      hidden: false,
    };
    if (resultData.status.id === 3) {
      newResult.status = "passed";
      newResult.output = resultData.stdout
        ? atob(resultData.stdout)
        : "No output";
      newResult.runtime = `${resultData.time}s`;
      newResult.memory = `${resultData.memory / 1000} MB`;
    } else if (resultData.compile_output) {
      newResult.error = atob(resultData.compile_output);
    } else if (resultData.stderr) {
      newResult.error = atob(resultData.stderr);
    } else if (resultData.status.id === 5) {
      newResult.error = "Time limit exceeded";
    } else if (resultData.status.id === 6) {
      newResult.error = "Memory limit exceeded";
    } else {
      newResult.error = `Execution failed: ${resultData.status.description}`;
    }
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
