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
  });
});

// Serve generated fix.md
app.get('/api/report/fix', (_req, res) => {
  const fixPath = path.join(__dirname, 'generated/fix.md');
  res.sendFile(fixPath);
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

app.listen(PORT, () => {
  console.log(`MCP Reliability Tester running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/mcp/connect          - Connect real MCP server (stdio)');
  console.log('  POST /api/mcp/disconnect       - Disconnect MCP server');
  console.log('  GET  /api/mcp/connection       - MCP connection status');
  console.log('  POST /api/mcp/sync             - Sync tools from live MCP');
  console.log('  POST /api/mcp/apply-optimized  - Apply optimized tools to registry');
  console.log('  POST /api/mcp/upload           - Upload MCP tool definitions');
  console.log('  POST /api/mcp/replace          - Replace entire MCP registry');
  console.log('  GET  /api/mcp                  - List registered tools');
  console.log('  POST /api/demo/load-bad  - Load bad demo MCP pack');
  console.log('  POST /api/demo/load-fixed - Load fixed demo MCP pack');
  console.log('  GET  /api/demo/info      - Demo pack info');
  console.log('  POST /api/workflow/run     - Run AI workflow test');
  console.log('  POST /api/workflow/compare   - Before/after score comparison');
  console.log('  POST /api/workflow/suite     - Run test suite (multiple tasks)');
  console.log('  GET  /api/workflow/suite/info - Suite pack info');
  console.log('  GET  /api/traces         - Get all workflow traces');
  console.log('  GET  /api/traces/latest  - Get latest trace');
  console.log('  GET  /api/report/fix       - Latest fix.md (legacy)');
  console.log('  GET  /api/reports          - List all reports');
  console.log('  GET  /api/reports/:id      - Report by workflow ID');
  console.log('  GET  /health             - Health check');
});

module.exports = app;
