import type {
  CompareResult,
  DemoInfo,
  HealthResponse,
  McpConnection,
  McpTool,
  WorkflowRunResult,
} from "@/types/api";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 200) || `Invalid JSON (${res.status})`);
    }
  }

  if (!res.ok) {
    const err = data as { error?: string; details?: string | string[] };
    const details = Array.isArray(err?.details) ? err.details.join("; ") : err?.details;
    throw new Error(details ? `${err?.error || res.statusText}: ${details}` : err?.error || res.statusText);
  }

  return data as T;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  getMcpTools: () =>
    request<{ count: number; tools: McpTool[]; mcp_connection: McpConnection; registry_note?: string }>("/api/mcp"),

  getConnection: () => request<McpConnection>("/api/mcp/connection"),

  connectMcp: (body: { preset?: string; command?: string; args?: string[]; import_tools?: boolean }) =>
    request<{ message: string; connection: McpConnection; tools_imported: number }>("/api/mcp/connect", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  disconnectMcp: () =>
    request<{ message: string; connection: McpConnection }>("/api/mcp/disconnect", { method: "POST", body: "{}" }),

  syncMcp: () =>
    request<{ count: number; tools: McpTool[] }>("/api/mcp/sync", { method: "POST", body: "{}" }),

  applyOptimized: (body: { use_last_workflow?: boolean; workflow_id?: string }) =>
    request<{ message: string; count: number }>("/api/mcp/apply-optimized", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getDemoInfo: () => request<DemoInfo>("/api/demo/info"),

  loadBadDemo: () =>
    request<{ message: string; count: number; suggested_tasks: { simple: string; multi_step: string } }>(
      "/api/demo/load-bad",
      { method: "POST", body: "{}" }
    ),

  loadFixedDemo: () =>
    request<{ message: string; count: number; suggested_tasks: { simple: string } }>("/api/demo/load-fixed", {
      method: "POST",
      body: "{}",
    }),

  runWorkflow: (body: { task: string; mode?: string; stress?: boolean }) =>
    request<WorkflowRunResult>("/api/workflow/run", { method: "POST", body: JSON.stringify(body) }),

  compareWorkflow: (body: { task: string; mode?: string; stress?: boolean; apply_optimized?: boolean }) =>
    request<CompareResult>("/api/workflow/compare", { method: "POST", body: JSON.stringify(body) }),

  runSuite: (body: { pack?: string; mode?: string; stress?: boolean }) =>
    request<{
      average_agent_readiness_score: number;
      results: { task: string; agent_readiness_score: number; workflow_id: string }[];
      summary: string;
    }>("/api/workflow/suite", { method: "POST", body: JSON.stringify(body) }),

  getTraces: () =>
    request<{
      count: number;
      traces: import("@/types/api").TraceSession[];
      workflows: import("@/types/api").WorkflowRecord[];
    }>("/api/traces"),

  getReport: (workflowId: string) =>
    request<{ workflow_id: string; fix_markdown: string | null; agent_readiness_score?: number }>(
      `/api/reports/${workflowId}`
    ),
};
