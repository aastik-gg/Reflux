/**
 * traceController.js
 * Handles trace retrieval endpoints.
 */

const { getTraces, getLatestTrace } = require('../services/traceLogger');
const { loadWorkflows } = require('../services/workflowStore');

async function getAllTraces(req, res) {
  try {
    const { workflow_id: workflowId } = req.query;
    const traces = getTraces(workflowId || null);

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
      workflows: loadWorkflows(),
    });
  } catch (err) {
    console.error('[traceController.getAllTraces]', err);
    return res.status(500).json({ error: 'Failed to retrieve traces', details: err.message });
  }
}

async function getLatest(_req, res) {
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

module.exports = { getAllTraces, getLatest };
