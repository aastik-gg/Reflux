/**
 * server.js
 * Express entry point for the MCP Reliability Tester backend.
 */

require('dotenv').config();

const fs = require('fs');
const express = require('express');
const path = require('path');

const mcpRoutes = require('./routes/mcpRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const traceRoutes = require('./routes/traceRoutes');
const demoRoutes = require('./routes/demoRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { getLlmConfig } = require('./services/llmService');
const { ensureDir } = require('./utils/fsUtils');
const { loadTools, replaceTools } = require('./services/mcpRegistry');
const {
  DATA_DIR,
  GENERATED_DIR,
  DEMO_BAD_PATH,
} = require('./config/paths');

ensureDir(GENERATED_DIR);
ensureDir(path.join(DATA_DIR, 'reports-archive'));

if (loadTools().length === 0) {
  try {
    const raw = fs.readFileSync(DEMO_BAD_PATH, 'utf8');
    const demoTools = JSON.parse(raw);
    replaceTools(Array.isArray(demoTools) ? demoTools : demoTools.tools || []);
    console.log(`Auto-loaded ${loadTools().length} demo tools (registry was empty)`);
  } catch (err) {
    console.error('Failed to auto-load demo tools:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL?.replace(/\/+$/, ''),
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
].filter((v, i, a) => v && a.indexOf(v) === i);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({
  limit: '2mb',
  strict: true,
  verify: (_req, _res, buf) => {
    if (buf.length === 0) return;
    const start = buf.toString('utf8', 0, Math.min(buf.length, 20)).trim();
    if (start.startsWith('POST ') || start.startsWith('GET ') || start.startsWith('PUT ')) {
      const err = new Error(
        'Request body looks like raw HTTP text, not JSON. In Postman use Body → raw → JSON.'
      );
      err.status = 400;
      err.expose = true;
      throw err;
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/mcp', mcpRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/traces', traceRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/health', (_req, res) => {
  const llm = getLlmConfig();
  res.json({
    status: 'ok',
    service: 'MCP Reliability Tester',
    llm_provider: llm.provider,
    llm_model: llm.model,
    llm_configured: llm.configured,
  });
});

// Serve generated fix.md
const { FIX_PATH } = require('./config/paths');
app.get('/api/report/fix', (_req, res) => {
  res.sendFile(FIX_PATH);
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// JSON parse errors
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON body',
      details: 'Send valid JSON in the request body. ' + (err.message || ''),
    });
  }
  if (err.status === 400 && err.expose) {
    return res.status(400).json({ error: 'Bad request', details: err.message });
  }
  next(err);
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MCP Reliability Tester running on http://localhost:${PORT}`);
  });
}

module.exports = app;
