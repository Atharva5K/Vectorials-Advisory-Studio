import { NextResponse } from "next/server";
import { createAnalysisSession, runAgentOne, runAgentThree, runAgentTwo } from "@/lib/server-analysis";
import type { AnalyzeRequestPayload } from "@/types/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const phase = String(formData.get("phase") || "prepare");
      if (phase !== "prepare") {
        return NextResponse.json({ error: "Multipart submissions are only supported for the prepare phase." }, { status: 400 });
      }

      const payloadRaw = formData.get("payload");
      if (!payloadRaw || typeof payloadRaw !== "string") {
        return NextResponse.json({ error: "Missing payload." }, { status: 400 });
      }

      const payload = JSON.parse(payloadRaw) as AnalyzeRequestPayload;
      const files = formData
        .getAll("files")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      const prepared = await createAnalysisSession(payload, files);
      return NextResponse.json({ prepared });
    }

    const body = (await request.json()) as { phase: string; sessionId: string };

    switch (body.phase) {
      case "agent1":
        return NextResponse.json(await runAgentOne(body.sessionId));
      case "agent2":
        return NextResponse.json(await runAgentTwo(body.sessionId));
      case "agent3":
        return NextResponse.json(await runAgentThree(body.sessionId));
      default:
        return NextResponse.json({ error: "Unsupported analysis phase." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

