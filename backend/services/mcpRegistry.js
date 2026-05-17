/**
 * mcpRegistry.js
 * Read/write MCP tool definitions in data/mcps.json.
 */

const fs = require('fs');
const path = require('path');

const MCPS_PATH = path.join(__dirname, '../data/mcps.json');

/**
 * Load all registered tools.
 */
function loadTools() {
  try {
    const raw = fs.readFileSync(MCPS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.tools || [];
  } catch {
    return [];
  }
}

/**
 * Replace entire registry with a new tool list.
 */
function replaceTools(tools) {
  fs.writeFileSync(MCPS_PATH, JSON.stringify(tools, null, 2), 'utf8');
  return tools;
}

/**
 * Merge uploaded tools into registry (replace by name).
 */
function mergeTools(newTools) {
  const toolMap = new Map(loadTools().map((t) => [t.name, t]));
  newTools.forEach((t) => toolMap.set(t.name, t));
  const merged = Array.from(toolMap.values());
  replaceTools(merged);
  return merged;
}

module.exports = {
  MCPS_PATH,
  loadTools,
  replaceTools,
  mergeTools,
};
