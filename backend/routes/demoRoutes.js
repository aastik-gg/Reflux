/**
 * demoRoutes.js
 * Routes for curated demo MCP packs.
 */

const express = require('express');
const { loadBadPack, loadFixedPack, getDemoInfo } = require('../controllers/demoController');

const router = express.Router();

router.get('/info', getDemoInfo);
router.post('/load-bad', loadBadPack);
router.post('/load-fixed', loadFixedPack);

module.exports = router;
