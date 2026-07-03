export type RunStatus = "pass" | "partial" | "fail";
export type TraceStepStatus = "success" | "fail" | "retry";

export interface Issue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  tool?: string;
  suggested_fix?: string;
}

export interface TraceStep {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  output: unknown;
  success: boolean;
  error: string | null;
  is_retry: boolean;
  latency_ms: number;
  timestamp: string;
}

export interface McpTool {
  name: string;
  description?: string;
  parameters?: Record<string, string>;
  input_schema?: Record<string, unknown>;
  examples?: Record<string, unknown>[];
  _source?: string;
}

export interface McpConnection {
  connected: boolean;
  live_connected: boolean;
  preset: string | null;
  command: string | null;
  args: string[] | null;
  tool_count: number;
  available_presets?: { name: string; description: string; command: string; args: string[] }[];
  registry_note?: string | null;
  last_session?: { preset: string | null; command: string | null; disconnected_at: string } | null;
}

export interface ScoreBreakdown {
  runtime_success: number;
  parameter_clarity: number;
  documentation: number;
  stability: number;
}

export interface WorkflowRunResult {
  workflow_id: string;
  stress: boolean;
  mode: string;
  execution_source?: string;
  task_completed: boolean;
  task_completed_successfully: boolean;
  agent_final_response: string | null;
  agent_readiness_score: number;
  score_breakdown: ScoreBreakdown;
  workflow_success_rate: number;
  summary: {
    task: string;
    outcome: string;
    steps_count: number;
    failures_count: number;
    duration_ms: number;
    tools_used?: string[];
  };
  issues: { all: Issue[]; runtime: Issue[]; design: Issue[] };
  issues_detected: Issue[];
  trace: TraceStep[];
  evaluation?: {
    root_causes?: string[];
    documentation_gaps?: string[];
    overall_assessment?: string;
  };
  optimized_tools?: McpTool[];
  fix_markdown?: string | null;
  report_url?: string | null;
  apply_optimized_hint?: string;
}

export interface WorkflowRecord {
  id: string;
  task: string;
  started_at?: string;
  completed_at?: string;
  agent_readiness_score?: number;
  score_breakdown?: ScoreBreakdown;
  workflow_success_rate?: number;
  issues_detected?: Issue[];
  trace?: TraceStep[];
  duration_ms?: number;
  mode?: string;
  stress?: boolean;
  task_completed?: boolean;
  task_completed_successfully?: boolean;
  report_url?: string;
}

export interface TraceSession {
  id: string;
  task: string;
  started_at: string;
  completed_at: string | null;
  outcome: string | null;
  issues: Issue[];
  steps: TraceStep[];
}

export interface CompareResult {
  compare_id: string;
  task: string;
  improvement: number;
  improvement_percent: number;
  before: { agent_readiness_score: number; issues_detected?: Issue[] };
  after: { agent_readiness_score: number; issues_detected?: Issue[] };
  narrative?: string;
  registry_updated?: boolean;
}

export interface HealthResponse {
  status: string;
  llm_configured: boolean;
  llm_provider?: string;
  llm_model?: string;
}

