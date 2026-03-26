export type WorkflowStage = 1 | 2 | 3 | 4 | 5;

export type AgentKey = "agent1" | "agent2" | "agent3";
export type AgentStatus = "queued" | "running" | "complete" | "error";
export type DecisionType = "Implement" | "Revise" | "Monitor";

export interface ClientProfileInput {
  clientName: string;
  profileSummary: string;
  goals: string;
  advisorNotes: string;
}

export interface DocumentUpload {
  id: string;
  name: string;
  type: string;
  size: number;
  file?: File;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface AdvisoryQuestion {
  id: string;
  prompt: string;
  helperText: string;
  category: string;
  type: "text" | "textarea" | "choice";
  options?: QuestionOption[];
  triggerTags?: string[];
}

export interface QuestionCompletion {
  answered: number;
  total: number;
  percent: number;
  thresholdMet: boolean;
}

export interface SanitizedClientProfile {
  clientAlias: string;
  summary: string;
  goals: string;
  advisorNotes: string;
}

export interface DocumentChunk {
  id: string;
  label: string;
  summary: string;
  keywords: string[];
  excerpt: string;
}

export interface PreparedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  sanitizedText: string;
  chunkCount: number;
  chunks: DocumentChunk[];
  extractedTickers: string[];
  assetMentions: string[];
  sectorMentions: string[];
  moneyMentions: number[];
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  assetClass: string;
  sector: string;
  weight: number;
  estimatedValue: number | null;
  liquidity: "high" | "medium" | "low";
  thesis: string;
}

export interface ChartSlice {
  name: string;
  value: number;
}

export interface PortfolioSnapshot {
  documentsAnalyzed: number;
  holdingsIdentified: number;
  assetClassesDetected: number;
  diversificationScore: number;
  estimatedCurrentReturn: number;
  cashBufferPct: number;
  largestHoldingPct: number;
  largestSectorPct: number;
  holdings: PortfolioHolding[];
  assetAllocation: ChartSlice[];
  sectorExposure: ChartSlice[];
  narrativeHighlights: string[];
}

export interface RiskSnapshot {
  sharpeRatio: number;
  sortinoRatio: number;
  liquidityRisk: number;
  concentrationEvents: number;
  complianceChecksCompleted: number;
  complianceChecksPassed: number;
  riskEvents: string[];
  overallRiskScore: number;
  commentary: string[];
}

export interface RecommendationAction {
  action: "Buy" | "Sell" | "Hold" | "Shift";
  symbol: string;
  rationale: string;
  targetWeight: number;
}

export interface ScenarioProjection {
  scenario: "Low" | "Base" | "High";
  annualReturn: number;
  expectedValue3Y: number;
}

export interface RecommendationSnapshot {
  recommendationsGenerated: number;
  expectedReturnImprovement: number;
  taxEfficiencyGain: number;
  implementationCost: number;
  taxImplications: number;
  projectedAnnualReturn: number;
  projectedValue3Y: number;
  riskAdjustedReturnImprovement: number;
  actions: RecommendationAction[];
  scenarios: ScenarioProjection[];
  summary: string[];
}

export interface AgentToolAudit {
  toolName: string;
  summary: string;
}

export interface AgentOneOutput {
  status: AgentStatus;
  progress: number;
  documentsAnalyzed: number;
  holdingsIdentified: number;
  assetClassesDetected: number;
  diversificationScore: number;
  findings: string[];
  portfolioSnapshot: PortfolioSnapshot;
  toolAudit: AgentToolAudit[];
}

export interface AgentTwoOutput {
  status: AgentStatus;
  progress: number;
  riskMetricsCalculated: number;
  complianceChecksCompleted: number;
  complianceChecksPassed: number;
  riskEventsIdentified: number;
  overallRiskScore: number;
  findings: string[];
  riskSnapshot: RiskSnapshot;
  toolAudit: AgentToolAudit[];
}

export interface AgentThreeOutput {
  status: AgentStatus;
  progress: number;
  recommendationsGenerated: number;
  expectedReturnImprovement: number;
  taxEfficiencyGain: number;
  implementationCost: number;
  findings: string[];
  recommendationSnapshot: RecommendationSnapshot;
  toolAudit: AgentToolAudit[];
}

export interface RecommendationScores {
  feasibilityScore: number;
  impactScore: number;
  projectedAnnualReturn: number;
  projectedValue3Y: number;
  implementationCost: number;
  taxImplications: number;
  riskAdjustedReturnImprovement: number;
  combinedFindings: string[];
  risks: string[];
}

export interface PreparedAnalysisSummary {
  sessionId: string;
  coveragePercent: number;
  filesProcessed: number;
  chunkCount: number;
  profileDigest: string;
  dynamicTags: string[];
}

export interface StageAnalysisBundle {
  prepared: PreparedAnalysisSummary;
  agent1?: AgentOneOutput;
  agent2?: AgentTwoOutput;
  agent3?: AgentThreeOutput;
  scoring?: RecommendationScores;
}

export interface AgentRuntimeCard {
  key: AgentKey;
  label: string;
  subtitle: string;
  weight: number;
  status: AgentStatus | "idle";
  progress: number;
  metrics: Array<{ label: string; value: string }>;
}

export interface DashboardRecommendation {
  id: string;
  clientName: string;
  strategyName: string;
  decision: DecisionType;
  feasibilityScore: number;
  impactScore: number;
  projectedReturn: number;
  implementationCost: number;
  taxImplications: number;
  riskAdjustedReturnImprovement: number;
  findings: string[];
  risks: string[];
  actions: RecommendationAction[];
  scenarios: ScenarioProjection[];
  createdAt: string;
}

export interface AnalyzePrepareResponse {
  prepared: PreparedAnalysisSummary;
}

export interface AnalyzeAgentResponse {
  prepared: PreparedAnalysisSummary;
  agent1?: AgentOneOutput;
  agent2?: AgentTwoOutput;
  agent3?: AgentThreeOutput;
  scoring?: RecommendationScores;
}

export interface AnalyzeRequestPayload {
  profile: ClientProfileInput;
  answers: Record<string, string>;
}

