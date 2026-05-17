/**
 * mcpController.js
 * MCP registry, real MCP connection, and apply-optimized endpoints.
 */

const { validateMcpUpload, validateMcpConnect, validateApplyOptimized } = require('../utils/validationUtils');
const { loadTools, mergeTools, replaceTools } = require('../services/mcpRegistry');
const {
  connectMcpServer,
  disconnectMcpServer,
  syncToolsFromMcp,
  getConnectionStatus,
} = require('../services/mcpConnection');
const { applyOptimizedTools } = require('../services/applyOptimized');

async function uploadTools(req, res) {
  try {
    const validation = validateMcpUpload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const merged = mergeTools(req.body.tools);
    return res.status(201).json({
      message: 'MCP tools uploaded successfully',
      count: merged.length,
      tools: merged,
    });
  } catch (err) {
    console.error('[mcpController.uploadTools]', err);
    return res.status(500).json({ error: 'Failed to upload MCP tools', details: err.message });
  }
}

async function replaceToolsHandler(req, res) {
  try {
    const validation = validateMcpUpload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const tools = replaceTools(req.body.tools);
    return res.status(200).json({
      message: 'MCP registry replaced successfully',
      count: tools.length,
      tools,
    });
  } catch (err) {
    console.error('[mcpController.replaceTools]', err);
    return res.status(500).json({ error: 'Failed to replace MCP tools', details: err.message });
  }
}

async function listTools(req, res) {
  try {
    const tools = loadTools();
    const connection = getConnectionStatus();
    const importedFromRealMcp = tools.some((t) => t._source === 'real_mcp');

    return res.json({
      count: tools.length,
      tools,
      mcp_connection: connection,
      registry_note: !connection.live_connected && importedFromRealMcp
        ? 'Tool list is cached from a previous MCP import. Live MCP is disconnected — POST /api/mcp/connect before mode "real".'
        : null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read MCP tools', details: err.message });
  }
}

/**
 * POST /api/mcp/connect — connect to real MCP server (stdio).
 */
async function connectMcp(req, res) {
  try {
    const validation = validateMcpConnect(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const result = await connectMcpServer({
      command: req.body.command,
      args: req.body.args,
      env: req.body.env,
      preset: req.body.preset,
      importTools: req.body.import_tools !== false,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[mcpController.connectMcp]', err);
    return res.status(500).json({ error: 'MCP connection failed', details: err.message });
  }
}

/**
 * POST /api/mcp/disconnect
 */
async function disconnectMcp(req, res) {
  try {
    await disconnectMcpServer();
    return res.json({
      message: 'Disconnected from MCP server',
      connection: getConnectionStatus(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Disconnect failed', details: err.message });
  }
}

/**
 * GET /api/mcp/connection
 */
async function getMcpConnection(req, res) {
  return res.json(getConnectionStatus());
}

/**
 * POST /api/mcp/sync — re-import tools from connected MCP.
 */
async function syncMcpTools(req, res) {
  try {
    const tools = await syncToolsFromMcp();
    return res.json({
      message: 'Tools synced from MCP server',
      count: tools.length,
      tools,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Sync failed', details: err.message });
  }
}

/**
 * POST /api/mcp/apply-optimized
 */
async function applyOptimizedHandler(req, res) {
  try {
    const validation = validateApplyOptimized(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const result = await applyOptimizedTools({
      tools: req.body.tools,
      workflowId: req.body.workflow_id,
      useLastWorkflow: Boolean(req.body.use_last_workflow),
      regenerateFromCurrent: Boolean(req.body.regenerate_from_current),
      syncRealMcp: Boolean(req.body.sync_real_mcp),
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[mcpController.applyOptimized]', err);
    return res.status(500).json({ error: 'Apply optimized failed', details: err.message });
  }
}

module.exports = {
  uploadTools,
  replaceToolsHandler,
  listTools,
  connectMcp,
  disconnectMcp,
  getMcpConnection,
  syncMcpTools,
  applyOptimizedHandler,
};
