/**
 * mcpSchemaConverter.js
 * Convert between registry tool format and official MCP SDK tool schemas.
 */

/**
 * Convert JSON Schema properties to flat parameters map.
 */
function inputSchemaToParameters(inputSchema) {
  const parameters = {};
  const props = inputSchema?.properties || {};
  for (const [key, schema] of Object.entries(props)) {
    if (schema && typeof schema === 'object') {
      parameters[key] = schema.type || 'string';
    } else {
      parameters[key] = 'string';
    }
  }
  return parameters;
}

/**
 * Convert MCP listTools entry to registry format.
 */
function mcpListToolToRegistry(tool) {
  return {
    name: tool.name,
    description: tool.description || `Tool: ${tool.name}`,
    parameters: inputSchemaToParameters(tool.inputSchema),
    input_schema: tool.inputSchema,
    _source: 'real_mcp',
  };
}

/**
 * Convert registry tools array from MCP listTools response.
 */
function mcpToolsToRegistry(tools) {
  return (tools || []).map(mcpListToolToRegistry);
}

module.exports = {
  inputSchemaToParameters,
  mcpListToolToRegistry,
  mcpToolsToRegistry,
};
