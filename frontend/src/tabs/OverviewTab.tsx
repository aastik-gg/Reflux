import { Activity, AlertTriangle, Box, Clock, Target, Zap } from "lucide-react";
import { useApp, useActiveIssues, useSelectedWorkflow } from "@/context/AppContext";
import { GlassMetric, GlassPanel, RecommendationCard, RunRow, StatusDot, ToolBar, TraceConnector, TraceStep } from "@/components/ui/glass";
import { formatLatency, issueTypeLabel, scoreToStatus, stepToStatus, timeAgo, truncateTask } from "@/lib/format";
import type { ScoreBreakdown } from "@/types/api";

export function OverviewTab() {
  const { workflows, tools, loading, health, lastRun, selectedWorkflowId, setSelectedWorkflowId } = useApp();
  const selected = useSelectedWorkflow();
  const issues = useActiveIssues();

  const recent = [...workflows].reverse().slice(0, 5);
  const avgScore =
    workflows.length > 0
      ? Math.round(workflows.reduce((s, w) => s + (w.agent_readiness_score ?? 0), 0) / workflows.length)
      : null;

  const runtimeIssues = issues.filter((i) =>
    ["hallucinated_parameter", "missing_parameter", "retry_loop", "workflow_instability"].includes(i.type)
  );
  const designIssues = issues.filter((i) => !runtimeIssues.includes(i));

  const activeRun = lastRun && lastRun.workflow_id === selectedWorkflowId ? lastRun : null;
  const traceSteps = activeRun?.trace ?? selected?.trace ?? [];
  const scoreBreakdown = activeRun?.score_breakdown ?? selected?.score_breakdown ?? null;
  const evaluation = activeRun?.evaluation ?? null;
  const activeScore = activeRun?.agent_readiness_score ?? selected?.agent_readiness_score ?? null;
  const activeTask = activeRun?.summary?.task ?? selected?.task ?? null;
  const activeMode = activeRun?.mode ?? selected?.mode ?? null;
  const activeCompleted = activeRun?.task_completed_successfully ?? selected?.task_completed_successfully ?? null;
  const hasResult = activeScore != null;

  if (loading) {
    return <p className="text-white/55 text-sm font-mono">Loading dashboard…</p>;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-white/70 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">MCP Reliability Tester</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Agent Readiness
        </h1>
        <p className="text-white/60 text-xs md:text-sm max-w-lg leading-relaxed">
          {!hasResult
            ? "Load a demo pack and run a test to see how reliably agents can use your MCP tools."
            : "Test results showing how well agents interact with your tools."}
          {!health?.llm_configured && (
            <span className="block text-amber-400/70 mt-1">LLM not configured — set GITHUB_TOKEN or OPENAI_API_KEY in backend .env</span>
          )}
        </p>
      </div>

      {/* Empty state */}
      {!hasResult && workflows.length === 0 && (
        <GlassPanel className="mb-6">
          <div className="py-8 text-center">
            <Zap className="w-8 h-8 text-white/60 mx-auto mb-3" />
            <p className="text-sm text-white/70 mb-1">No test results yet</p>
            <p className="text-[11px] text-white/70">Click <span className="text-white/70 font-medium">Load Demo</span> in the top bar, then <span className="text-white/70 font-medium">New Test</span> to run your first reliability test.</p>
          </div>
        </GlassPanel>
      )}

      {/* Score Hero — shows when we have a result */}
      {hasResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <GlassPanel className="lg:col-span-1">
            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-[10px] text-white/55 font-mono uppercase tracking-wider mb-2">Readiness Score</p>
              <div className="relative">
                <p className="text-5xl md:text-6xl font-bold font-mono text-white/90">{activeScore}</p>
                <span className="absolute -right-6 top-1 text-sm text-white/45">/100</span>
              </div>
              <StatusDot status={scoreToStatus(activeScore)} />
              <p className="text-[11px] text-white/70 mt-2 text-center">
                {activeCompleted !== null ? (activeCompleted ? "Task completed" : "Task failed") : ""}{activeMode ? ` · ${activeMode} mode` : ""}
              </p>
              {activeTask && <p className="text-[10px] text-white/60 mt-1 text-center max-w-[180px] truncate">{activeTask}</p>}
            </div>
          </GlassPanel>

          {scoreBreakdown ? (
            <GlassPanel className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-white/55" />
                <h2 className="text-sm font-semibold text-white/80">Score Breakdown</h2>
              </div>
              <ScoreBreakdownBars breakdown={scoreBreakdown} />
              {activeRun && (
                <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold font-mono text-white/70">{activeRun.summary.steps_count}</p>
                    <p className="text-[10px] text-white/70">Steps</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-white/70">{activeRun.summary.failures_count}</p>
                    <p className="text-[10px] text-white/70">Failures</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-white/70">{(activeRun.summary.duration_ms / 1000).toFixed(1)}s</p>
                    <p className="text-[10px] text-white/70">Duration</p>
                  </div>
                </div>
              )}
            </GlassPanel>
          ) : (
            <GlassPanel className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-white/55" />
                <h2 className="text-sm font-semibold text-white/80">Run Summary</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center py-4">
                <div>
                  <p className="text-lg font-bold font-mono text-white/70">{traceSteps.length}</p>
                  <p className="text-[10px] text-white/70">Steps</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-white/70">{issues.length}</p>
                  <p className="text-[10px] text-white/70">Issues</p>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      )}

      {/* Metrics row */}
      {!hasResult && workflows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <GlassMetric label="Test Runs" value={String(workflows.length)} sub="total" icon={<Box className="w-3.5 h-3.5" />} />
          <GlassMetric label="Avg Score" value={avgScore != null ? `${avgScore}` : "—"} sub="readiness" icon={<Activity className="w-3.5 h-3.5" />} />
          <GlassMetric label="Tools" value={String(tools.length)} sub="loaded" icon={<Zap className="w-3.5 h-3.5" />} />
          <GlassMetric label="Issues" value={String(issues.length)} sub="detected" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        </div>
      )}

      {/* Issues panel */}
      {hasResult && issues.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <GlassPanel>
            <h2 className="text-sm font-semibold text-white/80 mb-3">
              Runtime Issues <span className="text-white/45 font-mono text-[11px] ml-2">{runtimeIssues.length}</span>
            </h2>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {runtimeIssues.length === 0 ? (
                <p className="text-[11px] text-white/70">No runtime issues</p>
              ) : (
                runtimeIssues.slice(0, 8).map((issue, i) => (
                  <IssueRow key={`r-${i}`} issue={issue} />
                ))
              )}
            </div>
          </GlassPanel>
          <GlassPanel>
            <h2 className="text-sm font-semibold text-white/80 mb-3">
              Design Issues <span className="text-white/45 font-mono text-[11px] ml-2">{designIssues.length}</span>
            </h2>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {designIssues.length === 0 ? (
                <p className="text-[11px] text-white/70">No design issues</p>
              ) : (
                designIssues.slice(0, 8).map((issue, i) => (
                  <IssueRow key={`d-${i}`} issue={issue} />
                ))
              )}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Trace timeline */}
      {traceSteps.length > 0 && (
        <GlassPanel className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80">Agent Trace</h2>
            <span className="text-[11px] text-white/45 font-mono">{traceSteps.length} steps</span>
          </div>
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
        </GlassPanel>
      )}

      {/* Evaluation */}
      {evaluation && (
        <GlassPanel className="mb-6">
          <h2 className="text-sm font-semibold text-white/80 mb-3">AI Evaluation</h2>
          {evaluation.overall_assessment && (
            <p className="text-[12px] text-white/60 leading-relaxed mb-4 border-l-2 border-white/[0.08] pl-3">
              {evaluation.overall_assessment}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(evaluation.root_causes ?? []).map((rc, i) => (
              <RecommendationCard key={`rc-${i}`} title={`Root Cause ${i + 1}`} desc={rc} />
            ))}
            {(evaluation.documentation_gaps ?? []).map((gap, i) => (
              <RecommendationCard key={`gap-${i}`} title={`Doc Gap ${i + 1}`} desc={gap} />
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Recent runs + tool stability */}
      {workflows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GlassPanel>
              <h2 className="text-sm font-semibold text-white/80 mb-4">Recent Runs</h2>
              <div className="space-y-2">
                {recent.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWorkflowId(w.id)}
                    className={`w-full text-left ${w.id === selectedWorkflowId ? "ring-1 ring-white/[0.15] rounded-xl" : ""}`}
                  >
                    <RunRow
                      name={truncateTask(w.task, 40)}
                      status={scoreToStatus(w.agent_readiness_score)}
                      score={`${w.agent_readiness_score ?? "—"}`}
                      time={timeAgo(w.completed_at ?? w.started_at)}
                    />
                  </button>
                ))}
              </div>
            </GlassPanel>
          </div>
          <GlassPanel>
            <h2 className="text-sm font-semibold text-white/80 mb-4">Tool Stability</h2>
            <div className="space-y-3">
              {computeToolStats(workflows).length === 0 ? (
                <p className="text-xs text-white/70">Run tests to see per-tool success rates</p>
              ) : (
                computeToolStats(workflows).slice(0, 6).map((t) => <ToolBar key={t.name} name={t.name} pct={t.pct} />)
              )}
            </div>
          </GlassPanel>
        </div>
      )}
    </>
  );
}

function IssueRow({ issue }: { issue: { type: string; severity: string; tool?: string; message: string } }) {
  const sevColor = issue.severity === "high" ? "text-red-400/70" : issue.severity === "medium" ? "text-amber-400/70" : "text-white/55";
  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg border border-white/[0.04] hover:bg-white/[0.02]">
      <span className={`text-[10px] font-mono uppercase ${sevColor} shrink-0 mt-0.5`}>{issue.severity}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-white/70 font-medium truncate">{issue.tool ? `${issue.tool} — ` : ""}{issueTypeLabel(issue.type)}</p>
        <p className="text-[10px] text-white/70 leading-relaxed">{issue.message}</p>
      </div>
    </div>
  );
}

function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  const items: { label: string; score: number; max: number }[] = [
    { label: "Runtime Success", score: breakdown.runtime_success, max: 40 },
    { label: "Parameter Clarity", score: breakdown.parameter_clarity, max: 30 },
    { label: "Documentation", score: breakdown.documentation, max: 20 },
    { label: "Stability", score: breakdown.stability, max: 10 },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.round((item.score / item.max) * 100);
        const color = pct >= 80 ? "bg-emerald-400/60" : pct >= 50 ? "bg-amber-400/60" : "bg-red-400/60";
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/60">{item.label}</span>
              <span className="font-mono text-white/55">{item.score}/{item.max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
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
