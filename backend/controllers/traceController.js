/**
 * traceController.js
 * Handles trace retrieval endpoints.
 */

const fs = require('fs');
const { WORKFLOWS_PATH } = require('../config/paths');
const { getTraces, getLatestTrace } = require('../services/traceLogger');

/**
 * GET /api/traces — return all workflow traces with issues and outcomes.
 */
async function getAllTraces(req, res) {
  try {
    const { workflow_id: workflowId } = req.query;
    const traces = getTraces(workflowId || null);

    let workflows = [];
    try {
      workflows = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));
    } catch {
      workflows = [];
    }

    return res.json({
      count: traces.length,
      traces: traces.map((t) => ({
        id: t.id,
        task: t.task,
        run_type: t.run_type || 'primary',
        started_at: t.started_at,
        completed_at: t.completed_at,
        outcome: t.outcome,
        issues: t.issues,
        steps: t.steps,
      })),
      workflows,
    });
  } catch (err) {
    console.error('[traceController.getAllTraces]', err);
    return res.status(500).json({ error: 'Failed to retrieve traces', details: err.message });
  }
}

/**
 * GET /api/traces/latest — return the most recent trace session.
 */
async function getLatest(req, res) {
  try {
    const latest = getLatestTrace();
    if (!latest) {
      return res.status(404).json({ error: 'No traces found. Run a workflow first.' });
    }
    return res.json(latest);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve latest trace', details: err.message });
  }
}

module.exports = {
  getAllTraces,
  getLatest,
};
