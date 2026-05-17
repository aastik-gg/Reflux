/**
 * mcpConnection.js
 * Real MCP server connection via stdio transport.
 */

const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { mcpToolsToRegistry } = require('../utils/mcpSchemaConverter');
const { replaceTools } = require('./mcpRegistry');
const { IS_VERCEL } = require('../config/paths');

let client = null;
let transport = null;
function emptyConnectionInfo() {
  return {
    connected: false,
    preset: null,
    command: null,
    args: null,
    connected_at: null,
    disconnected_at: null,
    tool_count: 0,
  };
}

let connectionInfo = emptyConnectionInfo();

/** Preset MCP servers (stdio) */
const PRESETS = {
  'ticket-demo': {
    command: 'node',
    args: [path.join(__dirname, '../mcp-servers/ticket-demo-server.js')],
    description: 'Bundled ticket MCP with ambiguous tool params (stdio)',
  },
  'server-everything': {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    description: 'Official Anthropic reference MCP server (npm)',
  },
};

/**
 * Connect to an MCP server subprocess.
 */
async function connectMcpServer({ command, args = [], env, preset, importTools = true }) {
  if (IS_VERCEL) {
    throw new Error(
      'Real MCP (stdio) is not supported on Vercel serverless. Use mode "simulated", or host the backend on Railway/Render/Fly.io for live MCP.'
    );
  }

  await disconnectMcpServer();

  let cmd = command;
  let cmdArgs = args;

  if (preset) {
    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset "${preset}". Available: ${Object.keys(PRESETS).join(', ')}`);
    }
    cmd = PRESETS[preset].command;
    cmdArgs = PRESETS[preset].args;
  }

  if (!cmd) {
    throw new Error('Provide "command" and "args", or a "preset" name.');
  }

  transport = new StdioClientTransport({
    command: cmd,
    args: cmdArgs,
    env: env || undefined,
  });

  client = new Client(
    { name: 'mcp-reliability-tester', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  connectionInfo = {
    ...emptyConnectionInfo(),
    connected: true,
    command: cmd,
    args: cmdArgs,
    preset: preset || null,
    connected_at: new Date().toISOString(),
  };

  let tools = [];
  if (importTools) {
    tools = await syncToolsFromMcp();
  }

  return {
    message: 'Connected to MCP server',
    connection: getConnectionStatus(),
    tools_imported: tools.length,
    tools,
  };
}

/**
 * List tools from live MCP and sync to registry.
 */
async function syncToolsFromMcp() {
  if (!client) {
    throw new Error('Not connected to an MCP server. POST /api/mcp/connect first.');
  }

  const result = await client.listTools();
  const tools = mcpToolsToRegistry(result.tools || []);
  replaceTools(tools);
  connectionInfo.tool_count = tools.length;
  return tools;
}

/**
 * Call a tool on the real MCP server.
 */
async function callMcpTool(toolName, args) {
  if (!client) {
    throw new Error('Not connected to an MCP server. POST /api/mcp/connect first.');
  }

  const start = Date.now();
  try {
    const result = await client.callTool({
      name: toolName,
      arguments: args || {},
    });

    const isError = Boolean(result.isError);
    let output = null;
    let error = null;

    const textPart = (result.content || []).find((c) => c.type === 'text');
    if (textPart?.text) {
      try {
        output = JSON.parse(textPart.text);
      } catch {
        output = { raw: textPart.text };
      }
    } else {
      output = result.content;
    }

    if (isError) {
      error = typeof output === 'string' ? output : JSON.stringify(output);
      output = null;
    }

    return {
      success: !isError,
      output,
      error,
      latency_ms: Date.now() - start,
      source: 'real_mcp',
    };
  } catch (err) {
    return {
      success: false,
      output: null,
      error: err.message,
      latency_ms: Date.now() - start,
      source: 'real_mcp',
    };
  }
}

/**
 * Disconnect from MCP server.
 */
async function disconnectMcpServer() {
  const lastPreset = connectionInfo.preset;
  const lastCommand = connectionInfo.command;

  if (client) {
    try {
      await client.close();
    } catch {
      // ignore close errors
    }
  }
  if (transport) {
    try {
      await transport.close();
    } catch {
      // ignore close errors
    }
  }
  client = null;
  transport = null;
  const disconnectedAt = new Date().toISOString();
  connectionInfo = {
    ...emptyConnectionInfo(),
    disconnected_at: disconnectedAt,
    last_session: lastPreset || lastCommand
      ? {
          preset: lastPreset,
          command: lastCommand,
          disconnected_at: disconnectedAt,
        }
      : null,
  };
}

function isMcpConnected() {
  return Boolean(client && connectionInfo.connected);
}

function getConnectionStatus() {
  return {
    ...connectionInfo,
    /** True only when a live stdio MCP subprocess is connected right now. */
    live_connected: Boolean(client && connectionInfo.connected),
    available_presets: Object.keys(PRESETS).map((key) => ({
      name: key,
      ...PRESETS[key],
    })),
    // Deprecated alias — was confused with "currently connected"
    presets: Object.keys(PRESETS).map((key) => ({
      name: key,
      ...PRESETS[key],
    })),
  };
}

module.exports = {
  connectMcpServer,
  disconnectMcpServer,
  syncToolsFromMcp,
  callMcpTool,
  isMcpConnected,
  getConnectionStatus,
  PRESETS,
};
