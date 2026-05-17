/**
 * readinessScore.js
 * Computes Agent Readiness Score (0–100) from trace + detected issues.
 */

const { detectInstability } = require('../utils/trajectoryUtils');

/** Issue types observed during execution (trace-based). */
const RUNTIME_ISSUE_TYPES = new Set([
  'hallucinated_parameter',
  'missing_parameter',
  'retry_loop',
  'workflow_instability',
]);

/** Issue types from static MCP design analysis. */
const DESIGN_ISSUE_TYPES = new Set([
  'ambiguous_naming',
  'weak_documentation',
  'description_schema_mismatch',
]);

const SEVERITY_PENALTY = { high: 12, medium: 7, low: 3 };

/**
 * Clamp value between min and max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Split issues into runtime vs design categories.
 */
function categorizeIssues(issues) {
  const runtime = [];
  const design = [];

  for (const issue of issues || []) {
    if (RUNTIME_ISSUE_TYPES.has(issue.type)) runtime.push(issue);
    else if (DESIGN_ISSUE_TYPES.has(issue.type)) design.push(issue);
    else design.push(issue);
  }

  return { all: issues || [], runtime, design };
}

/**
 * Sum severity penalties capped at maxDeduction.
 */
function penaltyFromIssues(issueList, maxDeduction) {
  let penalty = 0;
  for (const issue of issueList) {
    penalty += SEVERITY_PENALTY[issue.severity] || 5;
  }
  return Math.min(penalty, maxDeduction);
}

/**
 * Compute Agent Readiness Score and breakdown.
 */
function calculateReadinessScore({ trace, issues, workflowSuccessRate, runTraces }) {
  const { runtime, design } = categorizeIssues(issues);
  const steps = trace || [];
  const failedSteps = steps.filter((s) => !s.success).length;
  const retries = steps.filter((s) => s.is_retry).length;

  // --- Runtime success (max 40) ---
  let runtimeSuccess = Math.round((workflowSuccessRate || 0) * 40);
  runtimeSuccess -= failedSteps * 10;
  runtimeSuccess -= retries * 5;
  runtimeSuccess = clamp(runtimeSuccess, 0, 40);

  // --- Parameter clarity (max 30) ---
  const paramIssues = [
    ...runtime.filter((i) =>
      ['hallucinated_parameter', 'missing_parameter', 'description_schema_mismatch'].includes(i.type)
    ),
    ...design.filter((i) =>
      ['ambiguous_naming', 'description_schema_mismatch'].includes(i.type)
    ),
  ];
  let parameterClarity = 30 - penaltyFromIssues(paramIssues, 30);
  parameterClarity = clamp(parameterClarity, 0, 30);

  // --- Documentation quality (max 20) ---
  const docIssues = design.filter((i) => i.type === 'weak_documentation');
  let documentation = 20 - penaltyFromIssues(docIssues, 20);
  documentation = clamp(documentation, 0, 20);

  // --- Stability (max 10) ---
  let stability = 10;
  const instability = detectInstability(runTraces || []);
  if (instability.unstable) stability -= 6;
  stability -= penaltyFromIssues(
    runtime.filter((i) => i.type === 'retry_loop' || i.type === 'workflow_instability'),
    10
  );
  stability = clamp(stability, 0, 10);

  const scoreBreakdown = {
    runtime_success: runtimeSuccess,
    parameter_clarity: parameterClarity,
    documentation,
    stability,
  };

  const agentReadinessScore = clamp(
    runtimeSuccess + parameterClarity + documentation + stability,
    0,
    100
  );

  return {
    agent_readiness_score: agentReadinessScore,
    score_breakdown: scoreBreakdown,
    issues: { runtime, design },
  };
}

module.exports = {
  calculateReadinessScore,
  categorizeIssues,
  RUNTIME_ISSUE_TYPES,
  DESIGN_ISSUE_TYPES,
};
