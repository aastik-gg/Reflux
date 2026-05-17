/**
 * reportStore.js
 * Persist and retrieve optimization reports per workflow ID.
 */

const fs = require('fs');
const path = require('path');
const { ensureDir, writeFileEnsuringDir } = require('../utils/fsUtils');

const DATA_DIR = path.join(__dirname, '../data');
const REPORTS_PATH = path.join(DATA_DIR, 'reports.json');
const REPORTS_ARCHIVE_DIR = path.join(DATA_DIR, 'reports-archive');

function ensureArchiveDir() {
  ensureDir(REPORTS_ARCHIVE_DIR);
}

function readReportsIndex() {
  try {
    return JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeReportsIndex(reports) {
  writeFileEnsuringDir(REPORTS_PATH, JSON.stringify(reports, null, 2));
}

/**
 * Save report for a workflow run.
 */
function saveWorkflowReport({
  workflowId,
  task,
  fixMarkdown,
  agentReadinessScore,
  workflowSuccessRate,
  issuesCount,
  stress = false,
  phase = 'single',
}) {
  ensureArchiveDir();

  const entry = {
    workflow_id: workflowId,
    task,
    generated_at: new Date().toISOString(),
    agent_readiness_score: agentReadinessScore,
    workflow_success_rate: workflowSuccessRate,
    issues_count: issuesCount,
    stress,
    phase,
    report_url: `/api/reports/${workflowId}`,
  };

  if (fixMarkdown) {
    writeFileEnsuringDir(path.join(REPORTS_ARCHIVE_DIR, `${workflowId}.md`), fixMarkdown);
    entry.has_markdown = true;
  }

  const reports = readReportsIndex().filter((r) => r.workflow_id !== workflowId);
  reports.push(entry);
  writeReportsIndex(reports);

  return entry;
}

/**
 * List reports (metadata only, no markdown body).
 */
function listReports() {
  return readReportsIndex();
}

/**
 * Get full report by workflow ID.
 */
function getReportByWorkflowId(workflowId) {
  const meta = readReportsIndex().find((r) => r.workflow_id === workflowId);
  if (!meta) return null;

  const mdPath = path.join(REPORTS_ARCHIVE_DIR, `${workflowId}.md`);
  let fixMarkdown = null;
  if (fs.existsSync(mdPath)) {
    fixMarkdown = fs.readFileSync(mdPath, 'utf8');
  }

  return {
    ...meta,
    fix_markdown: fixMarkdown,
  };
}

module.exports = {
  saveWorkflowReport,
  listReports,
  getReportByWorkflowId,
};
