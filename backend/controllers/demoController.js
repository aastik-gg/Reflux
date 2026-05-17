/**
 * demoController.js
 * Load curated bad/fixed MCP packs for reliable demos.
 */

const fs = require('fs');
const path = require('path');
const { replaceTools } = require('../services/mcpRegistry');

const BAD_PACK_PATH = path.join(__dirname, '../data/demo-bad-mcps.json');
const FIXED_PACK_PATH = path.join(__dirname, '../data/demo-fixed-mcps.json');

const DEMO_TASKS = {
  bad: 'Assign user_id 123 to the support queue',
  fixed: 'Assign user_id 123 to the support queue',
  multi: 'Look up user 123, create a support ticket, assign them to it, then mark the ticket in progress',
};

/**
 * Load a demo pack JSON file.
 */
function loadPack(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * POST /api/demo/load-bad — load intentionally poor MCP tools.
 */
async function loadBadPack(req, res) {
  try {
    const tools = loadPack(BAD_PACK_PATH);
    replaceTools(tools);

    return res.status(200).json({
      message: 'Bad demo MCP pack loaded',
      pack: 'bad',
      count: tools.length,
      tools,
      suggested_tasks: {
        simple: DEMO_TASKS.bad,
        multi_step: DEMO_TASKS.multi,
      },
      next_steps: [
        'POST /api/workflow/run with suggested task',
        'Note agent_readiness_score (expect lower)',
        'POST /api/demo/load-fixed then re-run same task to compare',
      ],
    });
  } catch (err) {
    console.error('[demoController.loadBadPack]', err);
    return res.status(500).json({ error: 'Failed to load bad demo pack', details: err.message });
  }
}

/**
 * POST /api/demo/load-fixed — load agent-optimized MCP tools.
 */
async function loadFixedPack(req, res) {
  try {
    const tools = loadPack(FIXED_PACK_PATH);
    replaceTools(tools);

    return res.status(200).json({
      message: 'Fixed demo MCP pack loaded',
      pack: 'fixed',
      count: tools.length,
      tools,
      suggested_tasks: {
        simple: DEMO_TASKS.fixed,
        multi_step: DEMO_TASKS.multi,
      },
      next_steps: [
        'POST /api/workflow/run with the same task as before',
        'Compare agent_readiness_score (expect higher than bad pack)',
      ],
    });
  } catch (err) {
    console.error('[demoController.loadFixedPack]', err);
    return res.status(500).json({ error: 'Failed to load fixed demo pack', details: err.message });
  }
}

/**
 * GET /api/demo/info — describe available demo packs.
 */
async function getDemoInfo(req, res) {
  try {
    const badTools = loadPack(BAD_PACK_PATH);
    const fixedTools = loadPack(FIXED_PACK_PATH);

    return res.json({
      packs: {
        bad: {
          endpoint: 'POST /api/demo/load-bad',
          tool_count: badTools.length,
          tools: badTools.map((t) => t.name),
          suggested_task: DEMO_TASKS.bad,
        },
        fixed: {
          endpoint: 'POST /api/demo/load-fixed',
          tool_count: fixedTools.length,
          tools: fixedTools.map((t) => t.name),
          suggested_task: DEMO_TASKS.fixed,
        },
      },
      demo_flow: [
        '1. POST /api/demo/load-bad',
        '2. POST /api/workflow/run → save agent_readiness_score',
        '3. POST /api/demo/load-fixed (or POST /api/mcp/replace with optimized_tools)',
        '4. POST /api/workflow/run → compare scores',
      ],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read demo info', details: err.message });
  }
}

module.exports = {
  loadBadPack,
  loadFixedPack,
  getDemoInfo,
};
