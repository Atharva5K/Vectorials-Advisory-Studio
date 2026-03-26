## Problem Statement

Build a **multi-stage investment advisory application** for wealth management firms that guides financial advisors through a structured workflow to evaluate client portfolios and generate investment recommendations. 

## Context

This application simulates an AI-powered advisory platform where financial advisors can input client information, leverage automated analysis agents, and make informed investment decisions based on risk-adjusted metrics.

---

## Assignment Overview

Create a web application with the following **5-stage workflow**:

### Stage 1: Client Profile Gathering
- **File upload functionality** (drag-and-drop support) for:
  - Portfolio statements (PDF, TXT)
  - Financial documents (tax returns, bank statements)
  - Investment reports
- **Validation:** Require at least one text field OR one uploaded document to proceed

### Stage 2: Risk & Goals Assessment
- **Chat-style interface** with progressive questions covering:
  - Investment timeline and horizon
  - Risk tolerance (conservative/moderate/aggressive)
  - Income requirements and liquidity needs
  - Tax considerations
- **Track completion percentage** as questions are answered
- **Require minimum completion threshold** (e.g., 70%) before advancing
- **Display coverage meter** showing progress

### Stage 3: AI-Powered Analysis

Three specialized agents analyze the client profile **sequentially**:

#### Agent 1: Portfolio Analysis Agent (25% weight)
**Purpose:** Analyze current portfolio composition and performance

**Tasks:**
- Parse uploaded portfolio statements and documents
- Identify asset allocation breakdown (stocks, bonds, cash, alternatives)
- Calculate diversification metrics (concentration risk, sector exposure)

**Output Metrics:**
- Documents analyzed: X files
- Holdings identified: Y securities
- Asset classes detected: Z categories
- Diversification score: 0-100

#### Agent 2: Risk Assessment Agent (25% weight)
**Purpose:** Evaluate risk exposure and compliance

**Tasks:**
- Evaluate risk-adjusted returns (Sharpe ratio, Sortino ratio)
- Identify concentration risks (single stock >10%, sector >25%)
- Evaluate liquidity risk

**Output Metrics:**
- Risk metrics calculated: X indicators
- Compliance checks completed: Y/Y
- Risk events identified: Z issues
- Overall risk score: 0-100

#### Agent 3: Investment Recommendation Agent (50% weight)
**Purpose:** Synthesize findings and generate recommendations

**Tasks:**
- Match client goals with suitable investment strategies
- Recommend optimal asset allocation based on risk tolerance
- Suggest specific securities or funds to buy/sell/hold
- Calculate projected returns and scenarios
- Identify tax-loss harvesting opportunities
- Generate rebalancing recommendations
- Estimate implementation costs and tax implications
- Create low/base/high scenario projections

**Output Metrics:**
- Recommendations generated: X actions
- Expected return improvement: Y%
- Tax efficiency gain: Z%
- Implementation cost: $W

**UI Requirements:**
- Display each agent with **status indicators**: queued → running → complete
- Show **progress bars** (0-100%) for each agent
- Display **real-time metrics** as agents process
- Calculate **weighted overall progress**: `(0.25 × Agent1) + (0.25 × Agent2) + (0.50 × Agent3)`
- Simulate realistic processing time (~15-20 seconds total)
- Show **agent icons** or avatars for visual distinction

### Stage 4: Recommendation Scoring & Decision
- **Display calculated scores** with color-coded indicators:
  - **Feasibility Score** (0-100): Implementation complexity, cost, liquidity constraints
    - Green: ≥75 (Easy to implement)
    - Amber: 50-74 (Moderate complexity)
    - Red: <50 (Difficult/high barriers)
  - **Impact Score** (0-100): Expected portfolio improvement, goal alignment
    - Green: ≥75 (High impact)
    - Amber: 50-74 (Moderate impact)
    - Red: <50 (Low impact)
- **Financial Metrics:**
  - Projected annual return (%)
  - Expected portfolio value (3-year projection)
  - Implementation cost ($)
  - Tax implications ($)
  - Risk-adjusted return improvement
- **Display findings** from all three agents (bullet points)
- **List identified risks** and considerations


### Stage 5: Portfolio Dashboard
- **Client Portfolio Table:**
  - Sortable columns: Client name, strategy name, decision, feasibility, impact, projected return, implementation cost
  - Color-coded decision badges
  - Expandable rows showing detailed findings, risks, and financial projections
  - Delete/archive recommendation action
- **Feasibility-Impact Matrix** (2D scatter plot):
  - X-axis: Feasibility Score (0-100)
  - Y-axis: Impact Score (0-100)
  - Each point represents a client recommendation
  - Color-coded by decision type (green/blue/grey)
  - Quadrant labels: "Quick Wins", "Strategic", "Fill-ins", "Low Priority"
  - Hover tooltips with client name and key metrics
  - **Performance requirement:** Smooth rendering with ≥25 clients
- **Export Functionality:**
  - Generate client recommendation report (PDF, Excel, or CSV)
  - Include: Executive summary, current portfolio, recommendations, risk analysis, financial projections


## Deliverables

### 1. Working Application
- GitHub repository with your code
- Application should run locally with `npm install && npm run dev`
- Include a README with setup instructions

### 2. Documentation
Include a brief document covering:
- How to run the application
- Key architecture decisions
- Challenges faced and solutions
- What you would improve with more time

---
## Questions?

If you need clarification on any requirements, please reach out via email.

## Example User Journey

Here's what a complete advisory workflow should look like:

1. **Advisor lands on Stage 1: Client Profile Gathering**
   - Enters client info: "Retired couple, age 65, $2M portfolio heavily concentrated in tech stocks"
   - Notes goals: "Income generation, reduce volatility, tax optimization"
   - Uploads portfolio statement CSV file
   - Clicks "Continue to Risk Assessment"

2. **Stage 2: Risk & Goals Assessment**
   - Chat interface asks: "What is the client's investment timeline?"
   - Advisor answers: "10-15 years"
   - System asks: "What is their risk tolerance?"
   - Advisor answers: "Conservative to moderate"
   - Completes 6 of 8 questions (75% coverage)
   - "Continue to Analysis" button appears

3. **Stage 3: AI Analysis**
   - **Portfolio Analysis Agent** runs:
     - Progress: 0% → 100% over ~5 seconds
     - Shows: "Analyzed 1 document, identified 47 holdings, detected 4 asset classes"
     - Diversification score: 42/100 (poor diversification)
   - **Risk Assessment Agent** runs:
     - Progress: 0% → 100% over ~5 seconds
     - Shows: "Calculated 8 risk metrics, identified 3 concentration risks"
     - Overall risk score: 68/100 (moderate-high risk)
   - **Investment Recommendation Agent** runs:
     - Progress: 0% → 100% over ~8 seconds
     - Shows: "Generated 12 recommendations, 6.2% expected return improvement"
     - Implementation cost: $8,500
   - Overall progress reaches 100%, "Continue to Recommendations" enabled

4. **Stage 4: Recommendation Scoring**
   - Feasibility Score: 78 (green) - Easy to implement
   - Impact Score: 85 (green) - High impact on goals
   - Projected annual return: 7.2% (up from 5.8%)
   - Expected 3-year value: $2.34M
   - Implementation cost: $8,500
   - Tax implications: -$12,000 (one-time)
   - Sees agent findings:
     - Portfolio: "Over-concentrated in tech (58%), minimal bonds, no international exposure"
     - Risk: "High correlation risk, downside exposure >portfolio median"
     - Recommendations: "Rebalance to 50/30/20 stocks/bonds/alternatives, add international equity, implement dividend strategy"
   - Clicks **"Implement"** → Names strategy: "Retirement Income Rebalancing"

5. **Stage 5: Portfolio Dashboard**
   - Views client in portfolio table
   - Sees green "Implement" badge
   - Client plotted in "High Impact, High Feasibility" quadrant of matrix
   - Clicks "Export PDF" → Downloads professional client report
   - Returns to Stage 1 to evaluate next client

---

Good luck! We're excited to see what you build.


