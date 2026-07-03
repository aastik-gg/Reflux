/**
 * mcpRegistry.js
 * Read/write MCP tool definitions in data/mcps.json.
 */

const { MCPS_PATH } = require('../config/paths');
const { loadJsonFile, saveJsonFile } = require('../utils/fsUtils');

function loadTools() {
  const data = loadJsonFile(MCPS_PATH, []);
  return Array.isArray(data) ? data : data.tools || [];
}

function replaceTools(tools) {
  saveJsonFile(MCPS_PATH, tools);
  return tools;
}

function mergeTools(newTools) {
  const toolMap = new Map(loadTools().map((t) => [t.name, t]));
  newTools.forEach((t) => toolMap.set(t.name, t));
  const merged = Array.from(toolMap.values());
  replaceTools(merged);
  return merged;
}

module.exports = { MCPS_PATH, loadTools, replaceTools, mergeTools };
