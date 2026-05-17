/**
 * reportController.js
 * Retrieve optimization reports by workflow ID.
 */

const { listReports, getReportByWorkflowId } = require('../services/reportStore');

/**
 * GET /api/reports — list all report metadata.
 */
async function listReportsHandler(_req, res) {
  try {
    const reports = listReports();
    return res.json({
      count: reports.length,
      reports,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list reports', details: err.message });
  }
}

/**
 * GET /api/reports/:workflowId — full report for one workflow.
 */
async function getReportHandler(req, res) {
  try {
    const { workflowId } = req.params;
    const report = getReportByWorkflowId(workflowId);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        details: `No report for workflow_id "${workflowId}". Run a workflow first.`,
      });
    }

    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve report', details: err.message });
  }
}

module.exports = {
  listReportsHandler,
  getReportHandler,
};
