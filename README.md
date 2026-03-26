# Vectorials Advisory Studio

Vectorials Advisory Studio is a multi-stage investment advisory application built for the candidate assignment in `CANDIDATE_ASSIGNMENT.md`.

The app simulates a modern advisor workflow:
- collect client profile and portfolio documents
- ask a hybrid static plus dynamic assessment questionnaire
- run a real 3-agent analysis pipeline
- score recommendations
- review results in a dashboard
- export recommendations as CSV

This implementation uses real LLM calls through Groq and real local tool calling. The analysis is not mocked.

## Why Groq Was Used

Groq was chosen for three practical reasons:

1. It supports tool use / function calling, which this project needs for the three-agent workflow.
2. It is largely OpenAI-compatible, which made it possible to keep a clean TypeScript implementation using the `openai` SDK pointed at Groq's base URL.
3. It has a free plan, and the project has been tuned to fit that plan as well as possible during development and demos.

This project defaults to `llama-3.1-8b-instant` because it is a strong fit for the Groq free tier and works well for compact tool-calling flows.

Official Groq references:
- Quickstart: https://console.groq.com/docs/quickstart
- API keys: https://console.groq.com/keys
- Tool use: https://console.groq.com/docs/tool-use/overview
- OpenAI compatibility: https://console.groq.com/docs/openai
- Rate limits: https://console.groq.com/docs/rate-limits

## What The Application Does

The product flow is divided into five stages:

1. Profile Intake
   - capture client details
   - upload portfolio files
   - parse `CSV`, `TXT`, `JSON`, and `PDF`

2. Assessment
   - ask baseline questions for every client
   - add dynamic follow-up questions based on the uploaded portfolio and prior answers

3. Analysis
   - run three sequential agents with real tool calls
   - Agent 1: portfolio analysis
   - Agent 2: risk analysis
   - Agent 3: recommendation generation

4. Scoring
   - compute feasibility and impact scores
   - summarize findings and implementation considerations

5. Dashboard
   - review recommendations
   - compare opportunities on a chart
   - export results as CSV

## Core Features

- Next.js App Router frontend and backend in one codebase
- TypeScript end to end
- Tailwind CSS UI with Zustand state management
- Recharts-based feasibility vs impact visualization
- Real Groq API calls in Stage 3
- Real tool-calling loop for all three agents
- Local parsing, sanitization, chunking, and deterministic scoring
- CSV export
- Sample portfolio files included for testing

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS v4
- Zustand
- Recharts
- Zod
- `openai` SDK configured against Groq's OpenAI-compatible endpoint
- `papaparse`
- `pdf-parse`

## Security And Privacy Approach

This project is designed so that raw sensitive data is minimized before model analysis.

- documents are parsed locally on the server
- personally identifying details are redacted before model calls
- large documents are chunked into sanitized sections
- tools return portfolio facts and controlled summaries instead of raw statements whenever possible
- concentration, risk, scoring, and implementation metrics are computed deterministically in server-side code
- analysis sessions are held in memory for the active runtime and are not persisted to a database in this implementation

Important limitation:
- this is still a candidate assignment project, not a production-compliant financial platform
- uploaded files are not encrypted at rest because there is no persistent storage layer in this version

## Tool-Calling Architecture

The app uses three agents in sequence.

### Agent 1: Portfolio Analysis

Purpose:
- analyze the uploaded portfolio and current diversification picture

Available tools:
- `get_client_profile`
- `list_document_chunks`
- `inspect_document_chunk`
- `get_portfolio_snapshot`
- `compute_diversification_metrics`

### Agent 2: Risk Assessment

Purpose:
- evaluate portfolio risk, concentration, liquidity, and compliance-style checks

Available tools:
- `get_client_profile`
- `get_portfolio_snapshot`
- `get_agent_one_summary`
- `evaluate_risk_metrics`
- `run_compliance_checks`

### Agent 3: Recommendation Generation

Purpose:
- generate advisor-ready actions based on portfolio facts and risk findings

Available tools:
- `get_client_profile`
- `get_portfolio_snapshot`
- `get_agent_two_summary`
- `generate_rebalancing_blueprint`
- `estimate_transition_impacts`

The general loop is:
1. send agent instructions and allowed tool definitions to Groq
2. Groq returns tool calls
3. the server executes those tools locally
4. tool outputs are returned to the model
5. the model returns compact structured JSON

This is real tool calling, not a simulated progress-only UI.

## Project Structure

```text
src/
  app/
    api/
      analyze/route.ts
      export/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    charts/
    stages/
    ui/
    advisory-workbench.tsx
  lib/
    question-engine.ts
    server-analysis.ts
    utils.ts
  store/
    advisory-store.ts
  types/
    domain.ts
```

Important files:
- `src/lib/server-analysis.ts`: parsing, sanitization, chunking, tool definitions, and Groq orchestration
- `src/lib/question-engine.ts`: dynamic assessment question logic
- `src/store/advisory-store.ts`: multi-stage client-side state
- `src/app/api/analyze/route.ts`: analysis API route
- `src/app/api/export/route.ts`: CSV export route

## Prerequisites

Before running the project, make sure you have:
- Node.js 20 or newer recommended
- npm
- a Groq account
- a Groq API key

## How To Create A Groq API Key

1. Go to the Groq console: https://console.groq.com
2. Sign in or create an account.
3. Open the API keys page: https://console.groq.com/keys
4. Click `Create API Key`.
5. Copy the generated key.
6. Keep it private and do not commit it into git.

Groq's quickstart recommends using the API key through an environment variable rather than hardcoding it in source code.

## Environment Setup

Create a file named `.env.local` in the project root.

You can copy from `.env.example`.

Add the following values:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

Notes:
- `GROQ_API_KEY` is required for Stage 3 analysis.
- `GROQ_MODEL` is optional, but this project is tuned for `llama-3.1-8b-instant`.
- do not rename the variables unless you also change the server code.
- do not commit `.env.local`.

## How To Run The Project

From the project root:

```powershell
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Production Build

To verify the production build locally:

```powershell
npm run build
npm start
```

If you are on Windows and see a `.next\trace` file lock issue:
- stop any running `next dev` or `next start` process
- delete the `.next` folder
- run the build again

## Sample Data For Testing

Two example files are included in the project root:
- `example_portfolio.csv`
- `example_client_brief.txt`

Recommended test flow:
1. upload `example_portfolio.csv` in Stage 1
2. use the client brief as the narrative input or reference for Stage 2 answers
3. run the analysis pipeline

This sample is intentionally designed to trigger meaningful Agent 1, Agent 2, and Agent 3 outputs.

## Development Notes

The project is intentionally tuned to reduce free-tier pressure on Groq:
- compact prompts
- compact structured JSON outputs
- sequential agents instead of broad parallel fan-out
- summarized chunk inspection instead of sending large raw documents repeatedly
- local deterministic computations for scoring and diagnostics
- one free-tier-friendly default model

Even with those optimizations, repeated full analysis runs can still consume free-tier quota quickly. For development:
- use smaller test inputs
- avoid rerunning all three agents unnecessarily
- restart from sample files rather than very large portfolio statements when iterating on UI

## Supported File Types

The current implementation supports:
- `CSV`
- `TXT`
- `JSON`
- `PDF`

Notes:
- PDF support is text-extraction based, not full table reconstruction
- messy or image-heavy PDFs may produce weaker extraction results than CSV or clean text inputs

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

## Verification Status

The project has been verified with:
- `npm run typecheck`
- `npm run build`

## Known Limitations

- no persistent database
- no authentication
- no encrypted file storage layer
- no streaming per-agent updates yet
- PDF extraction is basic compared with specialized financial document parsing systems
- the dashboard is session-scoped and does not survive server restarts

## Future Improvements

Given more time, the next upgrades would be:
- persistent storage for completed recommendation runs
- authentication and role-based access
- encrypted file persistence
- improved PDF table extraction
- richer audit logs for tool calls
- PDF report generation in addition to CSV export
- streaming Stage 3 updates over server events or websockets

## Summary

This repository is a full-stack, Groq-powered advisory workflow demo with:
- a polished multi-stage UI
- real three-agent orchestration
- actual tool calling
- local privacy-aware preprocessing
- deterministic scoring and export

If you follow the `.env.local` setup and run commands above, the project is ready to run locally.