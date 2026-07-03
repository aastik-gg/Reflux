/**
 * demoController.js
 * Load curated bad/fixed MCP packs for demos.
 */

const { replaceTools } = require('../services/mcpRegistry');
const { DEMO_BAD_PATH, DEMO_FIXED_PATH } = require('../config/paths');
const { loadJsonFile } = require('../utils/fsUtils');

const DEMO_TASKS = {
  simple: 'Assign user_id 123 to the support queue',
  multi: 'Look up user 123, create a support ticket, assign them to it, then mark the ticket in progress',
};

async function loadBadPack(_req, res) {
  try {
    const tools = loadJsonFile(DEMO_BAD_PATH);
    replaceTools(tools);

    return res.json({
      message: 'Bad demo MCP pack loaded',
      pack: 'bad',
      count: tools.length,
      tools,
      suggested_tasks: DEMO_TASKS,
    });
  } catch (err) {
    console.error('[demoController.loadBadPack]', err);
    return res.status(500).json({ error: 'Failed to load bad demo pack', details: err.message });
  }
}

async function loadFixedPack(_req, res) {
  try {
    const tools = loadJsonFile(DEMO_FIXED_PATH);
    replaceTools(tools);

    return res.json({
      message: 'Fixed demo MCP pack loaded',
      pack: 'fixed',
      count: tools.length,
      tools,
      suggested_tasks: DEMO_TASKS,
    });
  } catch (err) {
    console.error('[demoController.loadFixedPack]', err);
    return res.status(500).json({ error: 'Failed to load fixed demo pack', details: err.message });
  }
}

async function getDemoInfo(_req, res) {
  try {
    const badTools = loadJsonFile(DEMO_BAD_PATH);
    const fixedTools = loadJsonFile(DEMO_FIXED_PATH);

    return res.json({
      packs: {
        bad: {
          name: 'Bad Demo',
          tool_count: badTools.length,
          tools: badTools.map((t) => t.name),
        },
        fixed: {
          name: 'Fixed Demo',
          tool_count: fixedTools.length,
          tools: fixedTools.map((t) => t.name),
        },
      },
      suggested_tasks: DEMO_TASKS,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read demo info', details: err.message });
  }
}

module.exports = { loadBadPack, loadFixedPack, getDemoInfo };
