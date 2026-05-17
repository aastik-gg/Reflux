/**
 * toolOptimizer.js
 * Generates agent-friendly MCP tool definitions from detected issues.
 */

const { getExpectedParams } = require('../utils/schemaUtils');
const { NAMING_SUGGESTIONS } = require('./toolExecutor');

/**
 * Build a rename map for one tool from relevant issues.
 */
function buildRenameMap(toolName, issues) {
  const renames = {};

  for (const issue of issues) {
    if (issue.tool !== toolName) continue;

    if (issue.suggested_renames) {
      Object.assign(renames, issue.suggested_renames);
    }

    if (issue.type === 'description_schema_mismatch' && issue.schema_param && issue.mentioned_in_description) {
      renames[issue.schema_param] = issue.mentioned_in_description;
    }
  }

  // Default suggestions for common ambiguous params not caught by detectors
  const toolIssues = issues.filter((i) => i.tool === toolName);
  if (toolIssues.length === 0) return renames;

  return renames;
}

/**
 * Apply parameter renames to a parameters object.
 */
function renameParameters(parameters, renames) {
  const next = {};
  for (const [key, value] of Object.entries(parameters || {})) {
    const newKey = renames[key] || key;
    next[newKey] = value;
  }
  return next;
}

/**
 * Build example argument object for optimized tool.
 */
function buildExampleArgs(parameters) {
  const example = {};
  for (const key of Object.keys(parameters || {})) {
    if (key.includes('id') || key === 'uid' || key === 'tid' || key === 'ref') {
      example[key] = '123';
    } else if (key === 'status') {
      example[key] = 'in_progress';
    } else if (key === 'priority') {
      example[key] = 'high';
    } else if (key === 'title') {
      example[key] = 'Support request';
    } else {
      example[key] = 'example_value';
    }
  }
  return example;
}

/**
 * Expand tool description for agent readability.
 */
function buildImprovedDescription(tool, parameters) {
  const paramList = Object.keys(parameters).join(', ') || 'none';
  const base = tool.description || `Execute ${tool.name}`;
  const cleaned = base.replace(/\b(user_id|ticket_id|queue_id)\b/gi, (m) => m.toLowerCase());

  return (
    `${tool.name}: ${cleaned}. ` +
    `Use when you need to perform this action via MCP. ` +
    `Required parameters: ${paramList}. ` +
    `Always pass exact parameter names from the schema.`
  );
}

/**
 * Optimize a single tool definition.
 */
function optimizeTool(tool, issues) {
  const toolIssues = issues.filter((i) => i.tool === tool.name);
  const renames = buildRenameMap(tool.name, toolIssues);

  // Apply default naming suggestions for known ambiguous params
  for (const param of getExpectedParams(tool)) {
    if (NAMING_SUGGESTIONS[param] && !Object.values(renames).includes(NAMING_SUGGESTIONS[param])) {
      if (!renames[param]) renames[param] = NAMING_SUGGESTIONS[param];
    }
    if (param === 'qid' && !renames.qid) renames.qid = 'queue_id';
  }

  const parameters = renameParameters(tool.parameters, renames);
  const description = buildImprovedDescription(
    { ...tool, description: alignDescription(tool.description, renames) },
    parameters
  );
  const examples = [buildExampleArgs(parameters)];

  return {
    name: tool.name,
    description,
    parameters,
    examples,
    _optimized_from: {
      original_parameters: tool.parameters,
      renames_applied: renames,
    },
  };
}

/**
 * Replace old param names in description text when renames are applied.
 */
function alignDescription(description, renames) {
  let text = description || '';
  for (const [from, to] of Object.entries(renames)) {
    const re = new RegExp(`\\b${from}\\b`, 'g');
    text = text.replace(re, to);
  }
  return text;
}

/**
 * Generate optimized tools for the full registry.
 */
function generateOptimizedTools(tools, issues) {
  return (tools || []).map((tool) => optimizeTool(tool, issues || []));
}

module.exports = {
  generateOptimizedTools,
  optimizeTool,
  buildRenameMap,
  buildExampleArgs,
};
