/**
 * traceLogger.js
 * Persists workflow step traces to data/traces.json.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { TRACES_PATH } = require('../config/paths');
const { writeFileEnsuringDir } = require('../utils/fsUtils');

/**
 * Read all traces from disk.
 */
function readTraces() {
  try {
    const raw = fs.readFileSync(TRACES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Write traces array to disk.
 */
function writeTraces(traces) {
  writeFileEnsuringDir(TRACES_PATH, JSON.stringify(traces, null, 2));
}

/**
 * Create a new workflow trace session.
 */
function createSession({ task, workflowId, runType = 'primary' }) {
  return {
    id: workflowId || uuidv4(),
    task,
    run_type: runType,
    started_at: new Date().toISOString(),
    completed_at: null,
    steps: [],
    outcome: null,
    issues: [],
  };
}

/**
 * Log a single tool interaction step.
 */
function logStep(session, stepData) {
  const step = {
    step: session.steps.length + 1,
    tool: stepData.tool,
    args: stepData.args || {},
    output: stepData.output ?? null,
    success: Boolean(stepData.success),
    error: stepData.error || null,
    is_retry: Boolean(stepData.is_retry),
    latency_ms: stepData.latency_ms ?? 0,
    timestamp: new Date().toISOString(),
  };

  session.steps.push(step);
  return step;
}

/**
 * Finalize and persist a workflow session.
 */
function saveSession(session, { outcome, issues, persist = true }) {
  session.completed_at = new Date().toISOString();
  session.outcome = outcome;
  session.issues = issues || [];

  // Stability runs stay in-memory only (used for scoring, not stored in traces.json)
  if (!persist || session.run_type === 'stability') {
    return session;
  }

  const traces = readTraces();
  traces.push(session);
  writeTraces(traces);

  return session;
}

/**
 * Get all traces or filter by workflow id.
 */
function getTraces(workflowId, { includeStability = false } = {}) {
  let traces = readTraces();
  if (!includeStability) {
    traces = traces.filter((t) => t.run_type !== 'stability');
  }
  if (workflowId) {
    return traces.filter((t) => t.id === workflowId);
  }
  return traces;
}

/**
 * Get the most recent trace session.
 */
function getLatestTrace() {
  const traces = getTraces(null, { includeStability: false });
  return traces.length > 0 ? traces[traces.length - 1] : null;
}

module.exports = {
  readTraces,
  writeTraces,
  createSession,
  logStep,
  saveSession,
  getTraces,
  getLatestTrace,
};
