# Reflux

An MCP (Model Context Protocol) reliability tester that scores how well AI agents can use your tools.

Load your MCP tool definitions, run an AI agent against them, and get a readiness score (0-100) with actionable fixes for naming, documentation, and parameter clarity.

## How It Works

1. **Add Tools** - Paste MCP tool JSON or load a demo pack
2. **Run Test** - An AI agent attempts to complete a task using your tools
3. **Get Score** - See a breakdown: Runtime (40), Parameters (30), Docs (20), Stability (10)
4. **Apply Fixes** - Auto-generate optimized tool definitions and a fix report

## Architecture

```
frontend/          React + TypeScript + Vite + Tailwind
backend/           Express.js + Google Gemini API
```

**Frontend** (Vercel): Three tabs - Overview, Tools, History  
**Backend** (Render): Agent runner, failure detection, scoring pipeline

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
node server.js
```

### Frontend

```bash
cd frontend
npm install
# Set VITE_API_URL in .env to your backend URL
npm run dev
```

### Environment Variables

**Backend (.env)**
| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key ([get one free](https://aistudio.google.com/apikey)) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `PORT` | No | Server port (default: 3000) |
| `LLM_MODEL` | No | Gemini model (default: gemini-3.1-flash-lite) |

**Frontend (.env)**
| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API URL |

## Scoring

The **Agent Readiness Score** (0-100) measures how reliably an AI agent can use your MCP tools:

| Category | Max | What it measures |
|---|---|---|
| Runtime Success | 40 | Did tool calls succeed? |
| Parameter Clarity | 30 | Are param names unambiguous? |
| Documentation | 20 | Are descriptions clear with examples? |
| Stability | 10 | Consistent behavior across runs? |

## Tech Stack

- **LLM**: Google Gemini (native SDK, model fallback chain)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Deploy**: Vercel (frontend) + Render (backend)
