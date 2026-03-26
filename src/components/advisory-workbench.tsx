"use client";

import { startTransition, useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CircleGauge,
  ClipboardList,
  FolderHeart,
  LockKeyhole,
  Sparkles
} from "lucide-react";
import { AssessmentStage } from "@/components/stages/assessment-stage";
import { AnalysisStage } from "@/components/stages/analysis-stage";
import { DashboardStage } from "@/components/stages/dashboard-stage";
import { ProfileStage } from "@/components/stages/profile-stage";
import { ScoringStage } from "@/components/stages/scoring-stage";
import { Pill, PrimaryButton, ProgressBar, SectionCard, SecondaryButton } from "@/components/ui/primitives";
import { getDynamicQuestions, getQuestionCompletion } from "@/lib/question-engine";
import { downloadBlob, toCompactCurrency, toPercent } from "@/lib/utils";
import { initialAgentCards, useAdvisoryStore } from "@/store/advisory-store";
import type { AgentRuntimeCard, DashboardRecommendation, WorkflowStage } from "@/types/domain";

const stageMeta: Array<{ id: WorkflowStage; title: string; subtitle: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 1, title: "Profile", subtitle: "Secure intake", icon: FolderHeart },
  { id: 2, title: "Assessment", subtitle: "Risk & goals", icon: ClipboardList },
  { id: 3, title: "Analysis", subtitle: "3 agent run", icon: Bot },
  { id: 4, title: "Scoring", subtitle: "Decision cockpit", icon: CircleGauge },
  { id: 5, title: "Dashboard", subtitle: "Portfolio view", icon: BarChart3 }
];

type PrepStepState = { label: string; status: "idle" | "running" | "complete" };

const defaultPrepSteps: PrepStepState[] = [
  { label: "Locking intake context", status: "idle" },
  { label: "Parsing uploaded statements", status: "idle" },
  { label: "Masking sensitive identifiers", status: "idle" },
  { label: "Building sanitized portfolio summary", status: "idle" }
];

export function AdvisoryWorkbench() {
  const stage = useAdvisoryStore((state) => state.stage);
  const setStage = useAdvisoryStore((state) => state.setStage);
  const profile = useAdvisoryStore((state) => state.profile);
  const setProfileField = useAdvisoryStore((state) => state.setProfileField);
  const files = useAdvisoryStore((state) => state.files);
  const setFiles = useAdvisoryStore((state) => state.setFiles);
  const answers = useAdvisoryStore((state) => state.answers);
  const setAnswer = useAdvisoryStore((state) => state.setAnswer);
  const analysis = useAdvisoryStore((state) => state.analysis);
  const setAnalysis = useAdvisoryStore((state) => state.setAnalysis);
  const updateAnalysis = useAdvisoryStore((state) => state.updateAnalysis);
  const strategyName = useAdvisoryStore((state) => state.strategyName);
  const setStrategyName = useAdvisoryStore((state) => state.setStrategyName);
  const decision = useAdvisoryStore((state) => state.decision);
  const setDecision = useAdvisoryStore((state) => state.setDecision);
  const saveRecommendation = useAdvisoryStore((state) => state.saveRecommendation);
  const dashboard = useAdvisoryStore((state) => state.dashboard);
  const expandedRecommendationId = useAdvisoryStore((state) => state.expandedRecommendationId);
  const toggleExpandedRecommendation = useAdvisoryStore((state) => state.toggleExpandedRecommendation);
  const removeRecommendation = useAdvisoryStore((state) => state.removeRecommendation);
  const resetWorkflow = useAdvisoryStore((state) => state.resetWorkflow);

  const { questions, tags } = useMemo(() => getDynamicQuestions(profile, files.map((file) => file.name)), [profile, files]);
  const completion = useMemo(() => getQuestionCompletion(questions, answers), [questions, answers]);
  const canContinueStage1 = Boolean(files.length || profile.profileSummary.trim() || profile.goals.trim() || profile.advisorNotes.trim() || profile.clientName.trim());

  const [agentCards, setAgentCards] = useState<AgentRuntimeCard[]>(initialAgentCards);
  const [prepSteps, setPrepSteps] = useState<PrepStepState[]>(defaultPrepSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const overallProgress = useMemo(() => Math.round(agentCards.reduce((sum, card) => sum + (card.progress * card.weight) / 100, 0)), [agentCards]);

  const updateCard = (key: AgentRuntimeCard["key"], patch: Partial<AgentRuntimeCard>) => {
    setAgentCards((cards) => cards.map((card) => (card.key === key ? { ...card, ...patch } : card)));
  };

  const handlePrepareAnimation = () => {
    setPrepSteps(defaultPrepSteps);
    defaultPrepSteps.forEach((_, index) => {
      window.setTimeout(() => {
        setPrepSteps((steps) =>
          steps.map((step, stepIndex) => {
            if (stepIndex < index) return { ...step, status: "complete" };
            if (stepIndex === index) return { ...step, status: "running" };
            return step;
          })
        );
      }, index * 420);
    });
  };

  const runPhase = async (sessionId: string, phase: "agent1" | "agent2" | "agent3") => {
    const key = phase as AgentRuntimeCard["key"];
    updateCard(key, { status: "running", progress: 8 });
    const timer = window.setInterval(() => {
      setAgentCards((cards) =>
        cards.map((card) =>
          card.key === key
            ? {
                ...card,
                progress: Math.min(card.progress + (card.key === "agent3" ? 6 : 9), 88)
              }
            : card
        )
      );
    }, 240);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, sessionId })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Analysis step failed.");
      }

      updateAnalysis(payload);
      if (phase === "agent1") {
        updateCard("agent1", {
          status: "complete",
          progress: 100,
          metrics: [
            { label: "Documents", value: String(payload.agent1.documentsAnalyzed) },
            { label: "Holdings", value: String(payload.agent1.holdingsIdentified) },
            { label: "Diversification", value: String(payload.agent1.diversificationScore) }
          ]
        });
        updateCard("agent2", { status: "queued", progress: 0 });
        updateCard("agent3", { status: "queued", progress: 0 });
      }
      if (phase === "agent2") {
        updateCard("agent2", {
          status: "complete",
          progress: 100,
          metrics: [
            { label: "Metrics", value: String(payload.agent2.riskMetricsCalculated) },
            { label: "Checks", value: `${payload.agent2.complianceChecksPassed}/${payload.agent2.complianceChecksCompleted}` },
            { label: "Risk score", value: String(payload.agent2.overallRiskScore) }
          ]
        });
      }
      if (phase === "agent3") {
        updateCard("agent3", {
          status: "complete",
          progress: 100,
          metrics: [
            { label: "Actions", value: String(payload.agent3.recommendationsGenerated) },
            { label: "Return lift", value: toPercent(payload.agent3.expectedReturnImprovement) },
            { label: "Cost", value: toCompactCurrency(payload.agent3.implementationCost) }
          ]
        });
      }
    } finally {
      window.clearInterval(timer);
    }
  };

  const handleRunAnalysis = async () => {
    if (!completion.thresholdMet) {
      return;
    }

    try {
      setIsRunning(true);
      setAnalysisError(null);
      setAnalysis(null);
      setAgentCards(initialAgentCards.map((card) => ({ ...card, status: card.key === "agent1" ? "queued" : "idle", progress: 0 })));
      handlePrepareAnimation();

      const formData = new FormData();
      formData.set("phase", "prepare");
      formData.set("payload", JSON.stringify({ profile, answers }));
      files.forEach((file) => {
        if (file.file) {
          formData.append("files", file.file);
        }
      });

      const prepareResponse = await fetch("/api/analyze", { method: "POST", body: formData });
      const preparedPayload = await prepareResponse.json();
      if (!prepareResponse.ok) {
        throw new Error(preparedPayload.error || "Unable to prepare analysis session.");
      }

      const sessionId = preparedPayload.prepared.sessionId as string;
      setPrepSteps((steps) => steps.map((step) => ({ ...step, status: "complete" })));
      setAnalysis({ prepared: preparedPayload.prepared });
      updateCard("agent1", { status: "queued", progress: 0 });
      updateCard("agent2", { status: "queued", progress: 0 });
      updateCard("agent3", { status: "queued", progress: 0 });

      await runPhase(sessionId, "agent1");
      await runPhase(sessionId, "agent2");
      await runPhase(sessionId, "agent3");
      startTransition(() => setStage(4));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Unexpected analysis error.");
      setAgentCards((cards) => cards.map((card) => (card.status === "running" ? { ...card, status: "error" } : card)));
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = async (item: DashboardRecommendation) => {
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    downloadBlob(blob, `${item.clientName.replace(/\W+/g, "-").toLowerCase()}-recommendation.csv`);
  };

  const handleReset = () => {
    resetWorkflow();
    setAgentCards(initialAgentCards);
    setPrepSteps(defaultPrepSteps);
    setAnalysisError(null);
    startTransition(() => setStage(1));
  };

  return (
    <main className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-6">
          <SectionCard className="fade-up">
            <div className="relative z-10 space-y-5">
              <div className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">
                Vectorials Advisory Studio
              </div>
              <div>
                <h1 className="text-4xl leading-tight text-stone-900">A multi-stage wealth advisory app with real tool-using agents.</h1>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Built with Next.js, TypeScript, Zustand, Recharts, local sanitization, and actual OpenAI tool calling for every agent in the workflow.
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Security</p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">Local parsing, masked identifiers, least-privilege LLM payloads</p>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Agent model</p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">Sequential three-agent orchestration with server-side tool registry</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="fade-up-delay">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-teal-700" />
                <h2 className="text-xl text-stone-900">Workflow map</h2>
              </div>
              <div className="space-y-3">
                {stageMeta.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === stage;
                  const complete = item.id < stage;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStage(item.id)}
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        active
                          ? "border-teal-600 bg-teal-50 shadow-sm"
                          : complete
                            ? "border-emerald-200 bg-emerald-50/70"
                            : "border-stone-200 bg-white/70 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-[16px] bg-white/90 p-2">
                          <Icon className="h-4 w-4 text-stone-800" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">Stage {item.id}: {item.title}</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">{item.subtitle}</p>
                        </div>
                        {active ? <ArrowRight className="ml-auto h-4 w-4 text-teal-700" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl text-stone-900">Live snapshot</h2>
              </div>
              <div className="space-y-3 rounded-[22px] border border-white/70 bg-white/70 p-4">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Question coverage</span>
                  <span>{completion.percent}%</span>
                </div>
                <ProgressBar value={completion.percent} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[22px] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Current files</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">{files.length}</p>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Saved strategies</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">{dashboard.length}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.length ? tags.map((tag) => <Pill key={tag}>{tag}</Pill>) : <Pill>No dynamic risk tags yet</Pill>}
              </div>
            </div>
          </SectionCard>
        </aside>

        <section className="space-y-6">
          {stage === 1 ? (
            <ProfileStage
              profile={profile}
              files={files}
              onProfileFieldChange={setProfileField}
              onFilesChange={setFiles}
              canContinue={canContinueStage1}
              onContinue={() => setStage(2)}
            />
          ) : null}

          {stage === 2 ? (
            <AssessmentStage
              questions={questions}
              answers={answers}
              completion={completion}
              dynamicTags={tags}
              onAnswer={setAnswer}
              onContinue={() => setStage(3)}
            />
          ) : null}

          {stage === 3 ? (
            <AnalysisStage
              analysis={analysis}
              agentCards={agentCards}
              prepSteps={prepSteps}
              overallProgress={overallProgress}
              isRunning={isRunning}
              error={analysisError}
              onRun={handleRunAnalysis}
            />
          ) : null}

          {stage === 4 ? (
            <ScoringStage
              analysis={analysis}
              strategyName={strategyName}
              decision={decision}
              onStrategyNameChange={setStrategyName}
              onDecisionChange={setDecision}
              onSave={saveRecommendation}
              onContinueDashboard={() => setStage(5)}
            />
          ) : null}

          {stage === 5 ? (
            <DashboardStage
              dashboard={dashboard}
              expandedId={expandedRecommendationId}
              onToggleExpanded={toggleExpandedRecommendation}
              onRemove={removeRecommendation}
              onExport={handleExport}
              onNewReview={handleReset}
            />
          ) : null}

          <div className="flex flex-wrap justify-between gap-3">
            <SecondaryButton onClick={handleReset}>Reset current workflow</SecondaryButton>
            <PrimaryButton onClick={() => setStage(stage === 5 ? 1 : ((stage + 1) as WorkflowStage))}>
              Jump forward
            </PrimaryButton>
          </div>
        </section>
      </div>
    </main>
  );
}