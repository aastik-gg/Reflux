/**
 * applyOptimized.js
 * Apply optimized MCP tool definitions to the registry.
 */

const fs = require('fs');
const { WORKFLOWS_PATH } = require('../config/paths');
const { replaceTools, loadTools } = require('./mcpRegistry');
const { generateOptimizedTools } = require('./toolOptimizer');
const { isMcpConnected, syncToolsFromMcp } = require('./mcpConnection');

/**
 * Remove internal metadata fields before saving tools.
 */
function stripToolMetadata(tools) {
  return (tools || []).map((tool) => {
    const clean = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {},
    };
    if (tool.examples) clean.examples = tool.examples;
    return clean;
  });
}

/**
 * Load workflow record by ID.
 */
function getWorkflowById(workflowId) {
  try {
    const workflows = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));
    return workflows.find((w) => w.id === workflowId);
  } catch {
    return null;
  }
}

/**
 * Get most recent workflow with optimized_tools.
 */
function getLastWorkflowWithOptimized() {
  try {
    const workflows = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));
    for (let i = workflows.length - 1; i >= 0; i--) {
      if (workflows[i].optimized_tools?.length) return workflows[i];
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Apply optimized tools to registry.
 */
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
      if (!record) {
        throw new Error('No recent workflow with optimized_tools found.');
      }
      optimized = record.optimized_tools;
      workflowId = record.id;
    } else if (regenerateFromCurrent) {
      const current = loadTools();
      const { detectAll } = require('./failureDetector');
      const issues = detectAll({ trace: [], tools: current, runTraces: [] });
      optimized = generateOptimizedTools(current, issues);
    } else {
      throw new Error(
        'Provide "tools", "workflow_id", "use_last_workflow": true, or "regenerate_from_current": true'
      );
    }
  }

  const cleaned = stripToolMetadata(optimized);
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

module.exports = {
  applyOptimizedTools,
  stripToolMetadata,
  getWorkflowById,
};
