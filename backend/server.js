/**
 * server.js
 * Express entry point for the MCP Reliability Tester backend.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');

const mcpRoutes = require('./routes/mcpRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const traceRoutes = require('./routes/traceRoutes');
const demoRoutes = require('./routes/demoRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { getLlmConfig } = require('./services/openaiService');
const { ensureDir } = require('./utils/fsUtils');
const {
  IS_VERCEL,
  GENERATED_DIR,
  WRITABLE_DATA_DIR,
  FIX_PATH,
  ensureRuntimeDirs,
} = require('./config/paths');

ensureRuntimeDirs();
ensureDir(GENERATED_DIR);
ensureDir(path.join(WRITABLE_DATA_DIR, 'reports-archive'));

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// CORS — enable frontend (Vite/React/etc.) to call this API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Middleware — log to stderr so stdout stays clean for any subprocess use
app.use(express.json({
  limit: '2mb',
  strict: true,
  verify: (_req, res, buf) => {
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
    deployment: IS_VERCEL ? 'vercel' : 'local',
    real_mcp_available: !IS_VERCEL,
  });
});

// Serve generated fix.md
app.get('/api/report/fix', (_req, res) => {
  res.sendFile(FIX_PATH);
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// JSON parse errors (invalid Postman body, etc.)
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON body',
      details:
        'Send valid JSON in the request body (Postman: Body → raw → JSON). ' +
        (err.message || ''),
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
    if (IS_VERCEL) {
      console.log('Note: Running on Vercel — real MCP (stdio) is disabled; use simulated mode.');
    }
  });
}

module.exports = app;
