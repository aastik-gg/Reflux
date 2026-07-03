/**
 * agentRunner.js
 * Runs the autonomous function-calling loop against simulated MCP tools.
 * Uses OpenAI message format (compatible with OpenRouter).
 */

const { chatCompletion } = require('./llmService');
const { executeTool } = require('./toolExecutor');
const { logStep } = require('./traceLogger');
const { mcpToolsToOpenAI } = require('../utils/schemaUtils');

const MAX_ITERATIONS = 8;

function buildSystemPrompt(tools) {
  const toolList = tools.map((t) => `${t.name}: ${t.description}`).join('\n');
  return `Complete the task using these tools. Use exact parameter names from schemas. On failure, fix args and retry. Reply with a short summary when done.\n\nTools:\n${toolList}`;
}

function parseArgs(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

function isRetry(steps, toolName, args) {
  const key = JSON.stringify({ tool: toolName, args });
  return steps.some((s) => JSON.stringify({ tool: s.tool, args: s.args }) === key);
}

async function runAgent({ task, tools, session, stress = false, mode = 'simulated' }) {
  const openaiTools = mcpToolsToOpenAI(tools);
  const systemPrompt = buildSystemPrompt(tools);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task },
  ];

  let finished = false;
  let iterations = 0;
  let finalResponse = null;
  let lockedModel = null;

  while (!finished && iterations < MAX_ITERATIONS) {
    iterations++;

    const result = await chatCompletion({
      messages,
      tools: openaiTools,
      _lockedModel: lockedModel,
    });

    if (result._usedModel && !lockedModel) {
      lockedModel = result._usedModel;
    }

    const { message } = result;
    messages.push(message);

    const toolCalls = message.tool_calls || [];

    if (toolCalls.length === 0) {
      finished = true;
      finalResponse = message.content;
      break;
    }

    // Execute each tool call and push tool response messages
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      const args = parseArgs(tc.function.arguments);
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
          tool_call_id: tc.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
        });
        continue;
      }

      const retry = isRetry(session.steps, toolName, args);
      const execResult = await executeTool(toolDef, args, { stress, mode });

      logStep(session, {
        tool: toolName,
        args,
        output: execResult.output,
        success: execResult.success,
        error: execResult.error,
        is_retry: retry,
        latency_ms: execResult.latency_ms,
      });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(
          execResult.success
            ? { success: true, data: execResult.output }
            : { success: false, error: execResult.error }
        ),
      });
    }
  }

  const successSteps = session.steps.filter((s) => s.success).length;
  const totalSteps = session.steps.length;
  const workflowSuccess = finished && successSteps > 0 && session.steps.every((s) => s.success);

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
