/**
 * validationUtils.js
 */

function validateMcpUpload(body) {
  const errors = [];

  if (!body || !Array.isArray(body.tools)) {
    errors.push('Request body must include a "tools" array.');
    return { valid: false, errors };
  }

  if (body.tools.length === 0) {
    errors.push('At least one tool definition is required.');
  }

  body.tools.forEach((tool, i) => {
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push(`Tool at index ${i} must have a string "name".`);
    }
    if (!tool.description || typeof tool.description !== 'string') {
      errors.push(`Tool "${tool.name || i}" must have a string "description".`);
    }
    if (!tool.parameters || typeof tool.parameters !== 'object') {
      errors.push(`Tool "${tool.name || i}" must have a "parameters" object.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateWorkflowRun(body) {
  const errors = [];

  if (!body || typeof body.task !== 'string' || body.task.trim() === '') {
    errors.push('Request body must include a non-empty "task" string.');
  }

  if (body.stress !== undefined && typeof body.stress !== 'boolean') {
    errors.push('"stress" must be a boolean if provided.');
  }

  if (body.mode !== undefined && !['simulated', 'real'].includes(body.mode)) {
    errors.push('"mode" must be "simulated" or "real".');
  }

  return { valid: errors.length === 0, errors };
}

function validateWorkflowCompare(body) {
  const base = validateWorkflowRun(body);
  if (!base.valid) return base;

  if (body.apply_optimized !== undefined && typeof body.apply_optimized !== 'boolean') {
    return { valid: false, errors: ['"apply_optimized" must be a boolean if provided.'] };
  }

  return { valid: true, errors: [] };
}

function validateMcpConnect(body) {
  const errors = [];
  if (!body) {
    return { valid: false, errors: ['Request body required.'] };
  }

  if (!body.preset && !body.command) {
    errors.push('Provide "preset" (e.g. "ticket-demo") or "command" + "args".');
  }

  if (body.args && !Array.isArray(body.args)) {
    errors.push('"args" must be an array.');
  }

  return { valid: errors.length === 0, errors };
}

function validateApplyOptimized(body) {
  const errors = [];
  if (!body) {
    return { valid: false, errors: ['Request body required.'] };
  }

  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  const hasWorkflowId = Boolean(body.workflow_id);
  const useLast = Boolean(body.use_last_workflow);
  const regenerate = Boolean(body.regenerate_from_current);

  if (!hasTools && !hasWorkflowId && !useLast && !regenerate) {
    errors.push(
      'Provide "tools", "workflow_id", "use_last_workflow": true, or "regenerate_from_current": true'
    );
  }

  return { valid: errors.length === 0, errors };
}

function validateWorkflowSuite(body) {
  const errors = [];

  if (body?.pack && !['demo', 'full'].includes(body.pack)) {
    errors.push('"pack" must be "demo" or "full".');
  }

  if (body?.stress !== undefined && typeof body.stress !== 'boolean') {
    errors.push('"stress" must be a boolean.');
  }

  if (body?.mode !== undefined && !['simulated', 'real'].includes(body.mode)) {
    errors.push('"mode" must be "simulated" or "real".');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateMcpUpload,
  validateWorkflowRun,
  validateWorkflowCompare,
  validateMcpConnect,
  validateApplyOptimized,
  validateWorkflowSuite,
};
