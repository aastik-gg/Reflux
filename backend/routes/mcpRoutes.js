/**
 * mcpRoutes.js
 */

const express = require('express');
const {
  uploadTools,
  replaceToolsHandler,
  listTools,
  connectMcp,
  disconnectMcp,
  getMcpConnection,
  syncMcpTools,
  applyOptimizedHandler,
} = require('../controllers/mcpController');

const router = express.Router();

router.get('/connection', getMcpConnection);
router.post('/connect', connectMcp);
router.post('/disconnect', disconnectMcp);
router.post('/sync', syncMcpTools);
router.post('/apply-optimized', applyOptimizedHandler);
router.post('/upload', uploadTools);
router.post('/replace', replaceToolsHandler);
router.get('/', listTools);

module.exports = router;
