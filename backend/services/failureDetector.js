/**
 * failureDetector.js
 * Rule-based detection of MCP reliability issues from workflow traces.
 */

const { getExpectedParams } = require('../utils/schemaUtils');
const { getNamingSuggestions, NAMING_SUGGESTIONS } = require('./toolExecutor');
const { detectInstability } = require('../utils/trajectoryUtils');

/**
 * A) Detect hallucinated / mismatched parameters.
 */
function detectHallucinatedParams(trace, tools) {
  const issues = [];

  for (const step of trace) {
    const tool = tools.find((t) => t.name === step.tool);
    if (!tool) continue;

    const expected = getExpectedParams(tool);
    const provided = Object.keys(step.args || {});
    const unexpected = provided.filter((k) => !expected.includes(k));

    if (unexpected.length > 0) {
      for (const param of unexpected) {
        const likelyMatch = expected.find(
          (e) =>
            NAMING_SUGGESTIONS[e] === param ||
            param.includes(e) ||
            e.includes(param.replace(/_id$/, ''))
        );
        issues.push({
          type: 'hallucinated_parameter',
          severity: 'high',
          tool: step.tool,
          step: step.step,
          message: `AI generated "${param}" instead of expected parameter(s): ${expected.join(', ')}`,
          expected_params: expected,
          received_params: provided,
          suggested_fix: likelyMatch
            ? `Rename "${likelyMatch}" to "${param}" or accept "${param}" as an alias.`
            : `Clarify parameter names in tool schema and documentation.`,
        });
      }
    }

    if (!step.success && step.error && step.error.includes('Missing required')) {
      issues.push({
        type: 'missing_parameter',
        severity: 'high',
        tool: step.tool,
        step: step.step,
        message: step.error,
        expected_params: expected,
        received_params: provided,
      });
    }
  }

  return issues;
}

/**
 * B) Detect retry loops (same tool called 3+ times or alternating failures).
 */
function detectRetryLoops(trace) {
  const issues = [];
  const toolCounts = {};

  for (const step of trace) {
    toolCounts[step.tool] = (toolCounts[step.tool] || 0) + 1;
  }

  for (const [tool, count] of Object.entries(toolCounts)) {
    if (count >= 3) {
      issues.push({
        type: 'retry_loop',
        severity: 'medium',
        tool,
        message: `Tool "${tool}" was called ${count} times, indicating a retry loop.`,
        call_count: count,
        suggested_fix: 'Improve error messages and add examples showing correct parameter usage.',
      });
    }
  }

  const consecutiveFailures = trace.filter((s) => !s.success).length;
  if (consecutiveFailures >= 2 && trace.length >= 3) {
    const failedTools = [...new Set(trace.filter((s) => !s.success).map((s) => s.tool))];
    issues.push({
      type: 'retry_loop',
      severity: 'medium',
      tool: failedTools.join(', '),
      message: `${consecutiveFailures} failed steps detected across tools: ${failedTools.join(', ')}`,
      suggested_fix: 'Add worked examples and clearer parameter descriptions to break retry cycles.',
    });
  }

  return issues;
}

/**
 * C) Detect ambiguous parameter naming (short/opaque names).
 */
function detectAmbiguousNaming(tools) {
  const issues = [];
  const ambiguousPatterns = /^(uid|tid|qid|pid|ref|id|sid|nid)$/;

  for (const tool of tools) {
    const suggestions = getNamingSuggestions(tool);
    const ambiguous = Object.keys(tool.parameters || {}).filter((p) => ambiguousPatterns.test(p));

    if (ambiguous.length > 0) {
      issues.push({
        type: 'ambiguous_naming',
        severity: 'medium',
        tool: tool.name,
        message: `Tool "${tool.name}" uses ambiguous parameter names: ${ambiguous.join(', ')}`,
        ambiguous_params: ambiguous,
        suggested_renames: suggestions,
        suggested_fix: Object.entries(suggestions)
          .map(([from, to]) => `Rename "${from}" → "${to}"`)
          .join('; '),
      });
    }
  }

  return issues;
}

/**
 * D) Detect weak documentation (short/vague descriptions, no examples).
 */
function detectWeakDocumentation(tools) {
  const issues = [];

  for (const tool of tools) {
    const desc = tool.description || '';
    const hasExamples = tool.examples && tool.examples.length > 0;
    const paramCount = Object.keys(tool.parameters || {}).length;
    const isVeryShort = desc.length < 20;
    const isShort = desc.length < 40;
    const missingExamples = !hasExamples && paramCount > 0;

    if (isVeryShort) {
      issues.push({
        type: 'weak_documentation',
        severity: 'high',
        tool: tool.name,
        message: `Tool "${tool.name}" has a near-empty description ("${desc}"). Agents will guess what it does.`,
        suggested_fix: 'Write a clear description explaining what the tool does, its parameters, and when to use it.',
      });
    } else if (isShort || missingExamples) {
      issues.push({
        type: 'weak_documentation',
        severity: 'medium',
        tool: tool.name,
        message: `Tool "${tool.name}" has weak documentation (${desc.length} chars, examples: ${hasExamples ? 'yes' : 'no'}).`,
        suggested_fix: 'Expand description with use cases, expected inputs/outputs, and at least one example payload.',
      });
    }
  }

  return issues;
}

/**
 * F) Detect when description mentions parameter names that differ from schema.
 * e.g. description says "user_id" but schema param is "uid"
 */
function detectDescriptionSchemaMismatch(tools) {
  const issues = [];
  const descParamPattern = /\b([a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)+)\b/gi;

  for (const tool of tools) {
    const description = tool.description || '';
    const schemaParams = getExpectedParams(tool);
    if (!description || schemaParams.length === 0) continue;

    const mentioned = [
      ...new Set(
        (description.match(descParamPattern) || []).map((m) => m.toLowerCase())
      ),
    ];

    for (const name of mentioned) {
      if (schemaParams.includes(name)) continue;

      // Description references a name that maps to a schema param via known aliases
      const conflictingSchemaParam = schemaParams.find(
        (p) => NAMING_SUGGESTIONS[p] === name
      );

      if (conflictingSchemaParam) {
        issues.push({
          type: 'description_schema_mismatch',
          severity: 'high',
          tool: tool.name,
          message: `Description mentions "${name}" but schema parameter is "${conflictingSchemaParam}". Agents may follow the description instead of the schema.`,
          mentioned_in_description: name,
          schema_param: conflictingSchemaParam,
          schema_params: schemaParams,
          suggested_fix: `Align description and schema: rename "${conflictingSchemaParam}" to "${name}" in the schema, or update the description to say "${conflictingSchemaParam}".`,
        });
      }
    }
  }

  return issues;
}

/**
 * E) Detect workflow instability across multiple runs.
 */
function detectWorkflowInstability(runTraces) {
  const result = detectInstability(runTraces);

  if (result.unstable) {
    return [
      {
        type: 'workflow_instability',
        severity: 'high',
        message: result.details,
        similarity: result.similarity,
        suggested_fix: 'Standardize tool outputs and reduce non-deterministic behavior in tool responses.',
      },
    ];
  }

  return [];
}

/**
 * Run all detectors and deduplicate issues.
 */
function detectAll({ trace, tools, runTraces }) {
  const all = [
    ...detectHallucinatedParams(trace, tools),
    ...detectRetryLoops(trace),
    ...detectAmbiguousNaming(tools),
    ...detectWeakDocumentation(tools),
    ...detectDescriptionSchemaMismatch(tools),
    ...detectWorkflowInstability(runTraces || []),
  ];

  // Deduplicate by type+tool+message
  const seen = new Set();
  return all.filter((issue) => {
    const key = `${issue.type}:${issue.tool || ''}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = {
  detectHallucinatedParams,
  detectRetryLoops,
  detectAmbiguousNaming,
  detectWeakDocumentation,
  detectDescriptionSchemaMismatch,
  detectWorkflowInstability,
  detectAll,
};
