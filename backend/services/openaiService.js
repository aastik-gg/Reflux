/**
 * openaiService.js
 * LLM client wrapper — supports OpenAI API and GitHub Models (PAT auth).
 */

const OpenAI = require('openai');

let client = null;

const PLACEHOLDER_KEYS = new Set([
  'your_openai_api_key_here',
  'your_github_token_here',
  'ghp_your_token_here',
]);

const PROVIDERS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    headers: {},
  },
  github: {
    baseURL: 'https://models.github.ai/inference',
    defaultModel: 'openai/gpt-4.1-mini',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  },
};

/**
 * Return true if a credential value is present and not a placeholder.
 */
function isValidCredential(value) {
  return Boolean(value && !PLACEHOLDER_KEYS.has(value.trim()));
}

/**
 * Resolve active LLM provider and credentials from environment.
 */
function getLlmConfig() {
  const explicitProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const githubToken = process.env.GITHUB_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;

  let provider = explicitProvider;

  if (!provider || !PROVIDERS[provider]) {
    if (isValidCredential(githubToken)) provider = 'github';
    else if (isValidCredential(openaiKey)) provider = 'openai';
    else provider = 'openai';
  }

  const apiKey =
    provider === 'github'
      ? githubToken
      : openaiKey || githubToken;

  const providerConfig = PROVIDERS[provider];
  const model =
    process.env.OPENAI_MODEL ||
    (provider === 'github' ? PROVIDERS.github.defaultModel : PROVIDERS.openai.defaultModel);

  return {
    provider,
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || providerConfig.baseURL,
    model,
    headers: providerConfig.headers,
    configured: isValidCredential(apiKey),
  };
}

/**
 * Lazily initialize the OpenAI-compatible client (allows server boot without a key).
 */
function getClient() {
  if (!client) {
    const config = getLlmConfig();

    if (!config.configured) {
      throw new Error(
        'LLM API key is not configured. Set GITHUB_TOKEN (GitHub Models) or OPENAI_API_KEY in backend/.env'
      );
    }

    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.headers,
    });
  }
  return client;
}

/**
 * Run a chat completion with optional tools.
 */
async function chatCompletion({ messages, tools, toolChoice = 'auto' }) {
  const openai = getClient();
  const { model } = getLlmConfig();

  const payload = {
    model,
    messages,
    temperature: 0.2,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = toolChoice;
  }

  const response = await openai.chat.completions.create(payload);
  return response.choices[0].message;
}

/**
 * Simple text completion without tools (used by evaluator / fix generator).
 */
async function textCompletion({ systemPrompt, userPrompt }) {
  const openai = getClient();
  const { model } = getLlmConfig();

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.choices[0].message.content;
}

module.exports = {
  getClient,
  getLlmConfig,
  chatCompletion,
  textCompletion,
};
