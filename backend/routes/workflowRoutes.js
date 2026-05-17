/**
 * workflowRoutes.js
 */

const express = require('express');
const {
  runWorkflowHandler,
  compareWorkflowHandler,
  runSuiteHandler,
  suiteInfoHandler,
} = require('../controllers/workflowController');

const router = express.Router();

router.get('/suite/info', suiteInfoHandler);
router.post('/suite', runSuiteHandler);
router.post('/run', runWorkflowHandler);
router.post('/compare', compareWorkflowHandler);

module.exports = router;
