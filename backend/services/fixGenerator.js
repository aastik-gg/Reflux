/**
 * fixGenerator.js
 * Generates the MCP Optimization Report as markdown (generated/fix.md).
 */

const fs = require('fs');
const path = require('path');
const { textCompletion } = require('./openaiService');
const { getNamingSuggestions } = require('./toolExecutor');

const FIX_PATH = path.join(__dirname, '../generated/fix.md');

/**
 * Build example payloads for each tool.
 */
function buildExamplePayloads(tools) {
  return tools.map((tool) => {
    const suggestions = getNamingSuggestions(tool);
    const params = Object.keys(tool.parameters || {});
    const exampleArgs = {};
    params.forEach((p) => {
      exampleArgs[suggestions[p] || p] = p.includes('id') || p === 'uid' || p === 'tid' ? '123' : 'example_value';
    });

    return {
      tool: tool.name,
      description: tool.description,
      recommended_example: {
        name: tool.name,
        arguments: exampleArgs,
      },
    };
  });
}

/**
 * Render markdown report from structured analysis data.
 */
function renderMarkdown({ task, issues, evaluation, tools, trace, workflowSuccessRate }) {
  const examples = buildExamplePayloads(tools);
  const lines = [];

  lines.push('# MCP Optimization Report');
  lines.push('');
  lines.push(`**Task tested:** ${task}`);
  lines.push(`**Workflow success rate:** ${(workflowSuccessRate * 100).toFixed(0)}%`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Detected Problems
  lines.push('## Detected Problems');
  lines.push('');
  if (issues.length === 0) {
    lines.push('No significant issues detected.');
  } else {
    issues.forEach((issue, i) => {
      lines.push(`${i + 1}. **[${issue.severity}] ${issue.type}** (${issue.tool || 'workflow'})`);
      lines.push(`   - ${issue.message}`);
      if (issue.suggested_fix) lines.push(`   - Suggested fix: ${issue.suggested_fix}`);
      lines.push('');
    });
  }

  // Root Cause Analysis
  lines.push('## Root Cause Analysis');
  lines.push('');
  const rootCauses = evaluation?.root_causes || [];
  if (rootCauses.length === 0) {
    lines.push('Root causes could not be fully determined. Review trace steps below.');
  } else {
    rootCauses.forEach((rc) => lines.push(`- ${rc}`));
  }
  lines.push('');
  if (evaluation?.overall_assessment) {
    lines.push(`> ${evaluation.overall_assessment}`);
    lines.push('');
  }

  // Suggested Fixes
  lines.push('## Suggested Fixes');
  lines.push('');
  const fixes = [...new Set(issues.map((i) => i.suggested_fix).filter(Boolean))];
  fixes.forEach((fix) => lines.push(`- ${fix}`));
  if (fixes.length === 0) lines.push('- No fixes required; MCP tools appear agent-friendly.');
  lines.push('');

  // Improved Documentation
  lines.push('## Improved Documentation');
  lines.push('');
  const docGaps = evaluation?.documentation_gaps || [];
  if (docGaps.length > 0) {
    docGaps.forEach((gap) => lines.push(`- ${gap}`));
  }
  tools.forEach((tool) => {
    lines.push(`### ${tool.name}`);
    lines.push('');
    lines.push(`**Current:** ${tool.description}`);
    lines.push('');
    lines.push(`**Recommended:** ${tool.name} — ${tool.description}. Use this tool when you need to ${tool.description.toLowerCase()}. Required parameters: ${Object.keys(tool.parameters || {}).join(', ')}. Always use exact parameter names from the schema.`);
    lines.push('');
  });

  // Better Parameter Naming
  lines.push('## Better Parameter Naming');
  lines.push('');
  tools.forEach((tool) => {
    const suggestions = getNamingSuggestions(tool);
    const entries = Object.entries(suggestions);
    if (entries.length === 0) return;
    lines.push(`**${tool.name}:**`);
    entries.forEach(([from, to]) => {
      lines.push(`- Rename \`${from}\` → \`${to}\` (or accept both as aliases)`);
    });
    lines.push('');
  });

  // Example Payloads
  lines.push('## Example Payloads');
  lines.push('');
  examples.forEach((ex) => {
    lines.push(`### ${ex.tool}`);
    lines.push('```json');
    lines.push(JSON.stringify(ex.recommended_example, null, 2));
    lines.push('```');
    lines.push('');
  });

  // AI-Agent Guidance
  lines.push('## AI-Agent Guidance');
  lines.push('');
  lines.push('- Always read the tool schema parameter names before calling a tool.');
  lines.push('- On failure, inspect the error message for expected vs. received parameter names.');
  lines.push('- Avoid retrying with identical arguments; adjust based on error feedback.');
  lines.push('- Prefer descriptive parameter names in MCP definitions (e.g., `user_id` over `uid`).');
  lines.push('- Include at least one worked example per tool in MCP server metadata.');
  lines.push('');

  // Workflow Trace
  lines.push('## Workflow Trace');
  lines.push('');
  lines.push('| Step | Tool | Success | Args | Error |');
  lines.push('|------|------|---------|------|-------|');
  trace.forEach((s) => {
    const args = JSON.stringify(s.args || {}).replace(/\|/g, '\\|');
    const err = (s.error || '-').replace(/\|/g, '\\|');
    lines.push(`| ${s.step} | ${s.tool} | ${s.success ? '✓' : '✗'} | ${args} | ${err} |`);
  });
  lines.push('');

  if (evaluation?.retry_analysis) {
    lines.push('## Retry Analysis');
    lines.push('');
    lines.push(evaluation.retry_analysis);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Optionally enhance report with LLM, then write to disk.
 */
async function generateFixReport({ task, issues, evaluation, tools, trace, workflowSuccessRate }) {
  let markdown = renderMarkdown({
    task,
    issues,
    evaluation,
    tools,
    trace,
    workflowSuccessRate,
  });

  // Try to enrich with LLM-generated narrative sections
  try {
    const enhanced = await textCompletion({
      systemPrompt: 'You are an MCP optimization expert. Add a concise executive summary (3-5 sentences) for an MCP optimization report. Return only the summary text, no markdown headers.',
      userPrompt: `Issues: ${JSON.stringify(issues)}\nEvaluation: ${JSON.stringify(evaluation)}`,
    });

    if (enhanced && enhanced.length > 20) {
      markdown = markdown.replace(
        '# MCP Optimization Report\n',
        `# MCP Optimization Report\n\n## Executive Summary\n\n${enhanced}\n`
      );
    }
  } catch {
    // Keep rule-based report if LLM enhancement fails
  }

  fs.writeFileSync(FIX_PATH, markdown, 'utf8');
  return markdown;
}

module.exports = {
  generateFixReport,
  renderMarkdown,
  buildExamplePayloads,
  FIX_PATH,
};
