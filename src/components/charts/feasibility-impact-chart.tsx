/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  CartesianGrid,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardRecommendation } from "@/types/domain";

interface Props {
  data: DashboardRecommendation[];
}

const decisionColor: Record<DashboardRecommendation["decision"], string> = {
  Implement: "#0f766e",
  Revise: "#1d4ed8",
  Monitor: "#78716c"
};

export function FeasibilityImpactChart({ data }: Props) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 24, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="rgba(31,42,42,0.08)" strokeDasharray="4 6" />
          <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="rgba(120,113,108,0.06)" />
          <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="rgba(59,130,246,0.05)" />
          <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="rgba(217,119,6,0.05)" />
          <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="rgba(15,118,110,0.08)" />
          <XAxis type="number" dataKey="feasibilityScore" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#5f6d67", fontSize: 12 }} />
          <YAxis type="number" dataKey="impactScore" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#5f6d67", fontSize: 12 }} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 16, border: "1px solid rgba(31,42,42,0.12)", background: "rgba(255,251,245,0.98)" }}
            formatter={(value: number, name: string) => [value, name === "impactScore" ? "Impact" : "Feasibility"]}
          />
          <Scatter
            data={data}
            shape={(props: any) => {
              const item = props.payload as DashboardRecommendation;
              return <circle cx={props.cx} cy={props.cy} r={8} fill={decisionColor[item.decision]} fillOpacity={0.85} stroke="white" strokeWidth={2} />;
            }}
          >
            <LabelList dataKey="strategyName" position="top" fontSize={11} fill="#334155" offset={12} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600 sm:grid-cols-4">
        <span>Quick Wins: high feasibility, high impact</span>
        <span>Strategic: lower feasibility, high impact</span>
        <span>Fill-ins: high feasibility, lower impact</span>
        <span>Low Priority: lower feasibility, lower impact</span>
      </div>
    </div>
  );
}