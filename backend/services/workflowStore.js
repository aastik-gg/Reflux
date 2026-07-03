/**
 * workflowStore.js
 * Centralized persistence for workflow records.
 */

const { WORKFLOWS_PATH } = require('../config/paths');
const { loadJsonFile, saveJsonFile } = require('../utils/fsUtils');

function loadWorkflows() {
  return loadJsonFile(WORKFLOWS_PATH, []);
}

function saveWorkflow(record) {
  const workflows = loadWorkflows();
  workflows.push(record);
  saveJsonFile(WORKFLOWS_PATH, workflows);
}

function getWorkflowById(workflowId) {
  return loadWorkflows().find((w) => w.id === workflowId) || null;
}

function getLastWorkflowWithOptimized() {
  const workflows = loadWorkflows();
  for (let i = workflows.length - 1; i >= 0; i--) {
    if (workflows[i].optimized_tools?.length) return workflows[i];
  }
  return null;
}

module.exports = {
  loadWorkflows,
  saveWorkflow,
  getWorkflowById,
  getLastWorkflowWithOptimized,
};
