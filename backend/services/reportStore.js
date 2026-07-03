/**
 * reportStore.js
 * Persist and retrieve optimization reports per workflow ID.
 */

const fs = require('fs');
const path = require('path');
const { REPORTS_PATH, REPORTS_ARCHIVE_DIR } = require('../config/paths');
const { ensureDir, loadJsonFile, saveJsonFile, writeFileEnsuringDir } = require('../utils/fsUtils');

function saveWorkflowReport({
  workflowId, task, fixMarkdown, agentReadinessScore,
  workflowSuccessRate, issuesCount, stress = false, phase = 'single',
}) {
  ensureDir(REPORTS_ARCHIVE_DIR);

  const entry = {
    workflow_id: workflowId,
    task,
    generated_at: new Date().toISOString(),
    agent_readiness_score: agentReadinessScore,
    workflow_success_rate: workflowSuccessRate,
    issues_count: issuesCount,
    stress, phase,
    report_url: `/api/reports/${workflowId}`,
  };

  if (fixMarkdown) {
    writeFileEnsuringDir(path.join(REPORTS_ARCHIVE_DIR, `${workflowId}.md`), fixMarkdown);
    entry.has_markdown = true;
  }

  const reports = loadJsonFile(REPORTS_PATH, []).filter((r) => r.workflow_id !== workflowId);
  reports.push(entry);
  saveJsonFile(REPORTS_PATH, reports);
  return entry;
}

function listReports() {
  return loadJsonFile(REPORTS_PATH, []);
}

function getReportByWorkflowId(workflowId) {
  const meta = loadJsonFile(REPORTS_PATH, []).find((r) => r.workflow_id === workflowId);
  if (!meta) return null;

  const mdPath = path.join(REPORTS_ARCHIVE_DIR, `${workflowId}.md`);
  let fixMarkdown = null;
  if (fs.existsSync(mdPath)) fixMarkdown = fs.readFileSync(mdPath, 'utf8');

  return { ...meta, fix_markdown: fixMarkdown };
}

module.exports = { saveWorkflowReport, listReports, getReportByWorkflowId };
