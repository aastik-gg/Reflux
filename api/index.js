/**
 * Vercel serverless entry — mounts the Express app from backend/.
 */
const { ensureRuntimeDirs } = require('../backend/config/paths');

ensureRuntimeDirs();

module.exports = require('../backend/server');
