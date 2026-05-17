/**
 * toolExecutor.js
 * Simulates MCP tool execution with intentionally ambiguous behavior.
 * No real external APIs are called.
 */

const { getExpectedParams } = require('../utils/schemaUtils');
const { executeRealTool } = require('./realMcpExecutor');

/**
 * Known parameter aliases the executor will NOT accept (forces realistic failures).
 */
const REJECTED_ALIASES = {
  uid: ['user_id', 'userId', 'id'],
  tid: ['ticket_id', 'ticketId', 'task_id'],
  qid: ['queue_id', 'queueId'],
  ref: ['reference', 'ref_id', 'reference_id'],
  pid: ['project_id', 'projectId'],
};

const NAMING_SUGGESTIONS = {
  uid: 'user_id',
  tid: 'ticket_id',
  qid: 'queue_id',
  ref: 'reference_id',
  pid: 'project_id',
  id: 'entity_id',
  sid: 'session_id',
  nid: 'notification_id',
};

function validateArgs(tool, args) {
  const expected = getExpectedParams(tool);
  const provided = Object.keys(args || {});
  const missing = expected.filter((k) => !(k in args));
  const extra = provided.filter((k) => !expected.includes(k));
  const aliasMismatches = [];

  for (const param of expected) {
    const aliases = REJECTED_ALIASES[param] || [];
    for (const alias of aliases) {
      if (alias in args && !(param in args)) {
        aliasMismatches.push({ expected: param, received: alias, value: args[alias] });
      }
    }
  }

  return { expected, provided, missing, extra, aliasMismatches };
}

function buildSuccessOutput(tool, args) {
  const outputs = {
    assign_user: {
      status: 'assigned',
      message: `User ${args.uid || args.user_id} assigned successfully.`,
      assigned_at: new Date().toISOString(),
    },
    create_ticket: {
      status: 'created',
      ticket_id: `TKT-${Math.floor(Math.random() * 9000) + 1000}`,
      title: args.title || 'Untitled',
    },
    get_user: {
      status: 'ok',
      user: {
        uid: args.uid || args.user_id,
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    list_tickets: {
      status: 'ok',
      tickets: [
        { tid: '123', title: 'Bug report' },
        { tid: '456', title: 'Feature request' },
      ],
      ...(Math.random() > 0.5 ? { count: 2 } : {}),
    },
    update_status: {
      status: 'updated',
      ref: args.ref || args.reference_id,
      new_status: args.status || 'done',
    },
  };

  return (
    outputs[tool.name] || {
      status: 'ok',
      tool: tool.name,
      received_args: args,
    }
  );
}

/**
 * Execute a simulated MCP tool.
 * @param {object} options.stress — stricter validation for demo/testing
 */
async function executeTool(tool, args, options = {}) {
  if (options.mode === 'real') {
    return executeRealTool(tool, args);
  }

  const stress = Boolean(options.stress);
  const start = Date.now();
  const validation = validateArgs(tool, args);
  const descLen = (tool.description || '').length;

  if (validation.aliasMismatches.length > 0) {
    const m = validation.aliasMismatches[0];
    return {
      success: false,
      output: null,
      error: `Parameter mismatch: expected "${m.expected}" but received "${m.received}". Missing required parameter: ${m.expected}`,
      latency_ms: Date.now() - start,
      validation,
    };
  }

  if (validation.missing.length > 0) {
    return {
      success: false,
      output: null,
      error: `Missing required parameter(s): ${validation.missing.join(', ')}`,
      latency_ms: Date.now() - start,
      validation,
    };
  }

  // Stress: reject any extra parameters; normal: only when description is vague
  const rejectExtra =
    validation.extra.length > 0 &&
    (stress || descLen < 30);

  if (rejectExtra) {
    return {
      success: false,
      output: null,
      error: `Unknown parameter(s): ${validation.extra.join(', ')}. Use exact schema parameter names only.`,
      latency_ms: Date.now() - start,
      validation,
    };
  }

  // Stress: stricter doc threshold
  if (stress && descLen < 50 && getExpectedParams(tool).length > 0) {
    return {
      success: false,
      output: null,
      error: 'Tool documentation insufficient for reliable agent execution. Expand description and add examples.',
      latency_ms: Date.now() - start,
      validation,
    };
  }

  const transientChance = stress ? 0.12 : 0.05;
  if (Math.random() < transientChance) {
    return {
      success: false,
      output: null,
      error: 'Transient execution error: tool returned inconsistent state. Retry may succeed.',
      latency_ms: Date.now() - start,
      validation,
    };
  }

  const output = buildSuccessOutput(tool, args);

  return {
    success: true,
    output,
    error: null,
    latency_ms: Date.now() - start,
    validation,
  };
}

function getNamingSuggestions(tool) {
  const suggestions = {};
  for (const param of getExpectedParams(tool)) {
    if (NAMING_SUGGESTIONS[param]) {
      suggestions[param] = NAMING_SUGGESTIONS[param];
    }
  }
  return suggestions;
}

module.exports = {
  executeTool,
  validateArgs,
  getNamingSuggestions,
  NAMING_SUGGESTIONS,
};
