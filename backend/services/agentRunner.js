/**
 * agentRunner.js
 * Runs the autonomous OpenAI function-calling loop against simulated MCP tools.
 */

const { chatCompletion } = require('./openaiService');
const { executeTool } = require('./toolExecutor');
const { logStep } = require('./traceLogger');
const { mcpToolsToOpenAI } = require('../utils/schemaUtils');

const MAX_ITERATIONS = 15;

/**
 * Build the system prompt that instructs the agent how to use MCP tools.
 */
function buildSystemPrompt(tools) {
  const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
  return `You are an autonomous AI agent testing MCP (Model Context Protocol) tools.
Your job is to complete the user's task by calling the available tools.

Available tools:
${toolList}

Rules:
- Call tools with the exact parameter names defined in each tool schema.
- If a tool call fails, read the error and retry with corrected arguments.
- Complete the task autonomously without asking the user questions.
- When done, respond with a brief summary of what you accomplished.`;
}

/**
 * Parse tool call arguments safely.
 */
function parseToolArgs(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

/**
 * Detect if the current call is a retry of the same tool+args combo.
 */
function isRetry(steps, toolName, args) {
  const key = JSON.stringify({ tool: toolName, args });
  return steps.some((s) => JSON.stringify({ tool: s.tool, args: s.args }) === key);
}

/**
 * Run the agent loop for a single workflow attempt.
 */
async function runAgent({ task, tools, session, stress = false, mode = 'simulated' }) {
  const openaiTools = mcpToolsToOpenAI(tools);
  const messages = [
    { role: 'system', content: buildSystemPrompt(tools) },
    { role: 'user', content: task },
  ];

  let finished = false;
  let iterations = 0;
  let finalResponse = null;

  while (!finished && iterations < MAX_ITERATIONS) {
    iterations++;

    const assistantMessage = await chatCompletion({ messages, tools: openaiTools });
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      finished = true;
      finalResponse = assistantMessage.content;
      break;
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const args = parseToolArgs(toolCall.function.arguments);
      const toolDef = tools.find((t) => t.name === toolName);

      if (!toolDef) {
        logStep(session, {
          tool: toolName,
          args,
          success: false,
          error: `Unknown tool: ${toolName}`,
          is_retry: false,
          latency_ms: 0,
        });
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
        });
        continue;
      }

      const retry = isRetry(session.steps, toolName, args);
      const result = await executeTool(toolDef, args, { stress, mode });

      logStep(session, {
        tool: toolName,
        args,
        output: result.output,
        success: result.success,
        error: result.error,
        is_retry: retry,
        latency_ms: result.latency_ms,
      });

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(
          result.success
            ? { success: true, data: result.output }
            : { success: false, error: result.error }
        ),
      });
    }
  }

  const successSteps = session.steps.filter((s) => s.success).length;
  const totalSteps = session.steps.length;
  const workflowSuccess = finished && successSteps > 0 && session.steps.every((s) => s.success);

  // Agent claimed completion (final text response) vs all tool steps succeeding
  const taskCompleted = Boolean(
    finished && finalResponse && String(finalResponse).trim().length > 0
  );
  const taskCompletedSuccessfully = taskCompleted && workflowSuccess;

  return {
    finished,
    iterations,
    finalResponse,
    workflowSuccess,
    taskCompleted,
    taskCompletedSuccessfully,
    agentFinalResponse: finalResponse,
    successRate: totalSteps > 0 ? successSteps / totalSteps : 0,
    steps: session.steps,
  };
}

module.exports = {
  runAgent,
  buildSystemPrompt,
  MAX_ITERATIONS,
};
