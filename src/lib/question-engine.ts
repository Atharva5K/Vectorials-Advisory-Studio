import type { AdvisoryQuestion, ClientProfileInput, QuestionCompletion } from "@/types/domain";

const questionBank: AdvisoryQuestion[] = [
  {
    id: "timeline",
    prompt: "What is the client’s investment timeline or horizon?",
    helperText: "Include the expected drawdown window or milestone date if known.",
    category: "Planning",
    type: "textarea"
  },
  {
    id: "riskTolerance",
    prompt: "How would you classify the client’s risk tolerance?",
    helperText: "This is used in downstream asset-allocation decisions.",
    category: "Risk",
    type: "choice",
    options: [
      { label: "Conservative", value: "conservative" },
      { label: "Moderate", value: "moderate" },
      { label: "Aggressive", value: "aggressive" }
    ]
  },
  {
    id: "incomeNeeds",
    prompt: "What income requirements should this portfolio support?",
    helperText: "Mention target withdrawals, dividend preferences, or cash flow timing.",
    category: "Cash Flow",
    type: "textarea"
  },
  {
    id: "liquidityNeeds",
    prompt: "What liquidity requirements or near-term cash needs should we respect?",
    helperText: "Short-term spending needs meaningfully change feasibility scoring.",
    category: "Liquidity",
    type: "textarea"
  },
  {
    id: "taxSensitivity",
    prompt: "How sensitive is the client to tax drag and realizing gains?",
    helperText: "Use this to guide tax-loss harvesting and transition planning.",
    category: "Tax",
    type: "choice",
    options: [
      { label: "Low sensitivity", value: "low" },
      { label: "Moderate sensitivity", value: "moderate" },
      { label: "High sensitivity", value: "high" }
    ]
  },
  {
    id: "constraints",
    prompt: "Are there any client-specific constraints or non-negotiables?",
    helperText: "Examples: ESG, legacy holdings, restricted securities, employer stock.",
    category: "Constraints",
    type: "textarea"
  },
  {
    id: "techConcentration",
    prompt: "How comfortable is the client with current sector concentration, especially tech exposure?",
    helperText: "Only shown when the profile appears concentrated in a single theme.",
    category: "Risk",
    type: "textarea",
    triggerTags: ["tech-heavy", "concentration"]
  },
  {
    id: "retirementIncome",
    prompt: "How stable does the portfolio income need to be across retirement spending years?",
    helperText: "This helps calibrate bond ladders, dividend sleeves, and cash reserves.",
    category: "Retirement",
    type: "textarea",
    triggerTags: ["retired", "income-focus"]
  },
  {
    id: "taxableTransition",
    prompt: "Is the client comfortable phasing changes over several quarters to reduce realized gains?",
    helperText: "Shown when the profile suggests a taxable account or embedded gains.",
    category: "Tax",
    type: "choice",
    options: [
      { label: "Yes, phased transition is preferred", value: "phased" },
      { label: "No, immediate change is acceptable", value: "immediate" },
      { label: "Unsure", value: "unsure" }
    ],
    triggerTags: ["taxable", "embedded-gains"]
  },
  {
    id: "liquidityBackstop",
    prompt: "Does the client need an emergency liquidity backstop outside the portfolio?",
    helperText: "Useful when bank statements or notes suggest higher drawdown sensitivity.",
    category: "Liquidity",
    type: "textarea",
    triggerTags: ["liquidity", "cash-need"]
  }
];

const tagRules: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "retired", pattern: /retired|retirement|income generation|65\b|withdrawal/i },
  { tag: "income-focus", pattern: /income|yield|cash flow|withdraw/i },
  { tag: "tech-heavy", pattern: /tech|technology|nvda|aapl|msft|semiconductor/i },
  { tag: "concentration", pattern: /concentrated|single stock|heavy exposure|overweight/i },
  { tag: "taxable", pattern: /taxable|capital gain|tax optimization|after-tax/i },
  { tag: "embedded-gains", pattern: /embedded gains|large gains|legacy holding/i },
  { tag: "liquidity", pattern: /liquidity|cash need|near-term|tuition|home purchase/i },
  { tag: "cash-need", pattern: /cash need|monthly expenses|distribution|required withdrawal/i }
];

export function inferDynamicTags(profile: ClientProfileInput, fileNames: string[] = []) {
  const source = [profile.profileSummary, profile.goals, profile.advisorNotes, fileNames.join(" ")]
    .filter(Boolean)
    .join(" \n ");

  return tagRules.filter((rule) => rule.pattern.test(source)).map((rule) => rule.tag);
}

export function getDynamicQuestions(profile: ClientProfileInput, fileNames: string[] = []) {
  const tags = inferDynamicTags(profile, fileNames);
  const tagSet = new Set(tags);

  const questions = questionBank.filter((question) => {
    if (!question.triggerTags?.length) {
      return true;
    }

    return question.triggerTags.some((tag) => tagSet.has(tag));
  });

  return { questions, tags };
}

export function getQuestionCompletion(
  questions: AdvisoryQuestion[],
  answers: Record<string, string>,
  threshold = 70
): QuestionCompletion {
  const answered = questions.filter((question) => Boolean(answers[question.id]?.trim())).length;
  const total = Math.max(questions.length, 1);
  const percent = Math.round((answered / total) * 100);

  return {
    answered,
    total,
    percent,
    thresholdMet: percent >= threshold
  };
}

