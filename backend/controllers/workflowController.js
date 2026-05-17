/**
 * workflowController.js
 */

const {
  validateWorkflowRun,
  validateWorkflowCompare,
  validateWorkflowSuite,
} = require('../utils/validationUtils');
const { runWorkflow, compareWorkflow } = require('../services/workflowRunner');
const { runTestSuite, SUITE_PACKS } = require('../services/suiteRunner');

async function runWorkflowHandler(req, res) {
  try {
    const validation = validateWorkflowRun(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { task, stress = false, mode = 'simulated' } = req.body;
    const result = await runWorkflow({ task, stress: Boolean(stress), mode });

    return res.status(200).json({
      workflow_id: result.workflow_id,
      stress: result.stress,
      mode: result.mode,
      execution_source: result.execution_source,
      task_completed: result.task_completed,
      task_completed_successfully: result.task_completed_successfully,
      agent_final_response: result.agent_final_response,
      summary: result.summary,
      agent_readiness_score: result.agent_readiness_score,
      score_breakdown: result.score_breakdown,
      issues: result.issues,
      trace: result.trace,
      evaluation: result.evaluation,
      optimized_tools: result.optimized_tools,
      apply_optimized_hint: 'POST /api/mcp/apply-optimized with workflow_id or use_last_workflow',
      fix_markdown: result.fix_markdown,
      report_url: result.report_url,
      workflow_success_rate: result.workflow_success_rate,
      issues_detected: result.issues_detected,
    });
  } catch (err) {
    console.error('[workflowController.runWorkflow]', err);
    const status = err.message.includes('LLM API key is not configured') ? 503 : 500;
    return res.status(status).json({ error: 'Workflow execution failed', details: err.message });
  }
}

async function compareWorkflowHandler(req, res) {
  try {
    const validation = validateWorkflowCompare(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { task, stress = false, mode = 'simulated', apply_optimized = false } = req.body;
    const result = await compareWorkflow({
      task,
      stress: Boolean(stress),
      mode,
      applyOptimized: Boolean(apply_optimized),
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[workflowController.compareWorkflow]', err);
    const status = err.message.includes('LLM API key is not configured') ? 503 : 500;
    return res.status(status).json({ error: 'Workflow compare failed', details: err.message });
  }
}

/**
 * POST /api/workflow/suite
 */
async function runSuiteHandler(req, res) {
  try {
    const validation = validateWorkflowSuite(req.body || {});
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { pack = 'demo', stress = false, mode = 'simulated' } = req.body || {};
    const result = await runTestSuite({
      pack,
      stress: Boolean(stress),
      mode,
    });

    return res.status(200).json({
      ...result,
      available_packs: Object.keys(SUITE_PACKS),
    });
  } catch (err) {
    console.error('[workflowController.runSuite]', err);
    const status = err.message.includes('LLM API key is not configured') ? 503 : 500;
    return res.status(status).json({ error: 'Suite run failed', details: err.message });
  }
}

/**
 * GET /api/workflow/suite/info
 */
async function suiteInfoHandler(_req, res) {
  return res.json({
    packs: SUITE_PACKS,
    usage: 'POST /api/workflow/suite with { "pack": "demo"|"full", "mode": "simulated"|"real" }',
  });
}

module.exports = {
  runWorkflowHandler,
  compareWorkflowHandler,
  runSuiteHandler,
  suiteInfoHandler,
};
