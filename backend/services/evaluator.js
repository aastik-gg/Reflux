/**
 * evaluator.js
 * LLM-based analysis of workflow traces to infer root causes and confusion points.
 */

const { textCompletion } = require('./openaiService');

const SYSTEM_PROMPT = `You are an expert MCP (Model Context Protocol) reliability analyst.
You analyze workflow execution traces from autonomous AI agents using MCP tools.
Your job is to identify where and why the AI agent struggled, focusing on:
- parameter naming confusion
- missing or weak documentation
- retry behavior
- inconsistent tool outputs
- workflow design issues

Respond in valid JSON only with this structure:
{
  "confusion_points": [{ "step": number, "tool": string, "why": string }],
  "root_causes": [string],
  "documentation_gaps": [string],
  "parameter_confusion": [{ "tool": string, "confused_param": string, "expected_param": string }],
  "retry_analysis": string,
  "overall_assessment": string
}`;

/**
 * Analyze traces using OpenAI and merge with rule-based issues.
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
      userPrompt: `Analyze this MCP workflow test:\n\n${JSON.stringify(payload, null, 2)}`,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return {
      source: 'openai',
      ...parsed,
    };
  } catch (err) {
    // Fallback when OpenAI is unavailable or returns invalid JSON
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
