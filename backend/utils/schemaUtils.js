/**
 * schemaUtils.js
 * Converts MCP tool definitions into OpenAI function-calling schemas.
 */

/**
 * Map a simple type string to JSON Schema type.
 */
function mapType(typeStr) {
  const t = String(typeStr).toLowerCase();
  if (t === 'string') return 'string';
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'array') return 'array';
  if (t === 'object') return 'object';
  return 'string';
}

/**
 * Build JSON Schema properties from flat parameter map.
 * e.g. { uid: "string", count: "number" }
 */
function buildProperties(parameters = {}) {
  const properties = {};
  const required = [];

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string') {
      const type = mapType(value);
      const prop = { type, description: `${key} (${value})` };
      if (type === 'array') {
        prop.items = { type: 'string' };
      }
      properties[key] = prop;
      required.push(key);
    } else if (value && typeof value === 'object') {
      const type = value.type ? mapType(value.type) : 'string';
      properties[key] = {
        type,
        description: value.description || key,
        ...(value.enum ? { enum: value.enum } : {}),
        ...(type === 'array' ? { items: value.items || { type: 'string' } } : {}),
      };
      if (value.required !== false) required.push(key);
    }
  }

  return { properties, required };
}

/**
 * Normalize MCP/JSON Schema for OpenAI function tools (requires array.items, etc.).
 */
function sanitizeJsonSchemaForOpenAI(schema) {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} };
  }

  if (Array.isArray(schema)) {
    return schema.map(sanitizeJsonSchemaForOpenAI);
  }

  const out = { ...schema };
  delete out.$schema;
  delete out.$id;

  if (out.type === 'array' && !out.items) {
    out.items = { type: 'string' };
  }

  if (out.properties && typeof out.properties === 'object') {
    const properties = {};
    for (const [key, value] of Object.entries(out.properties)) {
      properties[key] = sanitizeJsonSchemaForOpenAI(value);
    }
    out.properties = properties;
  }

  if (out.items) {
    out.items = sanitizeJsonSchemaForOpenAI(out.items);
  }

  if (out.additionalProperties && typeof out.additionalProperties === 'object') {
    out.additionalProperties = sanitizeJsonSchemaForOpenAI(out.additionalProperties);
  }

  for (const combiner of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(out[combiner])) {
      out[combiner] = out[combiner].map(sanitizeJsonSchemaForOpenAI);
    }
  }

  return out;
}

/**
 * Convert a single MCP tool definition to OpenAI tool format.
 */
function mcpToolToOpenAI(tool) {
  let parameters;

  if (tool.input_schema && typeof tool.input_schema === 'object') {
    parameters = sanitizeJsonSchemaForOpenAI(tool.input_schema);
    if (!parameters.type) {
      parameters.type = 'object';
    }
  } else {
    const { properties, required } = buildProperties(tool.parameters || {});
    parameters = {
      type: 'object',
      properties,
      required,
    };
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      parameters,
    },
  };
}

/**
 * Convert an array of MCP tools to OpenAI tools array.
 */
function mcpToolsToOpenAI(tools) {
  return (tools || []).map(mcpToolToOpenAI);
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

module.exports = {
  mapType,
  buildProperties,
  sanitizeJsonSchemaForOpenAI,
  mcpToolToOpenAI,
  mcpToolsToOpenAI,
  getExpectedParams,
};
