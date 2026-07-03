/**
 * evaluator.js
 * LLM-based analysis of workflow traces to infer root causes and confusion points.
 */

const { textCompletion } = require('./llmService');

const SYSTEM_PROMPT = `Analyze MCP tool workflow traces. Identify why the AI agent struggled. Respond in JSON only:
{"confusion_points":[{"step":0,"tool":"","why":""}],"root_causes":[""],"documentation_gaps":[""],"parameter_confusion":[{"tool":"","confused_param":"","expected_param":""}],"retry_analysis":"","overall_assessment":""}`;

/**
 * Analyze traces using LLM and merge with rule-based issues.
 */
async function evaluate({ task, trace, issues, tools }) {
  const payload = {
    task,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    trace: trace.map((s) => ({
      step: s.step,
      tool: s.tool,
      args: s.args,
      success: s.success,
      error: s.error,
      is_retry: s.is_retry,
    })),
    rule_based_issues: issues,
  };

  try {
    const raw = await textCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Analyze:\n${JSON.stringify(payload)}`,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      source: 'llm',
      ...parsed,
    };
  } catch (err) {
    // Fallback when LLM is unavailable or returns invalid JSON
    return {
      source: 'fallback',
      confusion_points: trace
        .filter((s) => !s.success)
        .map((s) => ({
          step: s.step,
          tool: s.tool,
          why: s.error || 'Tool call failed',
        })),
      root_causes: issues.map((i) => i.message),
      documentation_gaps: issues
        .filter((i) => i.type === 'weak_documentation')
        .map((i) => i.message),
      parameter_confusion: issues
        .filter((i) => i.type === 'hallucinated_parameter')
        .map((i) => ({
          tool: i.tool,
          confused_param: (i.received_params || []).find((p) => !(i.expected_params || []).includes(p)),
          expected_param: (i.expected_params || [])[0],
        })),
      retry_analysis: issues.find((i) => i.type === 'retry_loop')?.message || 'No significant retries.',
      overall_assessment: `Workflow completed with ${issues.length} detected issue(s). ${err.message}`,
    };
  }
}

module.exports = {
  evaluate,
  SYSTEM_PROMPT,
};
