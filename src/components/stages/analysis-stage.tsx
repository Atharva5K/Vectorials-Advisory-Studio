"use client";

import { Bot, CircleAlert, Clock3, Cog, FileLock2, ShieldCheck, Wand2 } from "lucide-react";
import type { AgentRuntimeCard, StageAnalysisBundle } from "@/types/domain";
import { Pill, PrimaryButton, ProgressBar, SectionCard } from "@/components/ui/primitives";

interface PrepStep {
  label: string;
  status: "idle" | "running" | "complete";
}

interface Props {
  analysis: StageAnalysisBundle | null;
  agentCards: AgentRuntimeCard[];
  prepSteps: PrepStep[];
  overallProgress: number;
  isRunning: boolean;
  error: string | null;
  onRun: () => void;
}

const agentIcons = {
  agent1: Bot,
  agent2: ShieldCheck,
  agent3: Wand2
};

export function AnalysisStage({ analysis, agentCards, prepSteps, overallProgress, isRunning, error, onRun }: Props) {
  return (
    <SectionCard>
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Pill>Stage 3</Pill>
              <Pill className="border-teal-200 bg-teal-50 text-teal-800">Real tool-calling</Pill>
            </div>
            <h2 className="text-3xl text-stone-900">AI-Powered Analysis</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              Documents are parsed, sanitized, and chunked first. Then each specialized agent uses tools on the server before producing its structured result. The cards below reflect the actual staged run.
            </p>
          </div>
          <div className="min-w-[260px] rounded-[28px] border border-white/70 bg-white/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">Weighted overall progress</p>
                <p className="text-sm text-stone-600">25% / 25% / 50% weighting across the three agents.</p>
              </div>
              <p className="text-3xl font-semibold text-stone-900">{overallProgress}%</p>
            </div>
            <div className="mt-4 space-y-2">
              <ProgressBar value={overallProgress} />
              {analysis?.prepared ? <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Session {analysis.prepared.sessionId}</p> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.88fr,1.12fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <Cog className="h-5 w-5 text-stone-700" />
              <div>
                <h3 className="text-lg text-stone-900">Preprocessing pipeline</h3>
                <p className="text-sm text-stone-600">Local parsing and redaction happen before the first model call.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {prepSteps.map((step) => (
                <div key={step.label} className="flex items-center justify-between rounded-[18px] border border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    {step.label.toLowerCase().includes("mask") ? <FileLock2 className="h-4 w-4 text-teal-700" /> : <Clock3 className="h-4 w-4 text-stone-600" />}
                    <span className="text-sm font-medium text-stone-700">{step.label}</span>
                  </div>
                  <Pill className={step.status === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : step.status === "running" ? "border-amber-200 bg-amber-50 text-amber-700" : ""}>
                    {step.status}
                  </Pill>
                </div>
              ))}
            </div>
            {analysis?.prepared ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-white px-4 py-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">Prepared context</p>
                <p className="mt-2 leading-6">{analysis.prepared.profileDigest}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{analysis.prepared.filesProcessed} files</Pill>
                  <Pill>{analysis.prepared.chunkCount} sanitized chunks</Pill>
                  <Pill>{analysis.prepared.coveragePercent}% questionnaire coverage</Pill>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {agentCards.map((card) => {
              const Icon = agentIcons[card.key];
              const toolAudit = card.key === "agent1" ? analysis?.agent1?.toolAudit : card.key === "agent2" ? analysis?.agent2?.toolAudit : analysis?.agent3?.toolAudit;
              return (
                <div key={card.key} className="rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-[18px] bg-stone-100 p-3 text-stone-800">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl text-stone-900">{card.label}</h3>
                          <Pill>{card.weight}% weight</Pill>
                          <Pill className={card.status === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : card.status === "running" ? "border-amber-200 bg-amber-50 text-amber-700" : card.status === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : ""}>{card.status}</Pill>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{card.subtitle}</p>
                      </div>
                    </div>
                    <div className="min-w-[110px] text-right">
                      <p className="text-3xl font-semibold text-stone-900">{card.progress}%</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">agent progress</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <ProgressBar value={card.progress} />
                    <div className="grid gap-3 md:grid-cols-3">
                      {card.metrics.map((metric) => (
                        <div key={metric.label} className="rounded-[18px] border border-stone-200 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{metric.label}</p>
                          <p className="mt-2 text-lg font-semibold text-stone-900">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                    {toolAudit?.length ? (
                      <div className="rounded-[18px] border border-teal-100 bg-teal-50/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-teal-700">Tool trail</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {toolAudit.map((tool) => (
                            <Pill key={`${card.key}-${tool.toolName}`} className="border-teal-200 bg-white text-teal-800">
                              {tool.toolName}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <CircleAlert className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Analysis run blocked</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end border-t border-stone-200/70 pt-6">
          <PrimaryButton onClick={onRun} disabled={isRunning}>
            {isRunning ? "Running analysis..." : analysis?.scoring ? "Re-run analysis" : "Launch the 3-agent pipeline"}
          </PrimaryButton>
        </div>
      </div>
    </SectionCard>
  );
}

