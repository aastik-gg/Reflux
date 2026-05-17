/**
 * paths.js — writable vs bundled data dirs (local vs Vercel serverless).
 */

const fs = require('fs');
const path = require('path');

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

/** Bundled read-only assets (demo packs) — always in the deployment bundle. */
const BUNDLED_DATA_DIR = path.join(__dirname, '../data');

/** Writable runtime data (gitignored locally; /tmp on Vercel). */
const WRITABLE_DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'mcp-reliability-data')
  : BUNDLED_DATA_DIR;

const GENERATED_DIR = IS_VERCEL
  ? path.join('/tmp', 'mcp-reliability-generated')
  : path.join(__dirname, '../generated');

function ensureRuntimeDirs() {
  if (!IS_VERCEL) return;
  fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(WRITABLE_DATA_DIR, 'reports-archive'), { recursive: true });
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

module.exports = {
  IS_VERCEL,
  BUNDLED_DATA_DIR,
  WRITABLE_DATA_DIR,
  GENERATED_DIR,
  MCPS_PATH: path.join(WRITABLE_DATA_DIR, 'mcps.json'),
  WORKFLOWS_PATH: path.join(WRITABLE_DATA_DIR, 'workflows.json'),
  TRACES_PATH: path.join(WRITABLE_DATA_DIR, 'traces.json'),
  REPORTS_PATH: path.join(WRITABLE_DATA_DIR, 'reports.json'),
  REPORTS_ARCHIVE_DIR: path.join(WRITABLE_DATA_DIR, 'reports-archive'),
  FIX_PATH: path.join(GENERATED_DIR, 'fix.md'),
  DEMO_BAD_PATH: path.join(BUNDLED_DATA_DIR, 'demo-bad-mcps.json'),
  DEMO_FIXED_PATH: path.join(BUNDLED_DATA_DIR, 'demo-fixed-mcps.json'),
  ensureRuntimeDirs,
};
