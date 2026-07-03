/**
 * schemaUtils.js
 * Converts MCP tool definitions into Gemini function declarations.
 */

const GEMINI_TYPE_MAP = {
  string: 'STRING',
  number: 'NUMBER',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  array: 'ARRAY',
  object: 'OBJECT',
};

function toGeminiType(typeStr) {
  return GEMINI_TYPE_MAP[String(typeStr).toLowerCase()] || 'STRING';
}

/**
 * Convert nested properties to Gemini schema format.
 */
function convertProperties(props) {
  if (!props || typeof props !== 'object') return undefined;
  const out = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      out[key] = { type: toGeminiType(value), description: `${key} (${value})` };
    } else if (value && typeof value === 'object') {
      const type = toGeminiType(value.type || 'string');
      out[key] = { type, description: value.description || key };
      if (value.enum) out[key].enum = value.enum;
      if (value.items) out[key].items = { type: toGeminiType(value.items.type || 'string') };
      if (value.properties) out[key].properties = convertProperties(value.properties);
    }
  }
  return out;
}

/**
 * Convert a single MCP tool to a Gemini function declaration.
 */
function mcpToolToGemini(tool) {
  const decl = {
    name: tool.name,
    description: tool.description || `Tool: ${tool.name}`,
  };

  const params = tool.input_schema || tool.parameters;
  if (params && typeof params === 'object') {
    const props = params.properties || params;
    const converted = convertProperties(props);
    if (converted && Object.keys(converted).length > 0) {
      decl.parameters = {
        type: 'OBJECT',
        properties: converted,
      };
      const required = params.required || Object.keys(props);
      if (required.length > 0) decl.parameters.required = required;
    }
  }

  return decl;
}

/**
 * Convert an array of MCP tools to Gemini tools format.
 * Returns the tools array expected by Gemini: [{ functionDeclarations: [...] }]
 */
function mcpToolsToGemini(tools) {
  if (!tools || tools.length === 0) return undefined;
  return [{ functionDeclarations: tools.map(mcpToolToGemini) }];
}

/**
 * Extract expected parameter names from a tool definition.
 */
function getExpectedParams(tool) {
  if (tool.input_schema?.properties) {
    return Object.keys(tool.input_schema.properties);
  }
  return Object.keys(tool.parameters || {});
}

/**
 * Convert an MCP tool to OpenAI function tool format.
 */
function mcpToolToOpenAI(tool) {
  const params = tool.input_schema || tool.parameters;
  const schema = { type: 'object', properties: {}, required: [] };

  if (params && typeof params === 'object') {
    const props = params.properties || params;
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        schema.properties[key] = { type: value, description: `${key} (${value})` };
      } else if (value && typeof value === 'object') {
        schema.properties[key] = {
          type: value.type || 'string',
          description: value.description || key,
          ...(value.enum ? { enum: value.enum } : {}),
          ...(value.items ? { items: value.items } : {}),
        };
      }
    }
    schema.required = params.required || Object.keys(schema.properties);
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      parameters: schema,
    },
  };
}

function mcpToolsToOpenAI(tools) {
  if (!tools || tools.length === 0) return [];
  return tools.map(mcpToolToOpenAI);
}

module.exports = {
  toGeminiType,
  convertProperties,
  mcpToolToGemini,
  mcpToolsToGemini,
  mcpToolToOpenAI,
  mcpToolsToOpenAI,
  getExpectedParams,
};
