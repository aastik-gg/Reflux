/**
 * suiteRunner.js
 * Run multiple canned workflow tasks and aggregate readiness scores.
 */

const { v4: uuidv4 } = require('uuid');
const { executeWorkflowPipeline } = require('./workflowRunner');
const { loadTools } = require('./mcpRegistry');
const { isMcpConnected } = require('./mcpConnection');

const SUITE_PACKS = {
  demo: [
    {
      id: 'assign_queue',
      task: 'Assign user_id 123 to the support queue',
    },
    {
      id: 'get_user',
      task: 'Get user 123',
    },
  ],
  full: [
    {
      id: 'assign_queue',
      task: 'Assign user_id 123 to the support queue',
    },
    {
      id: 'get_user',
      task: 'Get user 123',
    },
    {
      id: 'multi_step',
      task:
        'Look up user 123, create a support ticket, assign them to it, then mark the ticket in progress',
    },
  ],
};

/**
 * Run a test suite of workflow tasks.
 */
async function runTestSuite({ pack = 'demo', stress = false, mode = 'simulated' }) {
  const tasks = SUITE_PACKS[pack];
  if (!tasks) {
    throw new Error(`Unknown suite pack "${pack}". Available: ${Object.keys(SUITE_PACKS).join(', ')}`);
  }

  const tools = loadTools();
  if (tools.length === 0) {
    throw new Error('No MCP tools registered. Load or connect MCP tools first.');
  }

  if (mode === 'real' && !isMcpConnected()) {
    throw new Error('mode "real" requires an active MCP connection. POST /api/mcp/connect first.');
  }

  const suiteId = uuidv4();
  const results = [];
  let totalScore = 0;
  let totalIssues = 0;

  for (const item of tasks) {
    const result = await executeWorkflowPipeline({
      task: item.task,
      tools,
      stress,
      mode,
      persistTrace: true,
      generateReport: false,
      runStability: false,
      phase: `suite-${item.id}`,
    });

    results.push({
      id: item.id,
      task: item.task,
      workflow_id: result.workflow_id,
      agent_readiness_score: result.agent_readiness_score,
      workflow_success_rate: result.workflow_success_rate,
      task_completed: result.task_completed,
      issues_count: result.issues_detected.length,
    });

    totalScore += result.agent_readiness_score;
    totalIssues += result.issues_detected.length;
  }

  const count = results.length;
  const averageScore = count > 0 ? Math.round(totalScore / count) : 0;

  return {
    suite_id: suiteId,
    pack,
    mode,
    stress,
    tasks_run: count,
    average_agent_readiness_score: averageScore,
    total_issues_detected: totalIssues,
    results,
    summary:
      `Ran ${count} tasks in "${pack}" suite (mode: ${mode}). Average readiness: ${averageScore}/100.`,
  };
}

module.exports = {
  runTestSuite,
  SUITE_PACKS,
};
