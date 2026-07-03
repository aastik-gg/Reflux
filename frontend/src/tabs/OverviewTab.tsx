import { Activity, AlertTriangle, Box, ChevronUp, FileText, Loader2, Sparkles, Target, Wrench, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useApp, useActiveIssues, useSelectedWorkflow } from "@/context/AppContext";
import { GlassMetric, GlassPanel, PrimaryButton, RecommendationCard, RunRow, SecondaryButton, StatusDot, ToolBar, TraceConnector, TraceStep } from "@/components/ui/glass";
import { formatLatency, issueTypeLabel, scoreToStatus, stepToStatus, timeAgo, truncateTask } from "@/lib/format";
import { api } from "@/lib/api";
import type { ScoreBreakdown } from "@/types/api";

export function OverviewTab() {
  const { workflows, tools, loading, health, lastRun, selectedWorkflowId, setSelectedWorkflowId, runAction, actionLoading } = useApp();
  const selected = useSelectedWorkflow();
  const issues = useActiveIssues();
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || loading || animated.current) return;
    animated.current = true;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;
    gsap.set(children, { opacity: 0, y: 20 });
    gsap.to(children, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.07,
      ease: "power3.out", clearProps: "all",
    });
  }, [loading]);

  const activeRun = lastRun ?? null;
  const traceSteps = activeRun?.trace ?? selected?.trace ?? [];
  const scoreBreakdown = activeRun?.score_breakdown ?? selected?.score_breakdown ?? null;
  const evaluation = activeRun?.evaluation ?? null;
  const activeScore = activeRun?.agent_readiness_score ?? selected?.agent_readiness_score ?? null;
  const activeTask = activeRun?.summary?.task ?? selected?.task ?? null;
  const activeMode = activeRun?.mode ?? selected?.mode ?? null;
  const activeCompleted = activeRun?.task_completed_successfully ?? selected?.task_completed_successfully ?? null;
  const hasResult = activeScore != null;

  const runtimeIssues = issues.filter((i) =>
    ["hallucinated_parameter", "missing_parameter", "retry_loop", "workflow_instability"].includes(i.type)
  );
  const designIssues = issues.filter((i) => !runtimeIssues.includes(i));

  const recent = [...workflows].reverse().slice(0, 5);
  const avgScore = workflows.length > 0
    ? Math.round(workflows.reduce((s, w) => s + (w.agent_readiness_score ?? 0), 0) / workflows.length)
    : null;

  const loadReport = async () => {
    const id = lastRun?.workflow_id ?? selectedWorkflowId;
    if (!id) return;
    setReportLoading(true);
    try {
      const r = await api.getReport(id);
      setReportMarkdown(r.fix_markdown);
      setReportOpen(true);
    } catch {
      setReportMarkdown(null);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return <p className="text-white/55 text-sm font-mono">Loading dashboard…</p>;
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-white/70 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">MCP Reliability Tester</p>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Agent Readiness
        </h1>
        <p className="text-white/60 text-xs md:text-sm max-w-lg leading-relaxed">
          {!hasResult && tools.length === 0
            ? "Add your MCP tools to start testing how reliably agents can use them."
            : !hasResult
            ? "Tools loaded — run a test to see how well agents interact with them."
            : "Test results showing how well agents interact with your tools."}
          {!health?.llm_configured && (
            <span className="block text-amber-400/70 mt-1">LLM not configured — set GEMINI_API_KEY in backend .env</span>
          )}
        </p>
      </div>

      {/* Empty state — no tools */}
      {!hasResult && tools.length === 0 && (
        <GlassPanel className="mb-6">
          <div className="py-8 text-center">
            <Wrench className="w-8 h-8 text-white/60 mx-auto mb-3" />
            <p className="text-sm text-white/80 mb-1">No MCP tools loaded</p>
            <p className="text-[12px] text-white/60 mb-4">Go to the <strong>Tools</strong> tab to upload your MCP tool definitions or load a demo pack.</p>
            <PrimaryButton onClick={() => document.dispatchEvent(new CustomEvent("go-tools"))}>
              Go to Tools
            </PrimaryButton>
          </div>
        </GlassPanel>
      )}

      {/* Ready state — tools loaded, no test yet */}
      {!hasResult && tools.length > 0 && workflows.length === 0 && (
        <GlassPanel className="mb-6">
          <div className="py-8 text-center">
            <Zap className="w-8 h-8 text-white/60 mx-auto mb-3" />
            <p className="text-sm text-white/80 mb-1">{tools.length} tools loaded — ready to test</p>
            <p className="text-[12px] text-white/60 mb-4">Click <strong>New Test</strong> in the top bar to run your first reliability test.</p>
          </div>
        </GlassPanel>
      )}

      {/* Score Hero */}
      {hasResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <GlassPanel className="lg:col-span-1">
            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-[10px] text-white/55 font-mono uppercase tracking-wider mb-2">Readiness Score</p>
              <AnimatedScore value={activeScore ?? 0} />
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

      {/* Actions bar */}
      {hasResult && (
        <div className="flex flex-wrap gap-2 mb-6">
          <SecondaryButton
            onClick={() => runAction("Applying…", () => api.applyOptimized({ use_last_workflow: true }))}
            disabled={!!actionLoading}
          >
            {actionLoading === "Applying…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Apply Optimized Tools
          </SecondaryButton>
          <SecondaryButton onClick={loadReport} disabled={reportLoading || !!actionLoading}>
            {reportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            View Fix Report
          </SecondaryButton>
        </div>
      )}

      {/* Fix Report */}
      {reportOpen && reportMarkdown && (
        <GlassPanel className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/55" /> Fix Report
            </h2>
            <button type="button" onClick={() => setReportOpen(false)} className="text-xs text-white/55 hover:text-white/70 flex items-center gap-1">
              Collapse <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-white/[0.04] bg-black/30 p-4">
            <pre className="text-[11px] text-white/70 font-mono whitespace-pre-wrap leading-relaxed">{reportMarkdown}</pre>
          </div>
        </GlassPanel>
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
                runtimeIssues.slice(0, 8).map((issue, i) => <IssueRow key={`r-${i}`} issue={issue} />)
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
                designIssues.slice(0, 8).map((issue, i) => <IssueRow key={`d-${i}`} issue={issue} />)
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
                <TraceStep step={s.step} tool={s.tool} status={stepToStatus(s)} latency={formatLatency(s.latency_ms)} />
              </span>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* AI Evaluation */}
      {evaluation && (
        <GlassPanel className="mb-6">
          <h2 className="text-sm font-semibold text-white/80 mb-3">AI Evaluation</h2>
          {evaluation.overall_assessment && (
            <p className="text-[12px] text-white/60 leading-relaxed mb-4 border-l-2 border-white/[0.08] pl-3">
              {evaluation.overall_assessment}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(evaluation.root_causes ?? []).map((rc, i) => <RecommendationCard key={`rc-${i}`} title={`Root Cause ${i + 1}`} desc={rc} />)}
            {(evaluation.documentation_gaps ?? []).map((gap, i) => <RecommendationCard key={`gap-${i}`} title={`Doc Gap ${i + 1}`} desc={gap} />)}
          </div>
        </GlassPanel>
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
    </div>
  );
}

/** Animated score counter 0 → value */
function AnimatedScore({ value }: { value: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => { el.textContent = String(Math.round(obj.val)); },
    });
  }, [value]);
  return (
    <div className="relative">
      <p ref={ref} className="text-5xl md:text-6xl font-bold font-mono text-white/90">0</p>
      <span className="absolute -right-6 top-1 text-sm text-white/45">/100</span>
    </div>
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
  const ref = useRef<HTMLDivElement>(null);
  const items = [
    { label: "Runtime Success", score: breakdown.runtime_success, max: 40 },
    { label: "Parameter Clarity", score: breakdown.parameter_clarity, max: 30 },
    { label: "Documentation", score: breakdown.documentation, max: 20 },
    { label: "Stability", score: breakdown.stability, max: 10 },
  ];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = el.querySelectorAll<HTMLElement>("[data-target-width]");
    bars.forEach((bar, i) => {
      const target = bar.dataset.targetWidth || "0";
      gsap.fromTo(bar, { width: "0%" }, { width: target, duration: 0.9, ease: "power2.out", delay: 0.2 + i * 0.1 });
    });
  }, [breakdown]);

  return (
    <div ref={ref} className="space-y-3">
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
              <div data-target-width={`${pct}%`} className={`h-full rounded-full ${color}`} style={{ width: "0%" }} />
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
