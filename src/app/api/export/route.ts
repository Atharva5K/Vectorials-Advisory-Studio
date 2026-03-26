import Papa from "papaparse";
import { NextResponse } from "next/server";
import { getExportRows } from "@/lib/server-analysis";
import type { DashboardRecommendation } from "@/types/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const recommendation = (await request.json()) as DashboardRecommendation;
    const csv = Papa.unparse(getExportRows(recommendation));

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${recommendation.clientName.replace(/\W+/g, "-").toLowerCase()}-recommendation.csv"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export recommendation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

