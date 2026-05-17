/**
 * workflowRunner.js
 * Orchestrates workflow testing, compare runs, and stability checks.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { runAgent } = require('./agentRunner');
const { createSession, saveSession } = require('./traceLogger');
const { detectAll } = require('./failureDetector');
const { evaluate } = require('./evaluator');
const { generateFixReport } = require('./fixGenerator');
const { calculateReadinessScore } = require('./readinessScore');
const { generateOptimizedTools } = require('./toolOptimizer');
const { loadTools, replaceTools } = require('./mcpRegistry');
const { saveWorkflowReport } = require('./reportStore');
const { isMcpConnected } = require('./mcpConnection');
const { summarizeTrace } = require('../utils/trajectoryUtils');
const { WORKFLOWS_PATH } = require('../config/paths');
const { writeFileEnsuringDir } = require('../utils/fsUtils');

const STABILITY_RUNS = 2;

/**
 * Strip internal metadata before using tools in agent/executor.
 */
function sanitizeToolsForRun(tools) {
  return (tools || []).map(({ name, description, parameters, examples }) => ({
    name,
    description,
    parameters: parameters || {},
    ...(examples ? { examples } : {}),
  }));
}

/**
 * Persist workflow result metadata.
 */
function saveWorkflowRecord(record) {
  let workflows = [];
  try {
    workflows = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));
  } catch {
    workflows = [];
  }
  workflows.push(record);
  writeFileEnsuringDir(WORKFLOWS_PATH, JSON.stringify(workflows, null, 2));
}

/**
 * Build a compact result object from pipeline output.
 */
function buildWorkflowResult({
  workflowId,
  task,
  tools,
  trace,
  issues,
  readiness,
  workflowSuccessRate,
  outcome,
  durationMs,
  optimizedTools,
  evaluation,
  fixMarkdown,
  stress,
  phase,
  mode = 'simulated',
  primaryResult,
}) {
  const traceSummary = summarizeTrace(trace);
  const taskCompleted = primaryResult?.taskCompleted ?? false;
  const taskCompletedSuccessfully = primaryResult?.taskCompletedSuccessfully ?? false;

  return {
    workflow_id: workflowId,
    phase: phase || 'single',
    stress: Boolean(stress),
    mode,
    execution_source: mode === 'real' ? 'real_mcp' : 'simulated',
    task_completed: taskCompleted,
    task_completed_successfully: taskCompletedSuccessfully,
    agent_final_response: primaryResult?.agentFinalResponse ?? null,
    workflow_success_rate: workflowSuccessRate,
    agent_readiness_score: readiness.agent_readiness_score,
    score_breakdown: readiness.score_breakdown,
    summary: {
      task,
      outcome,
      stress: Boolean(stress),
      phase: phase || 'single',
      workflow_success_rate: workflowSuccessRate,
      agent_readiness_score: readiness.agent_readiness_score,
      score_breakdown: readiness.score_breakdown,
      steps_count: traceSummary.steps,
      failures_count: traceSummary.failures,
      retries_count: traceSummary.retries,
      tools_used: traceSummary.tools_used,
      duration_ms: durationMs,
      task_completed: taskCompleted,
      task_completed_successfully: taskCompletedSuccessfully,
    },
    issues: {
      all: issues,
      runtime: readiness.issues.runtime,
      design: readiness.issues.design,
    },
    issues_detected: issues,
    optimized_tools: optimizedTools,
    trace,
    evaluation,
    fix_markdown: fixMarkdown,
    report_url:
      fixMarkdown && (phase === 'before' || !phase || phase === 'single')
        ? `/api/reports/${workflowId}`
        : null,
    apply_optimized_hint:
      'POST /api/mcp/replace with body { "tools": <optimized_tools> } or POST /api/workflow/compare',
  };
}

/**
 * Core pipeline: agent run → detect → score → optimize → report.
 */
function assertExecutionMode(mode) {
  if (mode === 'real' && !isMcpConnected()) {
    throw new Error(
      'mode "real" requires an active MCP connection. POST /api/mcp/connect with preset "ticket-demo" first.'
    );
  }
}

async function executeWorkflowPipeline({
  task,
  tools,
  stress = false,
  mode = 'simulated',
  persistTrace = true,
  generateReport = true,
  runStability = true,
  phase = 'single',
}) {
  assertExecutionMode(mode);
  const workflowId = uuidv4();
  const cleanTools = sanitizeToolsForRun(tools);
  const runStartedAt = Date.now();

  const session = createSession({ task, workflowId, runType: 'primary' });
  const runTraces = [];

  const primaryResult = await runAgent({
    task,
    tools: cleanTools,
    session,
    stress,
    mode,
  });
  primaryResult.mode = mode;
  runTraces.push(primaryResult.steps);

  if (runStability) {
    for (let i = 1; i < STABILITY_RUNS; i++) {
      const stabilitySession = createSession({
        task,
        workflowId: `${workflowId}-stability-${i}`,
        runType: 'stability',
      });
      const stabilityResult = await runAgent({
        task,
        tools: cleanTools,
        session: stabilitySession,
        stress,
        mode,
      });
      runTraces.push(stabilityResult.steps);
      // Not persisted — in-memory only for instability detection
    }
  }

  const trace = session.steps;
  const issues = detectAll({ trace, tools: cleanTools, runTraces });
  const evaluation = await evaluate({ task, trace, issues, tools: cleanTools });

  const workflowSuccessRate = primaryResult.successRate;
  const readiness = calculateReadinessScore({
    trace,
    issues,
    workflowSuccessRate,
    runTraces,
  });

  const optimizedTools = generateOptimizedTools(cleanTools, issues);
  const outcome = primaryResult.workflowSuccess ? 'success' : 'failure';
  const durationMs = Date.now() - runStartedAt;

  let fixMarkdown = null;
  if (generateReport) {
    fixMarkdown = await generateFixReport({
      task,
      issues,
      evaluation,
      tools: cleanTools,
      trace,
      workflowSuccessRate,
    });
  }

  saveSession(session, { outcome, issues, persist: persistTrace });

  const result = buildWorkflowResult({
    workflowId,
    task,
    tools: cleanTools,
    trace,
    issues,
    readiness,
    workflowSuccessRate,
    outcome,
    durationMs,
    optimizedTools,
    evaluation,
    fixMarkdown,
    stress,
    phase,
    mode,
    primaryResult,
  });

  if (generateReport && fixMarkdown) {
    saveWorkflowReport({
      workflowId,
      task,
      fixMarkdown,
      agentReadinessScore: readiness.agent_readiness_score,
      workflowSuccessRate,
      issuesCount: issues.length,
      stress,
      phase,
    });
  }

  return result;
}

/**
 * POST /api/workflow/run
 */
async function runWorkflow({ task, stress = false, mode = 'simulated' }) {
  const tools = loadTools();

  if (tools.length === 0) {
    throw new Error(
      'No MCP tools registered. Use POST /api/mcp/upload, POST /api/mcp/replace, POST /api/demo/load-bad, or POST /api/mcp/connect'
    );
  }

  const result = await executeWorkflowPipeline({
    task,
    tools,
    stress,
    mode,
    persistTrace: true,
    generateReport: true,
    runStability: true,
    phase: 'single',
  });

  saveWorkflowRecord({
    id: result.workflow_id,
    task,
    stress: result.stress,
    mode: result.mode,
    task_completed: result.task_completed,
    task_completed_successfully: result.task_completed_successfully,
    agent_readiness_score: result.agent_readiness_score,
    score_breakdown: result.score_breakdown,
    issues_detected: result.issues_detected,
    optimized_tools: result.optimized_tools,
    trace: result.trace,
    duration_ms: result.summary.duration_ms,
    report_url: result.report_url,
  });

  return result;
}

/**
 * POST /api/workflow/compare — run before (current tools) and after (optimized tools).
 */
async function compareWorkflow({
  task,
  stress = false,
  mode = 'simulated',
  applyOptimized = false,
}) {
  const tools = loadTools();

  if (tools.length === 0) {
    throw new Error('No MCP tools registered. Load tools before running compare.');
  }

  const compareId = uuidv4();

  const before = await executeWorkflowPipeline({
    task,
    tools,
    stress,
    mode,
    persistTrace: true,
    generateReport: true,
    runStability: true,
    phase: 'before',
  });

  const optimizedTools = sanitizeToolsForRun(before.optimized_tools);

  const after = await executeWorkflowPipeline({
    task,
    tools: optimizedTools,
    stress,
    mode,
    persistTrace: true,
    generateReport: false,
    runStability: true,
    phase: 'after',
  });

  if (applyOptimized) {
    replaceTools(optimizedTools);
  }

  const improvement =
    after.agent_readiness_score - before.agent_readiness_score;

  saveWorkflowRecord({
    id: compareId,
    type: 'compare',
    task,
    stress,
    before_score: before.agent_readiness_score,
    after_score: after.agent_readiness_score,
    improvement,
  });

  return {
    compare_id: compareId,
    task,
    stress,
    mode,
    improvement,
    improvement_percent: before.agent_readiness_score
      ? Math.round((improvement / before.agent_readiness_score) * 100)
      : improvement,
    before: {
      workflow_id: before.workflow_id,
      agent_readiness_score: before.agent_readiness_score,
      score_breakdown: before.score_breakdown,
      summary: before.summary,
      issues: before.issues,
      trace: before.trace,
      optimized_tools: before.optimized_tools,
    },
    after: {
      workflow_id: after.workflow_id,
      agent_readiness_score: after.agent_readiness_score,
      score_breakdown: after.score_breakdown,
      summary: after.summary,
      issues: after.issues,
      trace: after.trace,
    },
    optimized_tools: optimizedTools,
    registry_updated: applyOptimized,
    narrative: `Agent readiness improved from ${before.agent_readiness_score} to ${after.agent_readiness_score} (+${improvement} points) after applying optimized MCP tool definitions.`,
  };
}

module.exports = {
  runWorkflow,
  compareWorkflow,
  executeWorkflowPipeline,
  loadTools,
};
