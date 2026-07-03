/**
 * fsUtils.js — file system helpers for JSON persistence.
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureDirForFile(filePath) {
  ensureDir(path.dirname(filePath));
}

function writeFileEnsuringDir(filePath, content, encoding = 'utf8') {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, content, encoding);
}

function loadJsonFile(filePath, defaultValue = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function saveJsonFile(filePath, data) {
  writeFileEnsuringDir(filePath, JSON.stringify(data, null, 2));
}

function sanitizeTools(tools) {
  return (tools || []).map(({ name, description, parameters, examples }) => ({
    name,
    description,
    parameters: parameters || {},
    ...(examples ? { examples } : {}),
  }));
}

module.exports = {
  ensureDir,
  ensureDirForFile,
  writeFileEnsuringDir,
  loadJsonFile,
  saveJsonFile,
  sanitizeTools,
};
