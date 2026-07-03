/**
 * llmService.js
 * LLM client — OpenAI-compatible SDK pointed at OpenRouter.
 */

const OpenAI = require('openai');

let client = null;

function getLlmConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.LLM_MODEL || 'google/gemini-2.5-flash';
  return { apiKey, model, configured: Boolean(apiKey) };
}

function getClient() {
  if (!client) {
    const config = getLlmConfig();
    if (!config.configured) {
      throw new Error('OPENROUTER_API_KEY is not set. Get a free key at https://openrouter.ai');
    }
    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
  return client;
}

const FALLBACK_MODELS = ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct'];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callWithRetry(fn, lockedModel) {
  const { model } = getLlmConfig();
  const models = lockedModel
    ? [lockedModel]
    : [model, ...FALLBACK_MODELS.filter((m) => m !== model)];

  for (let i = 0; i < models.length; i++) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn(models[i]);
      } catch (err) {
        const status = err.status || err.httpStatusCode;
        const retryable = status === 429 || status === 503;
        if (!retryable) throw err;
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        } else if (i < models.length - 1) {
          console.error(`[llm] ${models[i]} unavailable, falling back to ${models[i + 1]}`);
        } else {
          throw err;
        }
      }
    }
  }
}

/**
 * Chat completion with tool use (function calling).
 * messages: OpenAI-format message array
 * tools: OpenAI-format tool array [{ type: 'function', function: { name, description, parameters } }]
 * Returns { message, _usedModel }
 */
async function chatCompletion({ messages, tools, _lockedModel }) {
  const ai = getClient();

  return callWithRetry(async (modelName) => {
    const req = {
      model: modelName,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    };
    if (tools && tools.length > 0) {
      req.tools = tools;
      req.tool_choice = 'auto';
    }

    const response = await ai.chat.completions.create(req);
    const message = response.choices[0].message;
    return { message, _usedModel: modelName };
  }, _lockedModel);
}

/**
 * Simple text completion (no tools). Used by evaluator and fixGenerator.
 */
async function textCompletion({ systemPrompt, userPrompt }) {
  const ai = getClient();

  return callWithRetry(async (modelName) => {
    const response = await ai.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
    return response.choices[0].message.content;
  });
}

module.exports = { getClient, getLlmConfig, chatCompletion, textCompletion };
