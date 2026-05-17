/**
 * reportRoutes.js
 */

const express = require('express');
const { listReportsHandler, getReportHandler } = require('../controllers/reportController');

const router = express.Router();

router.get('/', listReportsHandler);
router.get('/:workflowId', getReportHandler);

module.exports = router;
