/**
 * traceLogger.js
 * Persists workflow step traces to data/traces.json.
 */

const { v4: uuidv4 } = require('uuid');
const { TRACES_PATH } = require('../config/paths');
const { loadJsonFile, saveJsonFile } = require('../utils/fsUtils');

function readTraces() {
  return loadJsonFile(TRACES_PATH, []);
}

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

function saveSession(session, { outcome, issues, persist = true }) {
  session.completed_at = new Date().toISOString();
  session.outcome = outcome;
  session.issues = issues || [];

  if (!persist || session.run_type === 'stability') return session;

  const traces = readTraces();
  traces.push(session);
  saveJsonFile(TRACES_PATH, traces);
  return session;
}

function getTraces(workflowId, { includeStability = false } = {}) {
  let traces = readTraces();
  if (!includeStability) traces = traces.filter((t) => t.run_type !== 'stability');
  if (workflowId) return traces.filter((t) => t.id === workflowId);
  return traces;
}

function getLatestTrace() {
  const traces = getTraces(null);
  return traces.length > 0 ? traces[traces.length - 1] : null;
}

module.exports = { readTraces, createSession, logStep, saveSession, getTraces, getLatestTrace };
