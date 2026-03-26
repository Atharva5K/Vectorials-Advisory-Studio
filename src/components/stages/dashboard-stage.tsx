"use client";

import { Download, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FeasibilityImpactChart } from "@/components/charts/feasibility-impact-chart";
import { Pill, SectionCard, SecondaryButton } from "@/components/ui/primitives";
import { cn, formatDateLabel, toCompactCurrency, toPercent, toSignedCurrency, toSignedPercent } from "@/lib/utils";
import type { DashboardRecommendation } from "@/types/domain";

interface Props {
  dashboard: DashboardRecommendation[];
  expandedId: string | null;
  onToggleExpanded: (id: string) => void;
  onRemove: (id: string) => void;
  onExport: (item: DashboardRecommendation) => void;
  onNewReview: () => void;
}

type SortKey = "clientName" | "strategyName" | "decision" | "feasibilityScore" | "impactScore" | "projectedReturn" | "implementationCost";

export function DashboardStage({ dashboard, expandedId, onToggleExpanded, onRemove, onExport, onNewReview }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("impactScore");
  const [descending, setDescending] = useState(true);

  const sortedDashboard = useMemo(() => {
    return [...dashboard].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === "number" && typeof right === "number") {
        return descending ? right - left : left - right;
      }
      return descending ? String(right).localeCompare(String(left)) : String(left).localeCompare(String(right));
    });
  }, [dashboard, sortKey, descending]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDescending((current) => !current);
      return;
    }

    setSortKey(key);
    setDescending(true);
  };

  return (
    <SectionCard>
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Pill>Stage 5</Pill>
              <Pill className="border-sky-200 bg-sky-50 text-sky-800">Portfolio dashboard</Pill>
            </div>
            <h2 className="text-3xl text-stone-900">Advisory Book Dashboard</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              Track completed recommendations, compare feasibility against impact, and export a clean advisor-ready CSV report for any row in the pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SecondaryButton onClick={onNewReview}>
              <Plus className="mr-2 h-4 w-4" />
              New client review
            </SecondaryButton>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl text-stone-900">Feasibility-Impact Matrix</h3>
              <p className="text-sm text-stone-600">Each point represents one recommendation decision in the advisory book.</p>
            </div>
            <Pill>{dashboard.length} recommendation{dashboard.length === 1 ? "" : "s"}</Pill>
          </div>
          {dashboard.length ? <FeasibilityImpactChart data={dashboard} /> : <p className="mt-4 text-sm text-stone-500">Save a recommendation in Stage 4 to populate the matrix.</p>}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/75">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-stone-100/80 text-stone-700">
                <tr>
                  {[
                    ["clientName", "Client"],
                    ["strategyName", "Strategy"],
                    ["decision", "Decision"],
                    ["feasibilityScore", "Feasibility"],
                    ["impactScore", "Impact"],
                    ["projectedReturn", "Projected Return"],
                    ["implementationCost", "Implementation Cost"]
                  ].map(([key, label]) => (
                    <th key={key} className="px-4 py-4 font-semibold">
                      <button type="button" onClick={() => handleSort(key as SortKey)} className="transition hover:text-stone-900">
                        {label}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDashboard.length ? (
                  sortedDashboard.map((item) => {
                    const expanded = expandedId === item.id;
                    return (
                      <FragmentRow
                        key={item.id}
                        item={item}
                        expanded={expanded}
                        onToggleExpanded={onToggleExpanded}
                        onRemove={onRemove}
                        onExport={onExport}
                      />
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-stone-500">No saved recommendations yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function FragmentRow({
  item,
  expanded,
  onToggleExpanded,
  onRemove,
  onExport
}: {
  item: DashboardRecommendation;
  expanded: boolean;
  onToggleExpanded: (id: string) => void;
  onRemove: (id: string) => void;
  onExport: (item: DashboardRecommendation) => void;
}) {
  return (
    <>
      <tr className="border-t border-stone-200/70 align-top text-stone-700">
        <td className="px-4 py-4 font-semibold text-stone-900">{item.clientName}</td>
        <td className="px-4 py-4">{item.strategyName}</td>
        <td className="px-4 py-4">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              item.decision === "Implement"
                ? "bg-emerald-100 text-emerald-800"
                : item.decision === "Revise"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-stone-200 text-stone-700"
            )}
          >
            {item.decision}
          </span>
        </td>
        <td className="px-4 py-4">{item.feasibilityScore}</td>
        <td className="px-4 py-4">{item.impactScore}</td>
        <td className="px-4 py-4">{toPercent(item.projectedReturn)}</td>
        <td className="px-4 py-4">{toCompactCurrency(item.implementationCost)}</td>
        <td className="px-4 py-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => onToggleExpanded(item.id)} className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-teal-500">
              {expanded ? "Collapse" : "Expand"}
            </button>
            <button type="button" onClick={() => onExport(item)} className="rounded-full border border-stone-300 p-2 text-stone-600 transition hover:border-teal-500 hover:text-teal-700">
              <Download className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onRemove(item.id)} className="rounded-full border border-stone-300 p-2 text-stone-600 transition hover:border-rose-400 hover:text-rose-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-stone-200/70 bg-stone-50/80 text-sm text-stone-700">
          <td colSpan={8} className="px-4 py-5">
            <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Key findings</p>
                <ul className="mt-3 space-y-2 leading-6">
                  {item.findings.map((finding) => <li key={finding}>{finding}</li>)}
                </ul>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Risks & considerations</p>
                <ul className="mt-3 space-y-2 leading-6">
                  {item.risks.map((risk) => <li key={risk}>{risk}</li>)}
                </ul>
                <div className="mt-4 space-y-2 border-t border-stone-200 pt-3 text-sm">
                  <p>Tax implications: {toSignedCurrency(item.taxImplications)}</p>
                  <p>Risk-adjusted improvement: {toSignedPercent(item.riskAdjustedReturnImprovement)}</p>
                  <p>Created: {formatDateLabel(item.createdAt)}</p>
                </div>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Actions & scenarios</p>
                <ul className="mt-3 space-y-2 leading-6">
                  {item.actions.map((action) => (
                    <li key={`${action.action}-${action.symbol}`}>
                      <span className="font-semibold">{action.action}</span> {action.symbol} toward {action.targetWeight}% - {action.rationale}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2 border-t border-stone-200 pt-3 text-sm">
                  {item.scenarios.map((scenario) => (
                    <p key={scenario.scenario}>{scenario.scenario}: {toPercent(scenario.annualReturn)} annualized, {toCompactCurrency(scenario.expectedValue3Y)} expected in 3 years</p>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

