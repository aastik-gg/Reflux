/**
 * fsUtils.js — ensure parent directories exist before writing files.
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

module.exports = {
  ensureDir,
  ensureDirForFile,
  writeFileEnsuringDir,
};
