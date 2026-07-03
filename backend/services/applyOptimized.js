/**
 * applyOptimized.js
 * Apply optimized MCP tool definitions to the registry.
 */

const { replaceTools, loadTools } = require('./mcpRegistry');
const { generateOptimizedTools } = require('./toolOptimizer');
const { isMcpConnected, syncToolsFromMcp } = require('./mcpConnection');
const { getWorkflowById, getLastWorkflowWithOptimized } = require('./workflowStore');
const { sanitizeTools } = require('../utils/fsUtils');

async function applyOptimizedTools({
  tools,
  workflowId,
  useLastWorkflow = false,
  regenerateFromCurrent = false,
  syncRealMcp = false,
}) {
  let optimized = tools;

  if (!optimized?.length) {
    if (workflowId) {
      const record = getWorkflowById(workflowId);
      if (!record?.optimized_tools) {
        throw new Error(`No optimized_tools found for workflow_id "${workflowId}".`);
      }
      optimized = record.optimized_tools;
    } else if (useLastWorkflow) {
      const record = getLastWorkflowWithOptimized();
      if (!record) throw new Error('No recent workflow with optimized_tools found.');
      optimized = record.optimized_tools;
      workflowId = record.id;
    } else if (regenerateFromCurrent) {
      const current = loadTools();
      const { detectAll } = require('./failureDetector');
      const issues = detectAll({ trace: [], tools: current, runTraces: [] });
      optimized = generateOptimizedTools(current, issues);
    } else {
      throw new Error('Provide "tools", "workflow_id", "use_last_workflow", or "regenerate_from_current"');
    }
  }

  const cleaned = sanitizeTools(optimized);
  replaceTools(cleaned);

  let realMcpSynced = false;
  if (syncRealMcp && isMcpConnected()) {
    await syncToolsFromMcp();
    realMcpSynced = true;
  }

  return {
    message: 'Optimized tools applied to MCP registry',
    count: cleaned.length,
    tools: cleaned,
    source_workflow_id: workflowId || null,
    real_mcp_resynced: realMcpSynced,
  };
}

module.exports = { applyOptimizedTools };
