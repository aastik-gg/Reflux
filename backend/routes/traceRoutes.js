/**
 * traceRoutes.js
 * Routes for trace retrieval.
 */

const express = require('express');
const { getAllTraces, getLatest } = require('../controllers/traceController');

const router = express.Router();

router.get('/', getAllTraces);
router.get('/latest', getLatest);

module.exports = router;
