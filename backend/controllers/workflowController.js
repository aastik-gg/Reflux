/**
 * workflowController.js
 * Thin controller layer — validates input, delegates to services, formats errors.
 */

const {
  validateWorkflowRun,
  validateWorkflowCompare,
  validateWorkflowSuite,
} = require('../utils/validationUtils');
const { runWorkflow, compareWorkflow } = require('../services/workflowRunner');
const { runTestSuite, SUITE_PACKS } = require('../services/suiteRunner');

function errorStatus(err) {
  if (err.message.includes('not set') || err.message.includes('not configured')) return 503;
  if (err.message.includes('No MCP tools')) return 400;
  return 500;
}

async function runWorkflowHandler(req, res) {
  try {
    const validation = validateWorkflowRun(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { task, stress = false, mode = 'simulated' } = req.body;
    const result = await runWorkflow({ task, stress: Boolean(stress), mode });
    return res.json(result);
  } catch (err) {
    console.error('[workflowController.runWorkflow]', err);
    return res.status(errorStatus(err)).json({ error: 'Workflow execution failed', details: err.message });
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
    return res.json(result);
  } catch (err) {
    console.error('[workflowController.compareWorkflow]', err);
    return res.status(errorStatus(err)).json({ error: 'Workflow compare failed', details: err.message });
  }
}

async function runSuiteHandler(req, res) {
  try {
    const validation = validateWorkflowSuite(req.body || {});
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const { pack = 'demo', stress = false, mode = 'simulated' } = req.body || {};
    const result = await runTestSuite({ pack, stress: Boolean(stress), mode });
    return res.json({ ...result, available_packs: Object.keys(SUITE_PACKS) });
  } catch (err) {
    console.error('[workflowController.runSuite]', err);
    return res.status(errorStatus(err)).json({ error: 'Suite run failed', details: err.message });
  }
}

async function suiteInfoHandler(_req, res) {
  return res.json({ packs: SUITE_PACKS });
}

module.exports = {
  runWorkflowHandler,
  compareWorkflowHandler,
  runSuiteHandler,
  suiteInfoHandler,
};
