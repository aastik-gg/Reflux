/**
 * paths.js — data and generated file paths.
 */

const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GENERATED_DIR = path.join(__dirname, '../generated');

module.exports = {
  DATA_DIR,
  GENERATED_DIR,
  MCPS_PATH: path.join(DATA_DIR, 'mcps.json'),
  WORKFLOWS_PATH: path.join(DATA_DIR, 'workflows.json'),
  TRACES_PATH: path.join(DATA_DIR, 'traces.json'),
  REPORTS_PATH: path.join(DATA_DIR, 'reports.json'),
  REPORTS_ARCHIVE_DIR: path.join(DATA_DIR, 'reports-archive'),
  FIX_PATH: path.join(GENERATED_DIR, 'fix.md'),
  DEMO_BAD_PATH: path.join(DATA_DIR, 'demo-bad-mcps.json'),
  DEMO_FIXED_PATH: path.join(DATA_DIR, 'demo-fixed-mcps.json'),
};
