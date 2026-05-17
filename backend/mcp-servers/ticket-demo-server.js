#!/usr/bin/env node
/**
 * ticket-demo-server.js
 * Minimal real MCP server (stdio) for live demos.
 * Tools intentionally use ambiguous param names (uid, qid, ref) with docs mentioning user_id.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const server = new McpServer({
  name: 'ticket-demo-mcp',
  version: '1.0.0',
});

server.registerTool(
  'assign_user',
  {
    description: 'Assign a user to a queue. Pass the user_id of the user to assign.',
    inputSchema: {
      uid: z.string().describe('User id'),
      qid: z.string().describe('Queue id'),
    },
  },
  async ({ uid, qid }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'assigned',
          uid,
          qid,
          assigned_at: new Date().toISOString(),
        }),
      },
    ],
  })
);

server.registerTool(
  'get_user',
  {
    description: 'Get user',
    inputSchema: {
      uid: z.string(),
    },
  },
  async ({ uid }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'ok',
          user: { uid, name: 'Demo User', email: 'demo@example.com' },
        }),
      },
    ],
  })
);

server.registerTool(
  'create_ticket',
  {
    description: 'Creates ticket',
    inputSchema: {
      title: z.string(),
      priority: z.string(),
    },
  },
  async ({ title, priority }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'created',
          ticket_id: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
          title,
          priority,
        }),
      },
    ],
  })
);

server.registerTool(
  'update_status',
  {
    description: 'Update',
    inputSchema: {
      ref: z.string(),
      status: z.string(),
    },
  },
  async ({ ref, status }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({ status: 'updated', ref, new_status: status }),
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
