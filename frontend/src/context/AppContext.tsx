import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  HealthResponse,
  Issue,
  McpConnection,
  McpTool,
  TraceSession,
  WorkflowRecord,
  WorkflowRunResult,
} from "@/types/api";

interface AppState {
  health: HealthResponse | null;
  tools: McpTool[];
  mcpConnection: McpConnection | null;
  registryNote: string | null;
  workflows: WorkflowRecord[];
  traces: TraceSession[];
  lastRun: WorkflowRunResult | null;
  selectedWorkflowId: string | null;
  loading: boolean;
  actionLoading: string | null;
  error: string | null;
  refreshAll: () => Promise<void>;
  refreshMcp: () => Promise<void>;
  refreshTraces: () => Promise<void>;
  setSelectedWorkflowId: (id: string | null) => void;
  setLastRun: (run: WorkflowRunResult | null) => void;
  setError: (msg: string | null) => void;
  runAction: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [mcpConnection, setMcpConnection] = useState<McpConnection | null>(null);
  const [registryNote, setRegistryNote] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [traces, setTraces] = useState<TraceSession[]>([]);
  const [lastRun, setLastRun] = useState<WorkflowRunResult | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMcp = useCallback(async () => {
    const data = await api.getMcpTools();
    setTools(data.tools);
    setMcpConnection(data.mcp_connection);
    setRegistryNote(data.registry_note ?? null);
  }, []);

  const refreshTraces = useCallback(async () => {
    const data = await api.getTraces();
    setTraces(data.traces);
    setWorkflows(data.workflows);
    if (data.workflows.length > 0) {
      setSelectedWorkflowId((prev) => prev ?? data.workflows[data.workflows.length - 1].id);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await api.health();
      setHealth(h);
      await Promise.all([refreshMcp(), refreshTraces()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }, [refreshMcp, refreshTraces]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runAction = useCallback(async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    setActionLoading(label);
    setError(null);
    try {
      const result = await fn();
      await refreshMcp();
      await refreshTraces();
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      throw e;
    } finally {
      setActionLoading(null);
    }
  }, [refreshMcp, refreshTraces]);

  const value = useMemo(
    () => ({
      health,
      tools,
      mcpConnection,
      registryNote,
      workflows,
      traces,
      lastRun,
      selectedWorkflowId,
      loading,
      actionLoading,
      error,
      refreshAll,
      refreshMcp,
      refreshTraces,
      setSelectedWorkflowId,
      setLastRun,
      setError,
      runAction,
    }),
    [
      health,
      tools,
      mcpConnection,
      registryNote,
      workflows,
      traces,
      lastRun,
      selectedWorkflowId,
      loading,
      actionLoading,
      error,
      refreshAll,
      refreshMcp,
      refreshTraces,
      runAction,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useSelectedWorkflow(): WorkflowRecord | null {
  const { workflows, selectedWorkflowId, lastRun } = useApp();
  if (lastRun && selectedWorkflowId === lastRun.workflow_id) {
    return {
      id: lastRun.workflow_id,
      task: lastRun.summary.task,
      agent_readiness_score: lastRun.agent_readiness_score,
      issues_detected: lastRun.issues_detected,
      trace: lastRun.trace,
      workflow_success_rate: lastRun.workflow_success_rate,
    };
  }
  return workflows.find((w) => w.id === selectedWorkflowId) ?? workflows[workflows.length - 1] ?? null;
}

export function useActiveIssues(): Issue[] {
  const { lastRun } = useApp();
  const wf = useSelectedWorkflow();
  if (lastRun) return lastRun.issues?.all ?? lastRun.issues_detected ?? [];
  return wf?.issues_detected ?? [];
}
