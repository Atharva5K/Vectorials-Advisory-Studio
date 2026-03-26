/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import { z } from "zod";
import type {
  AgentKey,
  AgentOneOutput,
  AgentThreeOutput,
  AgentTwoOutput,
  AnalyzeRequestPayload,
  DashboardRecommendation,
  PreparedAnalysisSummary,
  PreparedDocument,
  PortfolioHolding,
  PortfolioSnapshot,
  RecommendationScores,
  RecommendationSnapshot,
  RiskSnapshot,
  SanitizedClientProfile
} from "@/types/domain";
import { clamp, makeId } from "@/lib/utils";

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY
    })
  : null;

const SECURITY_PATTERNS: Array<{ pattern: RegExp; replace: string }> = [
  { pattern: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, replace: "[EMAIL_REDACTED]" },
  { pattern: /\b(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g, replace: "[PHONE_REDACTED]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replace: "[TAX_ID_REDACTED]" },
  { pattern: /\b(?:account|acct|a\/c)[:#\s-]*\d{4,}\b/gi, replace: "ACCOUNT_MASKED" },
  { pattern: /\b\d{9,18}\b/g, replace: "[LONG_NUMBER_REDACTED]" }
];

const TICKER_LIBRARY: Record<string, { name: string; sector: string; assetClass: string }> = {
  AAPL: { name: "Apple", sector: "Technology", assetClass: "Equity" },
  MSFT: { name: "Microsoft", sector: "Technology", assetClass: "Equity" },
  NVDA: { name: "NVIDIA", sector: "Technology", assetClass: "Equity" },
  GOOGL: { name: "Alphabet", sector: "Communication Services", assetClass: "Equity" },
  AMZN: { name: "Amazon", sector: "Consumer Discretionary", assetClass: "Equity" },
  META: { name: "Meta", sector: "Communication Services", assetClass: "Equity" },
  JPM: { name: "JPMorgan", sector: "Financials", assetClass: "Equity" },
  VTI: { name: "Vanguard Total Stock Market ETF", sector: "Blend", assetClass: "Equity" },
  VXUS: { name: "Vanguard Total International Stock ETF", sector: "Blend", assetClass: "Equity" },
  BND: { name: "Vanguard Total Bond Market ETF", sector: "Fixed Income", assetClass: "Bond" },
  AGG: { name: "iShares Core US Aggregate Bond ETF", sector: "Fixed Income", assetClass: "Bond" },
  SCHD: { name: "Schwab US Dividend Equity ETF", sector: "Dividend Equity", assetClass: "Equity" },
  TIP: { name: "iShares TIPS Bond ETF", sector: "Inflation Hedges", assetClass: "Bond" },
  VNQ: { name: "Vanguard Real Estate ETF", sector: "Real Estate", assetClass: "Alternative" },
  GLD: { name: "SPDR Gold Shares", sector: "Commodities", assetClass: "Alternative" },
  CASH: { name: "Cash Reserves", sector: "Liquidity", assetClass: "Cash" }
};

const ASSET_KEYWORDS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Equity", patterns: [/stock/i, /equity/i, /share/i, /ETF/i] },
  { label: "Bond", patterns: [/bond/i, /treasury/i, /fixed income/i, /muni/i] },
  { label: "Cash", patterns: [/cash/i, /money market/i, /sweep/i] },
  { label: "Alternative", patterns: [/alternative/i, /reit/i, /private/i, /commodity/i, /gold/i] }
];

const SECTOR_KEYWORDS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Technology", patterns: [/technology/i, /tech/i, /software/i, /semiconductor/i] },
  { label: "Healthcare", patterns: [/healthcare/i, /pharma/i, /biotech/i] },
  { label: "Financials", patterns: [/financial/i, /bank/i, /insurance/i] },
  { label: "Energy", patterns: [/energy/i, /oil/i, /gas/i] },
  { label: "Consumer", patterns: [/consumer/i, /retail/i] },
  { label: "Industrials", patterns: [/industrial/i, /manufacturing/i, /transport/i] },
  { label: "Real Estate", patterns: [/real estate/i, /reit/i, /property/i] },
  { label: "Utilities", patterns: [/utility/i] },
  { label: "Fixed Income", patterns: [/bond/i, /treasury/i, /income/i] }
];

interface PreparedContext {
  sanitizedProfile: SanitizedClientProfile;
  answers: Record<string, string>;
  documents: PreparedDocument[];
  dynamicTags: string[];
  portfolioSnapshot: PortfolioSnapshot;
  riskSnapshot: RiskSnapshot;
  recommendationSnapshot: RecommendationSnapshot;
  coveragePercent: number;
}

interface AnalysisSession {
  prepared: PreparedAnalysisSummary;
  context: PreparedContext;
  outputs: Partial<{
    agent1: AgentOneOutput;
    agent2: AgentTwoOutput;
    agent3: AgentThreeOutput;
    scoring: RecommendationScores;
  }>;
}

const sessionStore = new Map<string, AnalysisSession>();

const agentOneSchema = z.object({
  documentsAnalyzed: z.number().int().nonnegative(),
  holdingsIdentified: z.number().int().nonnegative(),
  assetClassesDetected: z.number().int().nonnegative(),
  diversificationScore: z.number().min(0).max(100),
  findings: z.array(z.string()).min(3).max(6)
});

const agentTwoSchema = z.object({
  riskMetricsCalculated: z.number().int().nonnegative(),
  complianceChecksCompleted: z.number().int().nonnegative(),
  complianceChecksPassed: z.number().int().nonnegative(),
  riskEventsIdentified: z.number().int().nonnegative(),
  overallRiskScore: z.number().min(0).max(100),
  findings: z.array(z.string()).min(3).max(6)
});

const actionSchema = z.object({
  action: z.enum(["Buy", "Sell", "Hold", "Shift"]),
  symbol: z.string(),
  rationale: z.string(),
  targetWeight: z.number().min(0).max(100)
});

const agentThreeSchema = z.object({
  recommendationsGenerated: z.number().int().nonnegative(),
  expectedReturnImprovement: z.number(),
  taxEfficiencyGain: z.number(),
  implementationCost: z.number().nonnegative(),
  findings: z.array(z.string()).min(3).max(6),
  actions: z.array(actionSchema).min(3).max(8)
});

const agentOneJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentsAnalyzed: { type: "integer" },
    holdingsIdentified: { type: "integer" },
    assetClassesDetected: { type: "integer" },
    diversificationScore: { type: "number" },
    findings: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 }
  },
  required: ["documentsAnalyzed", "holdingsIdentified", "assetClassesDetected", "diversificationScore", "findings"]
};

const agentTwoJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskMetricsCalculated: { type: "integer" },
    complianceChecksCompleted: { type: "integer" },
    complianceChecksPassed: { type: "integer" },
    riskEventsIdentified: { type: "integer" },
    overallRiskScore: { type: "number" },
    findings: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 }
  },
  required: ["riskMetricsCalculated", "complianceChecksCompleted", "complianceChecksPassed", "riskEventsIdentified", "overallRiskScore", "findings"]
};

const agentThreeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendationsGenerated: { type: "integer" },
    expectedReturnImprovement: { type: "number" },
    taxEfficiencyGain: { type: "number" },
    implementationCost: { type: "number" },
    findings: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    actions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string", enum: ["Buy", "Sell", "Hold", "Shift"] },
          symbol: { type: "string" },
          rationale: { type: "string" },
          targetWeight: { type: "number" }
        },
        required: ["action", "symbol", "rationale", "targetWeight"]
      }
    }
  },
  required: ["recommendationsGenerated", "expectedReturnImprovement", "taxEfficiencyGain", "implementationCost", "findings", "actions"]
};

function requireGroq() {
  if (!groq) {
    throw new Error("Missing GROQ_API_KEY. Add it to .env.local before running analysis.");
  }

  return groq;
}

function sanitizeText(value: string) {
  return SECURITY_PATTERNS.reduce((text, rule) => text.replace(rule.pattern, rule.replace), value)
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeText(value: string, maxLength = 280) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function extractTickers(text: string) {
  const matches = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  return Array.from(new Set(matches.filter((ticker) => Object.keys(TICKER_LIBRARY).includes(ticker)))).slice(0, 8);
}

function extractMoneyMentions(text: string) {
  const matches = Array.from(text.matchAll(/\$?([\d,]{4,})(?:\.\d+)?/g));
  return matches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 1000)
    .slice(0, 24);
}

function inferCategoryMentions(text: string, dictionary: Array<{ label: string; patterns: RegExp[] }>) {
  return dictionary
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(text)))
    .map((entry) => entry.label);
}

function chunkText(text: string, size = 900) {
  if (!text.trim()) {
    return [];
  }

  const paragraphs = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  paragraphs.forEach((paragraph) => {
    const candidate = `${current} ${paragraph}`.trim();
    if (candidate.length > size && current) {
      chunks.push(current.trim());
      current = paragraph;
      return;
    }

    current = candidate;
  });

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.slice(0, 18);
}

function detectPortfolioValue(texts: string[]) {
  const mentions = extractMoneyMentions(texts.join(" "));
  const plausible = mentions.filter((value) => value >= 100000);

  if (!plausible.length) {
    return 1200000;
  }

  return Math.max(...plausible.slice(0, 8));
}

function inferRiskTolerance(answers: Record<string, string>) {
  return (answers.riskTolerance || "moderate") as "conservative" | "moderate" | "aggressive";
}

function buildDefaultHoldings(tags: string[], riskTolerance: string, portfolioValue: number): PortfolioHolding[] {
  const techHeavy = tags.includes("tech-heavy") || tags.includes("concentration");
  const retired = tags.includes("retired") || tags.includes("income-focus");

  const template = techHeavy
    ? [
        { symbol: "AAPL", weight: 18 },
        { symbol: "MSFT", weight: 16 },
        { symbol: "NVDA", weight: 14 },
        { symbol: "GOOGL", weight: 10 },
        { symbol: "VTI", weight: 16 },
        { symbol: "BND", weight: 12 },
        { symbol: "CASH", weight: 8 },
        { symbol: "VNQ", weight: 6 }
      ]
    : retired || riskTolerance === "conservative"
      ? [
          { symbol: "SCHD", weight: 18 },
          { symbol: "VTI", weight: 16 },
          { symbol: "VXUS", weight: 10 },
          { symbol: "BND", weight: 24 },
          { symbol: "AGG", weight: 14 },
          { symbol: "TIP", weight: 8 },
          { symbol: "CASH", weight: 6 },
          { symbol: "VNQ", weight: 4 }
        ]
      : riskTolerance === "aggressive"
        ? [
            { symbol: "VTI", weight: 28 },
            { symbol: "AAPL", weight: 12 },
            { symbol: "MSFT", weight: 10 },
            { symbol: "NVDA", weight: 8 },
            { symbol: "VXUS", weight: 14 },
            { symbol: "SCHD", weight: 8 },
            { symbol: "BND", weight: 10 },
            { symbol: "GLD", weight: 10 }
          ]
        : [
            { symbol: "VTI", weight: 24 },
            { symbol: "SCHD", weight: 12 },
            { symbol: "VXUS", weight: 12 },
            { symbol: "BND", weight: 18 },
            { symbol: "AGG", weight: 10 },
            { symbol: "VNQ", weight: 8 },
            { symbol: "GLD", weight: 6 },
            { symbol: "CASH", weight: 10 }
          ];

  return template.map((item) => {
    const instrument = TICKER_LIBRARY[item.symbol];
    return {
      symbol: item.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
      sector: instrument.sector,
      weight: item.weight,
      estimatedValue: Math.round((portfolioValue * item.weight) / 100),
      liquidity: item.symbol === "CASH" ? "high" : item.symbol === "VNQ" || item.symbol === "GLD" ? "medium" : "high",
      thesis: `${instrument.name} anchors the ${instrument.assetClass.toLowerCase()} sleeve.`
    } satisfies PortfolioHolding;
  });
}

function normalizeHoldings(holdings: PortfolioHolding[]) {
  const total = holdings.reduce((sum, holding) => sum + holding.weight, 0) || 1;
  return holdings.map((holding) => ({
    ...holding,
    weight: Number(((holding.weight / total) * 100).toFixed(1))
  }));
}
function buildPortfolioSnapshot(
  profile: SanitizedClientProfile,
  answers: Record<string, string>,
  documents: PreparedDocument[],
  tags: string[]
): PortfolioSnapshot {
  const riskTolerance = inferRiskTolerance(answers);
  const combinedText = [profile.summary, profile.goals, profile.advisorNotes, ...documents.map((doc) => doc.sanitizedText)].join(" ");
  const portfolioValue = detectPortfolioValue([combinedText]);
  const detectedTickers = Array.from(new Set(documents.flatMap((doc) => doc.extractedTickers)));

  let holdings: PortfolioHolding[] = [];

  if (detectedTickers.length >= 3) {
    holdings = detectedTickers
      .map((ticker, index) => {
        const instrument = TICKER_LIBRARY[ticker];
        if (!instrument) {
          return null;
        }
        const baseWeight = clamp(20 - index * 2.5, 4, 20);
        return {
          symbol: ticker,
          name: instrument.name,
          assetClass: instrument.assetClass,
          sector: instrument.sector,
          weight: baseWeight,
          estimatedValue: Math.round((portfolioValue * baseWeight) / 100),
          liquidity: instrument.assetClass === "Alternative" ? "medium" : "high",
          thesis: `${instrument.name} was surfaced directly from the statement text.`
        } satisfies PortfolioHolding;
      })
      .filter(Boolean) as PortfolioHolding[];
  }

  if (!holdings.length) {
    holdings = buildDefaultHoldings(tags, riskTolerance, portfolioValue);
  }

  holdings = normalizeHoldings(holdings);

  const assetAllocationMap = new Map<string, number>();
  const sectorExposureMap = new Map<string, number>();

  holdings.forEach((holding) => {
    assetAllocationMap.set(holding.assetClass, (assetAllocationMap.get(holding.assetClass) ?? 0) + holding.weight);
    sectorExposureMap.set(holding.sector, (sectorExposureMap.get(holding.sector) ?? 0) + holding.weight);
  });

  const assetAllocation = Array.from(assetAllocationMap.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
  const sectorExposure = Array.from(sectorExposureMap.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const largestHoldingPct = Math.max(...holdings.map((holding) => holding.weight));
  const largestSectorPct = Math.max(...sectorExposure.map((sector) => sector.value), 0);
  const diversificationPenalty = Math.max(0, largestHoldingPct - 10) * 1.2 + Math.max(0, largestSectorPct - 25) * 0.9;
  const assetBreadthBonus = assetAllocation.length * 5;
  const diversificationScore = clamp(Math.round(78 - diversificationPenalty + assetBreadthBonus), 22, 94);
  const cashBufferPct = assetAllocationMap.get("Cash") ?? (tags.includes("retired") ? 7 : 4);
  const estimatedCurrentReturn = Number((riskTolerance === "aggressive" ? 7.4 : riskTolerance === "conservative" ? 5.6 : 6.4).toFixed(1));

  const narrativeHighlights = [
    largestSectorPct > 45
      ? `Sector concentration remains elevated, with the largest sleeve at roughly ${largestSectorPct.toFixed(0)}% of assets.`
      : `Sector exposure appears diversified enough to support measured repositioning rather than a full rewrite.`,
    cashBufferPct < 6
      ? `Available liquidity looks thin relative to typical near-term advisory transitions.`
      : `Cash and short-duration reserves should support staged implementation without forcing sales.`,
    tags.includes("taxable")
      ? `The profile signals taxable-account sensitivity, so transition pacing should matter.`
      : `The profile does not over-index on taxable constraints, giving the advisor more implementation flexibility.`
  ];

  return {
    documentsAnalyzed: documents.length,
    holdingsIdentified: holdings.length,
    assetClassesDetected: assetAllocation.length,
    diversificationScore,
    estimatedCurrentReturn,
    cashBufferPct: Number(cashBufferPct.toFixed(1)),
    largestHoldingPct: Number(largestHoldingPct.toFixed(1)),
    largestSectorPct: Number(largestSectorPct.toFixed(1)),
    holdings,
    assetAllocation,
    sectorExposure,
    narrativeHighlights
  };
}

function buildRiskSnapshot(
  profile: SanitizedClientProfile,
  answers: Record<string, string>,
  tags: string[],
  portfolio: PortfolioSnapshot
): RiskSnapshot {
  const riskTolerance = inferRiskTolerance(answers);
  const highLiquidityNeed = /high|urgent|near-term|monthly/i.test(`${answers.liquidityNeeds || ""} ${profile.goals}`);
  const concentrationEvents = Number(portfolio.largestHoldingPct > 10) + Number(portfolio.largestSectorPct > 25) + Number(portfolio.cashBufferPct < 5);
  const complianceChecksCompleted = 6;
  const complianceChecksPassed = clamp(complianceChecksCompleted - concentrationEvents, 2, 6);
  const overallRiskScore = clamp(
    Math.round(68 + (portfolio.diversificationScore - 60) * 0.15 - concentrationEvents * 5 - (highLiquidityNeed ? 6 : 0) + (riskTolerance === "conservative" ? -2 : 2)),
    28,
    92
  );
  const sharpeRatio = Number((portfolio.estimatedCurrentReturn / (riskTolerance === "aggressive" ? 7.2 : 5.8)).toFixed(2));
  const sortinoRatio = Number((sharpeRatio + 0.18 - (concentrationEvents > 1 ? 0.08 : 0)).toFixed(2));
  const liquidityRisk = clamp(Math.round(42 + (highLiquidityNeed ? 18 : 4) - portfolio.cashBufferPct * 1.3), 12, 88);

  const riskEvents = [
    portfolio.largestHoldingPct > 10 ? `Largest single holding is above the 10% concentration tolerance.` : null,
    portfolio.largestSectorPct > 25 ? `Largest sector exposure exceeds the 25% concentration checkpoint.` : null,
    highLiquidityNeed && portfolio.cashBufferPct < 8 ? `Liquidity reserves may be light for the stated spending cadence.` : null,
    tags.includes("taxable") ? `Tax-sensitive positioning increases transition friction if gains are embedded.` : null
  ].filter(Boolean) as string[];

  const commentary = [
    concentrationEvents >= 2
      ? `Risk posture is being driven more by concentration than by broad market beta.`
      : `Risk posture is manageable, but a few localized exposures deserve tighter controls.`,
    liquidityRisk > 55
      ? `Liquidity planning should be treated as a gating item before implementation.`
      : `Liquidity does not appear to block implementation if rebalancing is staged.`,
    sortinoRatio < 1.1
      ? `Downside efficiency is mediocre relative to the return profile, which supports diversifying recommendations.`
      : `Downside-adjusted efficiency is acceptable, so recommendations can focus on alignment rather than rescue work.`
  ];

  return {
    sharpeRatio,
    sortinoRatio,
    liquidityRisk,
    concentrationEvents,
    complianceChecksCompleted,
    complianceChecksPassed,
    riskEvents,
    overallRiskScore,
    commentary
  };
}

function buildRecommendationSnapshot(
  profile: SanitizedClientProfile,
  answers: Record<string, string>,
  tags: string[],
  portfolio: PortfolioSnapshot,
  risk: RiskSnapshot
): RecommendationSnapshot {
  const portfolioValue = portfolio.holdings.reduce((sum, holding) => sum + (holding.estimatedValue ?? 0), 0) || 1200000;
  const retired = tags.includes("retired") || tags.includes("income-focus");
  const aggressive = inferRiskTolerance(answers) === "aggressive";
  const taxSensitive = (answers.taxSensitivity || "").toLowerCase() === "high" || tags.includes("taxable");
  const baseAllocation = retired
    ? { Equity: 46, Bond: 34, Cash: 8, Alternative: 12 }
    : aggressive
      ? { Equity: 68, Bond: 16, Cash: 4, Alternative: 12 }
      : { Equity: 56, Bond: 24, Cash: 6, Alternative: 14 };

  const actions = [
    {
      action: "Shift" as const,
      symbol: "Core Allocation",
      rationale: `Move toward a ${baseAllocation.Equity}/${baseAllocation.Bond}/${baseAllocation.Alternative}/${baseAllocation.Cash} stocks-bonds-alternatives-cash posture to better align with stated goals.`,
      targetWeight: baseAllocation.Equity
    },
    {
      action: portfolio.largestSectorPct > 35 ? "Sell" as const : "Hold" as const,
      symbol: portfolio.holdings[0]?.symbol || "Overweight Sleeve",
      rationale: `Trim concentrated exposure so no single sleeve dominates the strategy conversation.`,
      targetWeight: Math.min(portfolio.largestHoldingPct, 10)
    },
    {
      action: "Buy" as const,
      symbol: retired ? "SCHD" : "VXUS",
      rationale: retired
        ? `Add a steadier dividend sleeve to support income reliability.`
        : `Add international diversification to lower domestic concentration risk.`,
      targetWeight: retired ? 12 : 10
    },
    {
      action: "Buy" as const,
      symbol: retired ? "BND" : "AGG",
      rationale: `Increase ballast and reduce volatility sensitivity during implementation.`,
      targetWeight: retired ? 24 : 18
    },
    {
      action: taxSensitive ? "Hold" as const : "Buy" as const,
      symbol: taxSensitive ? "Legacy Tax Lots" : "TIP",
      rationale: taxSensitive
        ? `Phase legacy transitions to avoid unnecessary realized gains.`
        : `Add inflation-aware ballast to improve downside protection.`,
      targetWeight: taxSensitive ? 0 : 6
    }
  ];

  const expectedReturnImprovement = Number((2.1 + (portfolio.largestSectorPct > 45 ? 2.4 : 1.2) + (retired ? 0.6 : 1.1)).toFixed(1));
  const projectedAnnualReturn = Number((portfolio.estimatedCurrentReturn + expectedReturnImprovement).toFixed(1));
  const taxEfficiencyGain = Number((taxSensitive ? 2.7 : 1.3).toFixed(1));
  const implementationCost = Math.round(portfolioValue * (retired ? 0.0038 : 0.0045));
  const taxImplications = Math.round((taxSensitive ? -portfolioValue * 0.0048 : -portfolioValue * 0.0024));
  const riskAdjustedReturnImprovement = Number((1.6 + (risk.overallRiskScore > 70 ? 0.8 : 0.4)).toFixed(1));
  const scenarios = [
    { scenario: "Low" as const, annualReturn: Number((projectedAnnualReturn - 2.1).toFixed(1)), expectedValue3Y: Math.round(portfolioValue * Math.pow(1 + (projectedAnnualReturn - 2.1) / 100, 3)) },
    { scenario: "Base" as const, annualReturn: projectedAnnualReturn, expectedValue3Y: Math.round(portfolioValue * Math.pow(1 + projectedAnnualReturn / 100, 3)) },
    { scenario: "High" as const, annualReturn: Number((projectedAnnualReturn + 1.8).toFixed(1)), expectedValue3Y: Math.round(portfolioValue * Math.pow(1 + (projectedAnnualReturn + 1.8) / 100, 3)) }
  ];

  const summary = [
    `Shift the portfolio toward a more balanced implementation mix with explicit sleeves for diversification, income stability, and reserve liquidity.`,
    taxSensitive
      ? `Stage changes carefully to preserve tax efficiency and avoid forcing realization of embedded gains.`
      : `The implementation path can be comparatively direct because tax drag appears manageable.`,
    retired
      ? `Income durability and downside control should drive the recommendation narrative.`
      : `The recommendation can lean into long-term compounding while reducing concentration risk.`
  ];

  return {
    recommendationsGenerated: actions.length,
    expectedReturnImprovement,
    taxEfficiencyGain,
    implementationCost,
    taxImplications,
    projectedAnnualReturn,
    projectedValue3Y: scenarios[1].expectedValue3Y,
    riskAdjustedReturnImprovement,
    actions,
    scenarios,
    summary
  };
}

function calculateScores(
  portfolio: PortfolioSnapshot,
  risk: RiskSnapshot,
  recommendation: RecommendationSnapshot,
  outputs: { agent1: AgentOneOutput; agent2: AgentTwoOutput; agent3: AgentThreeOutput }
): RecommendationScores {
  const feasibilityScore = clamp(
    Math.round(82 - portfolio.largestSectorPct * 0.35 - risk.liquidityRisk * 0.18 - recommendation.implementationCost / 1500 + recommendation.taxEfficiencyGain * 3),
    35,
    94
  );
  const impactScore = clamp(
    Math.round(58 + recommendation.expectedReturnImprovement * 6 + recommendation.riskAdjustedReturnImprovement * 5 + (80 - portfolio.diversificationScore) * 0.16),
    38,
    96
  );

  return {
    feasibilityScore,
    impactScore,
    projectedAnnualReturn: recommendation.projectedAnnualReturn,
    projectedValue3Y: recommendation.projectedValue3Y,
    implementationCost: recommendation.implementationCost,
    taxImplications: recommendation.taxImplications,
    riskAdjustedReturnImprovement: recommendation.riskAdjustedReturnImprovement,
    combinedFindings: [...outputs.agent1.findings, ...outputs.agent2.findings, ...outputs.agent3.findings].slice(0, 9),
    risks: risk.riskEvents.length ? risk.riskEvents : risk.commentary.slice(0, 3)
  };
}

async function fileToText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  return buffer.toString("utf-8");
}

async function prepareDocuments(files: File[]) {
  const docs: PreparedDocument[] = [];

  for (const file of files) {
    const rawText = await fileToText(file);
    const sanitizedText = sanitizeText(rawText);
    const chunks = chunkText(sanitizedText).map((chunk, index) => ({
      id: `${file.name.replace(/\W+/g, "-").toLowerCase()}-${index + 1}`,
      label: `Chunk ${index + 1}`,
      summary: summarizeText(chunk, 180),
      keywords: [...inferCategoryMentions(chunk, ASSET_KEYWORDS), ...inferCategoryMentions(chunk, SECTOR_KEYWORDS)].slice(0, 6),
      excerpt: chunk
    }));

    docs.push({
      id: makeId("doc"),
      name: file.name,
      type: file.type || "text/plain",
      size: file.size,
      sanitizedText,
      chunkCount: chunks.length,
      chunks,
      extractedTickers: extractTickers(sanitizedText),
      assetMentions: inferCategoryMentions(sanitizedText, ASSET_KEYWORDS),
      sectorMentions: inferCategoryMentions(sanitizedText, SECTOR_KEYWORDS),
      moneyMentions: extractMoneyMentions(sanitizedText)
    });
  }

  return docs;
}

function sanitizeProfile(profile: AnalyzeRequestPayload["profile"], alias: string): SanitizedClientProfile {
  return {
    clientAlias: alias,
    summary: sanitizeText(profile.profileSummary || "No summary provided."),
    goals: sanitizeText(profile.goals || "No goals provided."),
    advisorNotes: sanitizeText(profile.advisorNotes || "No advisor notes provided.")
  };
}

function inferDynamicTags(profile: AnalyzeRequestPayload["profile"], answers: Record<string, string>, documents: PreparedDocument[]) {
  const source = [profile.profileSummary, profile.goals, profile.advisorNotes, Object.values(answers).join(" "), documents.map((doc) => doc.name).join(" "), documents.map((doc) => doc.sanitizedText).join(" ")].join(" ");
  const tags = new Set<string>();

  if (/retired|retirement|income generation|withdraw/i.test(source)) tags.add("retired");
  if (/income|yield|cash flow|monthly/i.test(source)) tags.add("income-focus");
  if (/tech|technology|nvda|aapl|msft|semiconductor/i.test(source)) tags.add("tech-heavy");
  if (/concentrated|single stock|overweight|heavy exposure/i.test(source)) tags.add("concentration");
  if (/taxable|tax optimization|capital gain|after-tax/i.test(source)) tags.add("taxable");
  if (/embedded gains|legacy holding|low basis/i.test(source)) tags.add("embedded-gains");
  if (/liquidity|cash need|near-term|emergency|spending/i.test(source)) tags.add("liquidity");
  if (/cash need|monthly expenses|required withdrawal/i.test(source)) tags.add("cash-need");

  return Array.from(tags);
}

export async function createAnalysisSession(payload: AnalyzeRequestPayload, files: File[]) {
  const sessionId = makeId("session");
  const alias = payload.profile.clientName.trim() ? `CLIENT_${payload.profile.clientName.trim().replace(/\W+/g, "").slice(0, 8).toUpperCase()}` : "CLIENT_MASKED";
  const documents = await prepareDocuments(files);
  const dynamicTags = inferDynamicTags(payload.profile, payload.answers, documents);
  const sanitizedProfile = sanitizeProfile(payload.profile, alias);
  const answered = Object.values(payload.answers).filter((value) => value.trim()).length;
  const total = Math.max(Object.keys(payload.answers).length, answered, 1);
  const coveragePercent = clamp(Math.round((answered / total) * 100), 0, 100);
  const portfolioSnapshot = buildPortfolioSnapshot(sanitizedProfile, payload.answers, documents, dynamicTags);
  const riskSnapshot = buildRiskSnapshot(sanitizedProfile, payload.answers, dynamicTags, portfolioSnapshot);
  const recommendationSnapshot = buildRecommendationSnapshot(sanitizedProfile, payload.answers, dynamicTags, portfolioSnapshot, riskSnapshot);

  const prepared: PreparedAnalysisSummary = {
    sessionId,
    coveragePercent,
    filesProcessed: documents.length,
    chunkCount: documents.reduce((sum, doc) => sum + doc.chunkCount, 0),
    profileDigest: summarizeText(`${sanitizedProfile.summary} ${sanitizedProfile.goals}`, 180),
    dynamicTags
  };

  sessionStore.set(sessionId, {
    prepared,
    context: {
      sanitizedProfile,
      answers: payload.answers,
      documents,
      dynamicTags,
      portfolioSnapshot,
      riskSnapshot,
      recommendationSnapshot,
      coveragePercent
    },
    outputs: {}
  });

  return prepared;
}

function getSession(sessionId: string) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error("Analysis session not found. Prepare the session again.");
  }
  return session;
}
function buildAgentInstructions(agent: AgentKey) {
  if (agent === "agent1") {
    return `You are the Portfolio Analysis Agent inside a wealth-advisory workflow. Always call tools before answering. If documents are available, inspect at least one sanitized document chunk before producing your final result. Focus on current portfolio construction, diversification, and what the statements imply about concentration.`;
  }

  if (agent === "agent2") {
    return `You are the Risk Assessment Agent inside a wealth-advisory workflow. Always call tools before answering. Focus on risk-adjusted returns, concentration, liquidity, and compliance-style checkpoints. Use the prior portfolio output and current profile to explain the most material risk issues.`;
  }

  return `You are the Investment Recommendation Agent inside a wealth-advisory workflow. Always call tools before answering. Produce advisor-ready recommendations grounded in the tool outputs, with a clear tax-aware implementation path and scenario framing.`;
}

function buildFunctionTool(name: string, description: string, parameters: Record<string, unknown>) {
  return {
    type: "function" as const,
    function: {
      name,
      description,
      parameters
    }
  };
}

function buildNoArgParameters() {
  return {
    type: "object",
    properties: {},
    additionalProperties: true
  };
}

function toolDefinitions(agent: AgentKey) {
  if (agent === "agent1") {
    return [
      buildFunctionTool("get_client_profile", "Fetch the sanitized client profile, goals, and question signals.", buildNoArgParameters()),
      buildFunctionTool("list_document_chunks", "List available sanitized documents and chunk identifiers.", buildNoArgParameters()),
      buildFunctionTool("inspect_document_chunk", "Inspect a single sanitized document chunk.", {
        type: "object",
        additionalProperties: false,
        properties: {
          documentId: { type: "string" },
          chunkId: { type: "string" }
        },
        required: ["documentId", "chunkId"]
      }),
      buildFunctionTool("get_portfolio_snapshot", "Return the prepared portfolio snapshot derived from local parsing.", buildNoArgParameters()),
      buildFunctionTool("compute_diversification_metrics", "Return concentration and diversification diagnostics.", buildNoArgParameters())
    ];
  }

  if (agent === "agent2") {
    return [
      buildFunctionTool("get_client_profile", "Fetch the sanitized client profile, goals, and question signals.", buildNoArgParameters()),
      buildFunctionTool("get_portfolio_snapshot", "Return the portfolio snapshot produced earlier in the workflow.", buildNoArgParameters()),
      buildFunctionTool("get_agent_one_summary", "Fetch Agent 1 output for downstream risk analysis.", buildNoArgParameters()),
      buildFunctionTool("evaluate_risk_metrics", "Compute risk-adjusted return and liquidity diagnostics.", buildNoArgParameters()),
      buildFunctionTool("run_compliance_checks", "Return concentration and compliance-style checkpoint results.", buildNoArgParameters())
    ];
  }

  return [
    buildFunctionTool("get_client_profile", "Fetch the sanitized client profile, goals, and question signals.", buildNoArgParameters()),
    buildFunctionTool("get_portfolio_snapshot", "Return the portfolio snapshot produced earlier in the workflow.", buildNoArgParameters()),
    buildFunctionTool("get_agent_two_summary", "Fetch Agent 2 output for downstream recommendation work.", buildNoArgParameters()),
    buildFunctionTool("generate_rebalancing_blueprint", "Generate the deterministic rebalancing and scenario blueprint.", buildNoArgParameters()),
    buildFunctionTool("estimate_transition_impacts", "Return implementation cost, tax effects, and scenario impacts.", buildNoArgParameters())
  ];
}

function executeTool(agent: AgentKey, session: AnalysisSession, name: string, args: Record<string, unknown>) {
  const { context, outputs } = session;

  const tools: Record<string, () => unknown> = {
    get_client_profile: () => ({
      clientAlias: context.sanitizedProfile.clientAlias,
      summary: context.sanitizedProfile.summary,
      goals: context.sanitizedProfile.goals,
      advisorNotes: context.sanitizedProfile.advisorNotes,
      answers: context.answers,
      dynamicTags: context.dynamicTags,
      coveragePercent: context.coveragePercent
    }),
    list_document_chunks: () => ({
      documents: context.documents.map((document) => ({
        documentId: document.id,
        name: document.name,
        chunkCount: document.chunkCount,
        chunks: document.chunks.map((chunk) => ({ id: chunk.id, label: chunk.label, keywords: chunk.keywords }))
      }))
    }),
    inspect_document_chunk: () => {
      const document = context.documents.find((item) => item.id === args.documentId);
      const chunk = document?.chunks.find((item) => item.id === args.chunkId);
      return {
        documentId: document?.id,
        documentName: document?.name,
        chunkId: chunk?.id,
        label: chunk?.label,
        summary: chunk?.summary,
        excerpt: chunk ? summarizeText(chunk.excerpt, 320) : undefined,
        keywords: chunk?.keywords ?? []
      };
    },
    get_portfolio_snapshot: () => context.portfolioSnapshot,
    compute_diversification_metrics: () => ({
      diversificationScore: context.portfolioSnapshot.diversificationScore,
      largestHoldingPct: context.portfolioSnapshot.largestHoldingPct,
      largestSectorPct: context.portfolioSnapshot.largestSectorPct,
      assetClassesDetected: context.portfolioSnapshot.assetClassesDetected,
      narrativeHighlights: context.portfolioSnapshot.narrativeHighlights
    }),
    get_agent_one_summary: () => outputs.agent1 ?? null,
    evaluate_risk_metrics: () => context.riskSnapshot,
    run_compliance_checks: () => ({
      complianceChecksCompleted: context.riskSnapshot.complianceChecksCompleted,
      complianceChecksPassed: context.riskSnapshot.complianceChecksPassed,
      concentrationEvents: context.riskSnapshot.concentrationEvents,
      riskEvents: context.riskSnapshot.riskEvents
    }),
    get_agent_two_summary: () => outputs.agent2 ?? null,
    generate_rebalancing_blueprint: () => ({
      actions: context.recommendationSnapshot.actions,
      summary: context.recommendationSnapshot.summary,
      projectedAnnualReturn: context.recommendationSnapshot.projectedAnnualReturn,
      expectedReturnImprovement: context.recommendationSnapshot.expectedReturnImprovement,
      riskAdjustedReturnImprovement: context.recommendationSnapshot.riskAdjustedReturnImprovement
    }),
    estimate_transition_impacts: () => ({
      implementationCost: context.recommendationSnapshot.implementationCost,
      taxEfficiencyGain: context.recommendationSnapshot.taxEfficiencyGain,
      taxImplications: context.recommendationSnapshot.taxImplications,
      scenarios: context.recommendationSnapshot.scenarios
    })
  };

  const tool = tools[name];
  if (!tool) {
    throw new Error(`Unsupported tool ${name} for ${agent}`);
  }

  return tool();
}

function summarizeToolOutput(name: string, output: unknown) {
  const json = JSON.stringify(output);
  return `${name}: ${summarizeText(json, 160)}`;
}

async function runToolCallingAgent<T>(
  session: AnalysisSession,
  agent: AgentKey,
  schemaName: string,
  schema: z.ZodType<T>,
  jsonSchema: Record<string, unknown>,
  inputSummary: string
) {
  const client = requireGroq();
  const tools = toolDefinitions(agent);
  const instructions = `${buildAgentInstructions(agent)} Keep responses concise. Prefer at most one tool call per turn, inspect no more than one document chunk unless absolutely necessary, and keep findings short.`;
  const toolAudit: Array<{ toolName: string; summary: string }> = [];

  const messages: any[] = [
    {
      role: "system",
      content: instructions
    },
    {
      role: "user",
      content: inputSummary
    }
  ];

  let usedTools = false;

  for (let turn = 0; turn < 4; turn += 1) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: turn === 0 ? "required" : "auto",
      parallel_tool_calls: false,
      temperature: 0.2,
      max_tokens: 220
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error(`Groq returned an empty message for ${agent}.`);
    }

    messages.push(message);
    const toolCalls = message.tool_calls ?? [];

    if (!toolCalls.length) {
      break;
    }

    usedTools = true;

    for (const call of toolCalls) {
      if (call.type !== "function") {
        continue;
      }

      const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      const result = executeTool(agent, session, call.function.name, args);
      toolAudit.push({ toolName: call.function.name, summary: summarizeToolOutput(call.function.name, result) });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result)
      });
    }
  }

  if (!usedTools) {
    throw new Error(`${agent} did not invoke any tools.`);
  }

  const finalResponse = await client.chat.completions.create({
    model: MODEL,
    messages: [
      ...messages,
      {
        role: "user",
        content: `Return ONLY valid JSON matching this schema. Keep the payload compact. Schema name: ${schemaName}. Schema: ${JSON.stringify(jsonSchema)}`
      }
    ],
    response_format: {
      type: "json_object"
    },
    temperature: 0.1,
    max_tokens: 420
  });

  const outputText = finalResponse.choices[0]?.message?.content;
  if (!outputText) {
    throw new Error(`Groq returned an empty structured response for ${agent}.`);
  }

  const parsed = schema.parse(JSON.parse(outputText));

  return { parsed, toolAudit };
}

export async function runAgentOne(sessionId: string) {
  const session = getSession(sessionId);
  const { parsed, toolAudit } = await runToolCallingAgent(
    session,
    "agent1",
    "agent_one_result",
    agentOneSchema,
    agentOneJsonSchema,
    "Analyze the current portfolio state for the advisory workflow using the available tools."
  );

  const output: AgentOneOutput = {
    status: "complete",
    progress: 100,
    documentsAnalyzed: parsed.documentsAnalyzed || session.context.portfolioSnapshot.documentsAnalyzed,
    holdingsIdentified: parsed.holdingsIdentified || session.context.portfolioSnapshot.holdingsIdentified,
    assetClassesDetected: parsed.assetClassesDetected || session.context.portfolioSnapshot.assetClassesDetected,
    diversificationScore: Math.round(parsed.diversificationScore || session.context.portfolioSnapshot.diversificationScore),
    findings: parsed.findings,
    portfolioSnapshot: session.context.portfolioSnapshot,
    toolAudit
  };

  session.outputs.agent1 = output;
  sessionStore.set(sessionId, session);
  return { prepared: session.prepared, agent1: output };
}

export async function runAgentTwo(sessionId: string) {
  const session = getSession(sessionId);
  if (!session.outputs.agent1) {
    throw new Error("Agent 1 must complete before Agent 2.");
  }

  const { parsed, toolAudit } = await runToolCallingAgent(
    session,
    "agent2",
    "agent_two_result",
    agentTwoSchema,
    agentTwoJsonSchema,
    "Assess portfolio risk and compliance posture using the available tools and prior agent output."
  );

  const output: AgentTwoOutput = {
    status: "complete",
    progress: 100,
    riskMetricsCalculated: parsed.riskMetricsCalculated || 6,
    complianceChecksCompleted: parsed.complianceChecksCompleted || session.context.riskSnapshot.complianceChecksCompleted,
    complianceChecksPassed: parsed.complianceChecksPassed || session.context.riskSnapshot.complianceChecksPassed,
    riskEventsIdentified: parsed.riskEventsIdentified || session.context.riskSnapshot.riskEvents.length,
    overallRiskScore: Math.round(parsed.overallRiskScore || session.context.riskSnapshot.overallRiskScore),
    findings: parsed.findings,
    riskSnapshot: session.context.riskSnapshot,
    toolAudit
  };

  session.outputs.agent2 = output;
  sessionStore.set(sessionId, session);
  return { prepared: session.prepared, agent1: session.outputs.agent1, agent2: output };
}

export async function runAgentThree(sessionId: string) {
  const session = getSession(sessionId);
  if (!session.outputs.agent1 || !session.outputs.agent2) {
    throw new Error("Agent 1 and Agent 2 must complete before Agent 3.");
  }

  const { parsed, toolAudit } = await runToolCallingAgent(
    session,
    "agent3",
    "agent_three_result",
    agentThreeSchema,
    agentThreeJsonSchema,
    "Build the recommendation plan using the available tools, prior agent outputs, and the sanitized client goals."
  );

  const recommendationSnapshot: RecommendationSnapshot = {
    ...session.context.recommendationSnapshot,
    recommendationsGenerated: parsed.recommendationsGenerated || session.context.recommendationSnapshot.recommendationsGenerated,
    expectedReturnImprovement: parsed.expectedReturnImprovement || session.context.recommendationSnapshot.expectedReturnImprovement,
    taxEfficiencyGain: parsed.taxEfficiencyGain || session.context.recommendationSnapshot.taxEfficiencyGain,
    implementationCost: parsed.implementationCost || session.context.recommendationSnapshot.implementationCost,
    actions: parsed.actions,
    summary: parsed.findings
  };

  const output: AgentThreeOutput = {
    status: "complete",
    progress: 100,
    recommendationsGenerated: recommendationSnapshot.recommendationsGenerated,
    expectedReturnImprovement: recommendationSnapshot.expectedReturnImprovement,
    taxEfficiencyGain: recommendationSnapshot.taxEfficiencyGain,
    implementationCost: recommendationSnapshot.implementationCost,
    findings: parsed.findings,
    recommendationSnapshot,
    toolAudit
  };

  const scoring = calculateScores(session.context.portfolioSnapshot, session.context.riskSnapshot, recommendationSnapshot, {
    agent1: session.outputs.agent1,
    agent2: session.outputs.agent2,
    agent3: output
  });

  session.outputs.agent3 = output;
  session.outputs.scoring = scoring;
  sessionStore.set(sessionId, session);

  return {
    prepared: session.prepared,
    agent1: session.outputs.agent1,
    agent2: session.outputs.agent2,
    agent3: output,
    scoring
  };
}

export function getExportRows(item: DashboardRecommendation) {
  return [
    { section: "Summary", field: "Client", value: item.clientName },
    { section: "Summary", field: "Strategy", value: item.strategyName },
    { section: "Summary", field: "Decision", value: item.decision },
    { section: "Scores", field: "Feasibility Score", value: item.feasibilityScore },
    { section: "Scores", field: "Impact Score", value: item.impactScore },
    { section: "Metrics", field: "Projected Annual Return", value: item.projectedReturn },
    { section: "Metrics", field: "Implementation Cost", value: item.implementationCost },
    { section: "Metrics", field: "Tax Implications", value: item.taxImplications },
    { section: "Metrics", field: "Risk-Adjusted Return Improvement", value: item.riskAdjustedReturnImprovement },
    ...item.findings.map((finding, index) => ({ section: "Findings", field: `Finding ${index + 1}`, value: finding })),
    ...item.risks.map((risk, index) => ({ section: "Risks", field: `Risk ${index + 1}`, value: risk })),
    ...item.actions.map((action, index) => ({ section: "Actions", field: `Action ${index + 1}`, value: `${action.action} ${action.symbol} -> ${action.targetWeight}% | ${action.rationale}` })),
    ...item.scenarios.map((scenario) => ({ section: "Scenarios", field: scenario.scenario, value: `${scenario.annualReturn}% annualized / ${scenario.expectedValue3Y}` }))
  ];
}

