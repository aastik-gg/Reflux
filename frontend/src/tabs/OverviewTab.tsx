import { Activity, AlertTriangle, Box, ChevronDown, Clock } from "lucide-react";
import { useApp, useSelectedWorkflow } from "@/context/AppContext";
import { GlassMetric, GlassPanel, RunRow, ToolBar, TraceConnector, TraceStep } from "@/components/ui/glass";
import { formatLatency, scoreToStatus, stepToStatus, timeAgo, truncateTask } from "@/lib/format";

export function OverviewTab() {
  const { workflows, loading, health, lastRun } = useApp();
  const selected = useSelectedWorkflow();

  const recent = [...workflows].reverse().slice(0, 5);
  const avgScore =
    workflows.length > 0
      ? Math.round(workflows.reduce((s, w) => s + (w.agent_readiness_score ?? 0), 0) / workflows.length)
      : null;

  const runtimeIssues = (lastRun?.issues?.runtime ?? []).length;
  const designIssues = (lastRun?.issues?.design ?? lastRun?.issues_detected ?? []).length;

  const toolStats = computeToolStats(workflows);
  const traceSteps = selected?.trace ?? lastRun?.trace ?? [];

  if (loading) {
    return <p className="text-white/30 text-sm font-mono">Loading dashboard…</p>;
  }

  return (
    <>
      <div className="mb-8 md:mb-12">
        <p className="text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">System Dashboard</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Agent Reliability
        </h1>
        <p className="text-white/35 text-xs md:text-sm max-w-md leading-relaxed">
          MCP readiness testing — stress workflows, detect parameter issues, ship stable agents.
          {!health?.llm_configured && (
            <span className="block text-amber-400/70 mt-1">LLM not configured on backend (.env)</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <GlassMetric label="Test Runs" value={String(workflows.length)} sub="saved" icon={<Box className="w-3.5 h-3.5" />} />
        <GlassMetric label="Readiness" value={avgScore != null ? `${avgScore}` : "—"} sub="avg score" icon={<Activity className="w-3.5 h-3.5" />} />
        <GlassMetric label="Design Issues" value={String(designIssues)} sub="last run" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <GlassMetric label="Runtime Issues" value={String(runtimeIssues)} sub="last run" icon={<Clock className="w-3.5 h-3.5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GlassPanel>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-sm font-semibold text-white/80">Recent Runs</h2>
              <button type="button" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                Latest <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="text-xs text-white/25 py-4 text-center">No runs yet — click New Test</p>
              ) : (
                recent.map((w) => (
                  <RunRow
                    key={w.id}
                    name={truncateTask(w.task, 36)}
                    status={scoreToStatus(w.agent_readiness_score)}
                    score={`${w.agent_readiness_score ?? "—"}`}
                    time={timeAgo(w.completed_at ?? w.started_at)}
                  />
                ))
              )}
            </div>
          </GlassPanel>
        </div>
        <GlassPanel>
          <h2 className="text-sm font-semibold text-white/80 mb-4 md:mb-5">Tool Stability</h2>
          <div className="space-y-3">
            {toolStats.length === 0 ? (
              <p className="text-xs text-white/25">Run tests to see per-tool success</p>
            ) : (
              toolStats.slice(0, 6).map((t) => <ToolBar key={t.name} name={t.name} pct={t.pct} />)
            )}
          </div>
        </GlassPanel>
      </div>

      <div className="mt-4">
        <GlassPanel>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-white/80">Latest Trace</h2>
            <span className="text-[11px] text-white/20 font-mono">{traceSteps.length} steps</span>
          </div>
          {traceSteps.length === 0 ? (
            <p className="text-xs text-white/25 py-6 text-center">No trace data yet</p>
          ) : (
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 -mx-2 px-2">
              {traceSteps.map((s, i) => (
                <span key={s.step} className="flex items-center gap-2 md:gap-3">
                  {i > 0 && <TraceConnector />}
                  <TraceStep
                    step={s.step}
                    tool={s.tool}
                    status={stepToStatus(s)}
                    latency={formatLatency(s.latency_ms)}
                  />
                </span>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </>
  );
}

function computeToolStats(workflows: { trace?: { tool: string; success: boolean }[] }[]) {
  const map: Record<string, { ok: number; total: number }> = {};
  for (const w of workflows) {
    for (const step of w.trace ?? []) {
      if (!map[step.tool]) map[step.tool] = { ok: 0, total: 0 };
      map[step.tool].total += 1;
      if (step.success) map[step.tool].ok += 1;
    }
  }
  return Object.entries(map)
    .map(([name, { ok, total }]) => ({ name, pct: Math.round((ok / total) * 100) }))
    .sort((a, b) => a.pct - b.pct);
}
