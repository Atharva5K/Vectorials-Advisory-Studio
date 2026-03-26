"use client";

import { ArrowRightLeft, BriefcaseBusiness, ShieldAlert, TrendingUp } from "lucide-react";
import type { DecisionType, StageAnalysisBundle } from "@/types/domain";
import { MetricTile, Pill, PrimaryButton, SectionCard, SecondaryButton, ToneBadge } from "@/components/ui/primitives";
import { toCompactCurrency, toPercent, toSignedCurrency, toSignedPercent } from "@/lib/utils";

interface Props {
  analysis: StageAnalysisBundle | null;
  strategyName: string;
  decision: DecisionType;
  onStrategyNameChange: (value: string) => void;
  onDecisionChange: (value: DecisionType) => void;
  onSave: () => void;
  onContinueDashboard: () => void;
}

const decisionOptions: DecisionType[] = ["Implement", "Revise", "Monitor"];

export function ScoringStage({ analysis, strategyName, decision, onStrategyNameChange, onDecisionChange, onSave, onContinueDashboard }: Props) {
  const scoring = analysis?.scoring;
  const recommendation = analysis?.agent3?.recommendationSnapshot;

  if (!scoring || !recommendation) {
    return (
      <SectionCard>
        <p className="text-sm text-stone-600">Complete the analysis stage to unlock recommendation scoring.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <div className="relative z-10 space-y-6">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Pill>Stage 4</Pill>
            <Pill className="border-emerald-200 bg-emerald-50 text-emerald-800">Decision cockpit</Pill>
          </div>
          <h2 className="text-3xl text-stone-900">Recommendation Scoring &amp; Decision</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            Scores are calculated from implementation complexity, tax friction, liquidity constraints, expected improvement, and overall alignment with the client profile gathered earlier.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[30px] border border-emerald-200 bg-emerald-50/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Feasibility Score</p>
                <p className="mt-2 text-5xl font-semibold text-emerald-900">{scoring.feasibilityScore}</p>
              </div>
              <ToneBadge score={scoring.feasibilityScore} />
            </div>
            <p className="mt-4 text-sm leading-6 text-emerald-900">
              Higher feasibility reflects lower operational friction, manageable taxes, and liquidity that can support a staged implementation plan.
            </p>
          </div>
          <div className="rounded-[30px] border border-sky-200 bg-sky-50/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Impact Score</p>
                <p className="mt-2 text-5xl font-semibold text-sky-900">{scoring.impactScore}</p>
              </div>
              <ToneBadge score={scoring.impactScore} />
            </div>
            <p className="mt-4 text-sm leading-6 text-sky-900">
              Higher impact reflects stronger goal alignment, better diversification, and more attractive risk-adjusted forward expectations.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Projected annual return" value={toPercent(scoring.projectedAnnualReturn)} tone="teal" />
          <MetricTile label="Expected portfolio value (3Y)" value={toCompactCurrency(scoring.projectedValue3Y)} tone="blue" />
          <MetricTile label="Implementation cost" value={toCompactCurrency(scoring.implementationCost)} tone="amber" />
          <MetricTile label="Tax implications" value={toSignedCurrency(scoring.taxImplications)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-5 w-5 text-teal-700" />
              <h3 className="text-xl text-stone-900">Aggregated findings</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
              {scoring.combinedFindings.map((finding) => (
                <li key={finding} className="rounded-[18px] border border-stone-200 bg-white px-4 py-3">{finding}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
                <h3 className="text-xl text-stone-900">Risk watchlist</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                {scoring.risks.map((risk) => (
                  <li key={risk} className="rounded-[18px] border border-stone-200 bg-white px-4 py-3">{risk}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-sky-700" />
                <h3 className="text-xl text-stone-900">Implementation posture</h3>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[18px] border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Return lift</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{toSignedPercent(recommendation.expectedReturnImprovement)}</p>
                </div>
                <div className="rounded-[18px] border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Tax efficiency gain</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{toSignedPercent(recommendation.taxEfficiencyGain)}</p>
                </div>
                <div className="rounded-[18px] border border-stone-200 bg-white px-4 py-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Risk-adjusted improvement</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{toSignedPercent(scoring.riskAdjustedReturnImprovement)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 text-stone-700" />
            <h3 className="text-xl text-stone-900">Finalize the recommendation</h3>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,auto] xl:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Strategy name</span>
              <input
                value={strategyName}
                onChange={(event) => onStrategyNameChange(event.target.value)}
                className="w-full rounded-[18px] border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              {decisionOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onDecisionChange(option)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    option === decision ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-700 hover:border-teal-500"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <SecondaryButton onClick={onContinueDashboard}>Review dashboard first</SecondaryButton>
            <PrimaryButton onClick={onSave}>Save recommendation to portfolio dashboard</PrimaryButton>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

