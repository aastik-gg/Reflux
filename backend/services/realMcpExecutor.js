/**
 * realMcpExecutor.js
 * Execute tools against a connected real MCP server.
 */

const { callMcpTool, isMcpConnected } = require('./mcpConnection');

async function executeRealTool(tool, args) {
  if (!isMcpConnected()) {
    return {
      success: false,
      output: null,
      error: 'No MCP server connected. Use POST /api/mcp/connect first.',
      latency_ms: 0,
      source: 'real_mcp',
    };
  }

  return callMcpTool(tool.name, args);
}

module.exports = {
  executeRealTool,
};
