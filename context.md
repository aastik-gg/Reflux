# MCP Reliability Tester — Project Context

A plain-language guide to what this project does, how it works, and every API it exposes. Written for demos, pitches, frontend integration, and onboarding.

---

## What is this project? (In one sentence)

**We test whether AI agents can reliably use your MCP tools** — then score the tools, find what confused the agent, and generate a fix report with better names, docs, and examples.

---

## The problem we solve

Companies build **MCP servers** (tools that AI assistants like Cursor or Claude can call). Those tools are often written for **human developers** who read docs and guess less.

**Autonomous AI agents** behave differently:

- They guess parameter names (`user_id` vs `uid`)
- They retry when errors are unclear
- They struggle with vague descriptions and missing examples
- They take different paths each run (unstable workflows)

Our product **simulates an autonomous agent**, watches it work, records everything, and tells you how to make your MCP **agent-ready**.

---

## What this is NOT

| Not this | We are this |
|----------|-------------|
| A chatbot for end users | A **testing & optimization backend** for MCP builders |
| An MCP server itself | A **tester** that uses MCP tools (simulated or real) |
| A hosted production platform (MVP) | A **local/lightweight** Node.js API + JSON file storage |
| Model training | **Analysis + reporting** using existing LLMs |

---

## Tech stack (simple)

| Layer | Technology | What it does |
|-------|------------|----------------|
| Server | **Node.js + Express** | REST API on port 3000 |
| AI brain | **OpenAI API** or **GitHub Models** | Runs the fake “autonomous agent” and writes analysis |
| Real MCP | **@modelcontextprotocol/sdk** | Talks to real MCP servers over stdio |
| Storage | **JSON files** in `backend/data/` | No database in MVP |
| Auth | None (MVP) | — |

### External services we call

1. **LLM API** (pick one via `.env`):
   - **GitHub Models** — `https://models.github.ai/inference` + `GITHUB_TOKEN` (needs `models` scope)
   - **OpenAI** — `https://api.openai.com/v1` + `OPENAI_API_KEY`
   - Default model: `openai/gpt-4.1-mini`

2. **MCP servers** (optional, when using `mode: "real"`):
   - Bundled: `backend/mcp-servers/ticket-demo-server.js`
   - Market example: `npx @modelcontextprotocol/server-everything`
   - Any stdio MCP: you provide `command` + `args`

We do **not** call real business APIs (Stripe, Jira, etc.) in the MVP — tool execution is either **simulated** or via **your connected MCP server**.

---

## The five engines (architecture)

Think of the backend as five cooperating parts:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ 1. MCP Registry │ ──► │ 2. Agent Runner  │ ──► │ 3. Tool Execution   │
│  (tool defs)    │     │  (LLM + loop)   │     │  (simulated / real) │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
         │                        │                          │
         │                        ▼                          ▼
         │               ┌──────────────────┐     ┌─────────────────────┐
         │               │ 4. Trace &       │ ◄── │ Step log per call   │
         │               │    Failure Detect│     └─────────────────────┘
         │               └──────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐     ┌──────────────────┐
│ 5. Fix Generator│ ◄── │ Evaluator (LLM)  │
│  (fix.md report)│     │ + Readiness Score│
└─────────────────┘     └──────────────────┘
```

### 1. MCP Tool Registry

- **What:** Stores tool definitions (name, description, parameters).
- **Where:** `backend/data/mcps.json`
- **How you fill it:** Upload, replace, demo packs, or import from a real MCP connection.

### 2. AI Agent Runner

- **What:** Pretends to be an autonomous agent given a **task** (e.g. “Assign user 123 to support queue”).
- **How:** Sends tools + task to the LLM; LLM returns tool calls; loop continues until the model stops calling tools or hits 15 steps.
- **File:** `backend/services/agentRunner.js`

### 3. Tool Execution Engine

Two modes:

| Mode | Meaning |
|------|---------|
| **`simulated`** (default) | Fake responses in code; intentionally strict (wrong param names fail, vague docs penalized). Good for demos. |
| **`real`** | Calls a **real MCP server** you connected via stdio. Good for “we work with market MCPs.” |

### 4. Trace & Failure Detection

- **Trace:** Step-by-step log — which tool, which arguments, success/fail, retries, timestamps.
- **Failure detection:** Rule-based checks (bad param names, doc/schema mismatch, retry loops, weak docs, unstable paths).
- **Where traces are saved:** `backend/data/traces.json` (primary runs only; stability re-runs stay in memory).

### 5. Fix Generator + Evaluator

- **Evaluator:** Second LLM pass — “why did the agent struggle?”
- **Fix generator:** Builds `backend/generated/fix.md` + returns `optimized_tools` JSON (renamed params, examples, longer descriptions).
- **Readiness score:** One number **0–100** summarizing how agent-friendly the MCP is.

---

## Main pipeline (what happens on `POST /api/workflow/run`)

This is the core “product loop”:

```
1. Load MCP tools from registry (mcps.json)
2. Start trace session
3. AGENT LOOP (up to 15 steps):
      → Ask LLM: "Complete this task using these tools"
      → If LLM wants to call a tool:
            → Execute tool (simulated OR real MCP)
            → Log step to trace
            → Send result back to LLM
      → If LLM replies with text only: done
4. Optional: run task again in memory for "stability" comparison (not saved to traces)
5. Run failure detectors on trace + tool definitions
6. Run LLM evaluator on trace + issues
7. Compute Agent Readiness Score (0–100)
8. Generate optimized_tools JSON
9. Generate fix.md report
10. Save trace, workflow record, report
11. Return JSON response to client
```

### Compare pipeline (`POST /api/workflow/compare`)

Runs the **full pipeline twice** on the same task:

1. **Before** — current tools → score A  
2. **After** — auto-optimized tools → score B  
3. Returns `improvement` (e.g. +42 points) and narrative for pitches.

### Suite pipeline (`POST /api/workflow/suite`)

Runs **multiple canned tasks** (demo pack = 2 tasks, full pack = 3) and returns **average readiness score**.

---

## Agent Readiness Score (0–100)

One headline metric for demos and UI.

| Component | Max points | What lowers it |
|-----------|------------|----------------|
| Runtime success | 40 | Failed tool steps, retries |
| Parameter clarity | 30 | Bad names, schema/doc mismatch, wrong params |
| Documentation | 20 | Short descriptions, no examples |
| Stability | 10 | Different paths on repeat runs, retry loops |

**Important:** You can have **100% tool success** but a **low score** (e.g. 58) if tool *design* is bad for agents.

---

## Issue types we detect

| Type | Plain English |
|------|----------------|
| `hallucinated_parameter` | Agent used `user_id` but tool expects `uid` |
| `missing_parameter` | Required field not sent |
| `retry_loop` | Same tool called many times |
| `ambiguous_naming` | Short names like `uid`, `ref`, `qid` |
| `weak_documentation` | Description too short or no examples |
| `description_schema_mismatch` | Docs say `user_id` but schema says `uid` |
| `workflow_instability` | Agent took different paths on repeat runs |

Issues are split in API responses:

- **`issues.runtime`** — problems during execution  
- **`issues.design`** — problems with how tools are defined  

---

## Simulated vs real MCP

| | Simulated | Real |
|--|-----------|------|
| **Setup** | Load tools into `mcps.json` (upload / demo packs) | `POST /api/mcp/connect` first |
| **Execution** | Our fake engine in `toolExecutor.js` | Subprocess MCP server via official SDK |
| **Workflow body** | `{ "task": "...", "mode": "simulated" }` (default) | `{ "task": "...", "mode": "real" }` |
| **Best for** | Reliable bad→good demo (58 → 100) | Proving compatibility with market MCPs |

**Real MCP presets:**

- `ticket-demo` — our bundled server  
- `server-everything` — `npx @modelcontextprotocol/server-everything`  

**Note:** Some market MCPs (e.g. filesystem) have complex schemas; full agent workflows work best with simpler tool schemas until we improve schema conversion.

---

## Demo packs (for pitches)

| Endpoint | What it loads |
|----------|----------------|
| `POST /api/demo/load-bad` | Intentionally bad tools (`uid`, vague docs) → expect score ~50–65 |
| `POST /api/demo/load-fixed` | Agent-friendly tools (`user_id`, examples) → expect score ~90–100 |

Suggested demo task: *“Assign user_id 123 to the support queue”*

---

## All API endpoints (reference)

Base URL: `http://localhost:3000`

### Health

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Server up? LLM configured? |

### MCP registry

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/mcp` | List registered tools + connection status |
| POST | `/api/mcp/upload` | Add/update tools (merge by name) |
| POST | `/api/mcp/replace` | Replace entire tool list |
| POST | `/api/mcp/apply-optimized` | Apply `optimized_tools` from last run or body |
| POST | `/api/mcp/connect` | Connect real MCP (stdio) |
| POST | `/api/mcp/disconnect` | Disconnect MCP |
| GET | `/api/mcp/connection` | Connection status + presets |
| POST | `/api/mcp/sync` | Re-import tools from connected MCP |

**Connect body examples:**

```json
{ "preset": "ticket-demo", "import_tools": true }
```

```json
{ "preset": "server-everything", "import_tools": true }
```

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"],
  "import_tools": true
}
```

**Apply optimized:**

```json
{ "use_last_workflow": true }
```

or `{ "workflow_id": "<uuid>" }` or `{ "tools": [ ... ] }`

### Workflows (core testing)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/workflow/run` | Run one agent test |
| POST | `/api/workflow/compare` | Before/after scores in one call |
| POST | `/api/workflow/suite` | Run multiple tasks, average score |
| GET | `/api/workflow/suite/info` | List suite packs and tasks |

**Run body:**

```json
{
  "task": "Assign user_id 123 to the support queue",
  "mode": "simulated",
  "stress": false
}
```

- `mode`: `"simulated"` | `"real"`  
- `stress`: stricter fake executor (more failures on bad tools)

### Traces

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/traces` | All saved primary traces |
| GET | `/api/traces/latest` | Most recent primary trace |

### Reports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/report/fix` | Latest `fix.md` (overwritten each run) |
| GET | `/api/reports` | List all report metadata |
| GET | `/api/reports/:workflowId` | Full report + markdown for one run |

### Demo

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/demo/info` | Demo pack descriptions |
| POST | `/api/demo/load-bad` | Load bad tool pack |
| POST | `/api/demo/load-fixed` | Load fixed tool pack |

---

## Typical workflows (how people use it)

### A. Investor demo (simulated, 2 minutes)

1. `POST /api/demo/load-bad`  
2. `POST /api/workflow/run` → score ~58  
3. `POST /api/demo/load-fixed` OR `POST /api/workflow/compare`  
4. Show score ~100 and `fix.md`  
5. One-liner: *“We raise agent readiness from 58 to 100.”*

### B. Real MCP demo

1. `POST /api/mcp/connect` with `preset: "server-everything"`  
2. `POST /api/workflow/run` with `mode: "real"` and task using `echo` tool  
3. Show `execution_source: "real_mcp"` in response  
4. `POST /api/mcp/disconnect`

### C. Developer integration

1. Upload company MCP JSON → `POST /api/mcp/upload`  
2. Run tasks → `POST /api/workflow/run`  
3. Read `optimized_tools` → `POST /api/mcp/apply-optimized`  
4. Re-run and compare scores  

### D. Regression suite

1. `POST /api/demo/load-bad`  
2. `POST /api/workflow/suite` with `pack: "demo"` or `"full"`  
3. Track `average_agent_readiness_score` over time  

---

## What a workflow response contains (for frontend)

Key fields from `POST /api/workflow/run`:

| Field | Meaning |
|-------|---------|
| `workflow_id` | Unique run ID |
| `agent_readiness_score` | 0–100 headline score |
| `score_breakdown` | Sub-scores (runtime, params, docs, stability) |
| `summary` | Task, duration, step counts, `task_completed` |
| `issues` | `{ all, runtime, design }` |
| `trace` | Step-by-step tool log |
| `optimized_tools` | Improved tool JSON to apply |
| `evaluation` | LLM analysis |
| `fix_markdown` | Full report text |
| `report_url` | `/api/reports/:workflow_id` |
| `mode` | `simulated` or `real` |

---

## Data files (where things are stored)

| File | Contents |
|------|----------|
| `backend/data/mcps.json` | Current MCP tool definitions |
| `backend/data/traces.json` | Saved workflow traces (primary only) |
| `backend/data/workflows.json` | Run metadata + scores |
| `backend/data/reports.json` | Report index |
| `backend/data/reports-archive/*.md` | Per-run markdown reports |
| `backend/generated/fix.md` | Latest report (legacy shortcut) |
| `backend/data/demo-bad-mcps.json` | Bad demo pack source |
| `backend/data/demo-fixed-mcps.json` | Fixed demo pack source |

---

## Project folder structure (backend)

```
backend/
├── server.js                 # Express entry, CORS, routes
├── package.json
├── .env                      # API keys (not committed with secrets)
├── routes/                   # URL → controller mapping
├── controllers/              # HTTP request handlers
├── services/                 # Business logic
│   ├── agentRunner.js        # LLM tool-calling loop
│   ├── toolExecutor.js       # Simulated tools
│   ├── realMcpExecutor.js    # Real MCP tool calls
│   ├── mcpConnection.js        # Connect/disconnect MCP servers
│   ├── workflowRunner.js     # Full pipeline orchestration
│   ├── failureDetector.js    # Rule-based issue detection
│   ├── readinessScore.js     # 0–100 score
│   ├── evaluator.js          # LLM analysis
│   ├── fixGenerator.js         # fix.md report
│   ├── toolOptimizer.js      # optimized_tools JSON
│   ├── suiteRunner.js        # Multi-task suite
│   ├── traceLogger.js        # Trace persistence
│   ├── mcpRegistry.js        # mcps.json read/write
│   ├── reportStore.js        # Per-workflow reports
│   └── openaiService.js      # OpenAI / GitHub Models client
├── utils/                    # Schema conversion, validation
├── mcp-servers/              # Bundled real MCP demo server
├── data/                     # JSON storage
└── generated/                # fix.md output
```

---

## Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | `github` or `openai` |
| `GITHUB_TOKEN` | For GitHub Models |
| `OPENAI_API_KEY` | For OpenAI (if not using GitHub) |
| `OPENAI_MODEL` | e.g. `openai/gpt-4.1-mini` |
| `OPENAI_BASE_URL` | Optional override |
| `PORT` | Default `3000` |
| `CORS_ORIGIN` | Frontend origin or `*` |

---

## How to run

```bash
cd backend
npm install
# Set GITHUB_TOKEN or OPENAI_API_KEY in .env
npm start
```

Postman collection: `backend/MCP_Reliability_Tester.postman_collection.json`

---

## Pitch positioning (short)

> **MCP Reliability Tester** is agent-readiness QA for MCP builders. We run autonomous agents against your tools, score them 0–100, show exactly where agents fail, and auto-generate optimized tool definitions and fix reports — on simulated or **real** MCP servers.

---

## Known MVP limitations

- JSON file storage only (no multi-user auth)
- Real MCP via **stdio** only (not HTTP/SSE remote URLs yet)
- Complex market MCP schemas may need schema adapter improvements
- LLM runs can take 20–90 seconds per workflow
- Simulated mode is stricter than most production MCPs (by design for demos)

---

*Last updated to reflect Batch 1–5 features: readiness score, demo packs, compare, stress mode, real MCP connector, suite, apply-optimized, reports by ID, CORS.*
