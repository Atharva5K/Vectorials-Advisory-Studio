"use client";

import { create } from "zustand";
import type {
  AgentRuntimeCard,
  ClientProfileInput,
  DashboardRecommendation,
  DocumentUpload,
  StageAnalysisBundle,
  WorkflowStage
} from "@/types/domain";
import { makeId } from "@/lib/utils";

interface AdvisoryStoreState {
  stage: WorkflowStage;
  profile: ClientProfileInput;
  files: DocumentUpload[];
  answers: Record<string, string>;
  analysis: StageAnalysisBundle | null;
  dashboard: DashboardRecommendation[];
  strategyName: string;
  decision: DashboardRecommendation["decision"];
  expandedRecommendationId: string | null;
  setStage: (stage: WorkflowStage) => void;
  setProfileField: (field: keyof ClientProfileInput, value: string) => void;
  setFiles: (files: DocumentUpload[]) => void;
  setAnswer: (questionId: string, value: string) => void;
  setAnalysis: (analysis: StageAnalysisBundle | null) => void;
  updateAnalysis: (analysis: Partial<StageAnalysisBundle>) => void;
  setStrategyName: (value: string) => void;
  setDecision: (decision: DashboardRecommendation["decision"]) => void;
  saveRecommendation: () => void;
  removeRecommendation: (id: string) => void;
  toggleExpandedRecommendation: (id: string) => void;
  resetWorkflow: () => void;
}

const defaultProfile: ClientProfileInput = {
  clientName: "",
  profileSummary: "",
  goals: "",
  advisorNotes: ""
};

export const initialAgentCards: AgentRuntimeCard[] = [
  {
    key: "agent1",
    label: "Portfolio Analysis Agent",
    subtitle: "Document digestion, holdings discovery, allocation mapping",
    weight: 25,
    status: "idle",
    progress: 0,
    metrics: [
      { label: "Documents", value: "0" },
      { label: "Holdings", value: "0" },
      { label: "Diversification", value: "0" }
    ]
  },
  {
    key: "agent2",
    label: "Risk Assessment Agent",
    subtitle: "Risk-adjusted returns, concentration flags, liquidity controls",
    weight: 25,
    status: "idle",
    progress: 0,
    metrics: [
      { label: "Metrics", value: "0" },
      { label: "Checks", value: "0/0" },
      { label: "Risk score", value: "0" }
    ]
  },
  {
    key: "agent3",
    label: "Recommendation Agent",
    subtitle: "Rebalancing, scenarios, tax-aware implementation plan",
    weight: 50,
    status: "idle",
    progress: 0,
    metrics: [
      { label: "Actions", value: "0" },
      { label: "Return lift", value: "0.0%" },
      { label: "Cost", value: "$0" }
    ]
  }
];

export const useAdvisoryStore = create<AdvisoryStoreState>((set, get) => ({
  stage: 1,
  profile: defaultProfile,
  files: [],
  answers: {},
  analysis: null,
  dashboard: [],
  strategyName: "Retirement Income Rebalancing",
  decision: "Implement",
  expandedRecommendationId: null,
  setStage: (stage) => set({ stage }),
  setProfileField: (field, value) =>
    set((state) => ({
      profile: {
        ...state.profile,
        [field]: value
      }
    })),
  setFiles: (files) => set({ files }),
  setAnswer: (questionId, value) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: value
      }
    })),
  setAnalysis: (analysis) => set({ analysis }),
  updateAnalysis: (analysis) =>
    set((state) => ({
      analysis: {
        ...(state.analysis ?? {}),
        ...analysis
      } as StageAnalysisBundle
    })),
  setStrategyName: (strategyName) => set({ strategyName }),
  setDecision: (decision) => set({ decision }),
  saveRecommendation: () => {
    const state = get();
    const scoring = state.analysis?.scoring;
    const recommendation = state.analysis?.agent3?.recommendationSnapshot;

    if (!scoring || !recommendation) {
      return;
    }

    const entry: DashboardRecommendation = {
      id: makeId("rec"),
      clientName: state.profile.clientName.trim() || "Masked Client",
      strategyName: state.strategyName.trim() || "Advisory Strategy",
      decision: state.decision,
      feasibilityScore: scoring.feasibilityScore,
      impactScore: scoring.impactScore,
      projectedReturn: scoring.projectedAnnualReturn,
      implementationCost: scoring.implementationCost,
      taxImplications: scoring.taxImplications,
      riskAdjustedReturnImprovement: scoring.riskAdjustedReturnImprovement,
      findings: scoring.combinedFindings,
      risks: scoring.risks,
      actions: recommendation.actions,
      scenarios: recommendation.scenarios,
      createdAt: new Date().toISOString()
    };

    set((current) => ({
      dashboard: [entry, ...current.dashboard],
      expandedRecommendationId: entry.id,
      stage: 5
    }));
  },
  removeRecommendation: (id) =>
    set((state) => ({
      dashboard: state.dashboard.filter((item) => item.id !== id),
      expandedRecommendationId: state.expandedRecommendationId === id ? null : state.expandedRecommendationId
    })),
  toggleExpandedRecommendation: (id) =>
    set((state) => ({
      expandedRecommendationId: state.expandedRecommendationId === id ? null : id
    })),
  resetWorkflow: () =>
    set({
      stage: 1,
      profile: defaultProfile,
      files: [],
      answers: {},
      analysis: null,
      strategyName: "Retirement Income Rebalancing",
      decision: "Implement"
    })
}));

