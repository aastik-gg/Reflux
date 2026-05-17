import { AlertTriangle, ChevronUp, FileText, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { useApp, useActiveIssues, useSelectedWorkflow } from "@/context/AppContext";
import { FailureCard, GlassMetric, GlassPanel, PrimaryButton, RecommendationCard, SecondaryButton } from "@/components/ui/glass";
import { api } from "@/lib/api";
import { issueTypeLabel } from "@/lib/format";
import type { ScoreBreakdown } from "@/types/api";

export function FailuresTab() {
  const { lastRun, runAction, actionLoading, selectedWorkflowId } = useApp();
  const issues = useActiveIssues();
  const wf = useSelectedWorkflow();
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const runtime = issues.filter((i) =>
    ["hallucinated_parameter", "missing_parameter", "retry_loop", "workflow_instability"].includes(i.type)
  );
  const design = issues.filter((i) => !runtime.includes(i));
  const highCount = issues.filter((i) => i.severity === "high").length;

  const recs = lastRun?.evaluation?.documentation_gaps ?? lastRun?.evaluation?.root_causes ?? [];
  const scoreBreakdown = lastRun?.score_breakdown ?? null;

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

  return (
    <>
      <div className="mb-8 md:mb-10">
        <p className="text-white/55 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">Diagnostics</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Failure Insights
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <GlassMetric label="Total Issues" value={String(issues.length)} sub={wf?.task ? truncate(wf.task, 28) : "select a run"} icon={<XCircle className="w-3.5 h-3.5" />} />
        <GlassMetric label="High Severity" value={String(highCount)} sub="needs fix" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <GlassMetric label="Runtime" value={String(runtime.length)} sub={`${design.length} design`} icon={<RotateCcw className="w-3.5 h-3.5" />} />
      </div>

      {lastRun && (
        <GlassPanel className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/55 font-mono">Last run score</p>
              <p className="text-2xl font-bold font-mono text-white/90">{lastRun.agent_readiness_score}</p>
            </div>
            <div className="flex gap-2">
              <SecondaryButton
                onClick={() => runAction("Applying…", () => api.applyOptimized({ use_last_workflow: true }))}
                disabled={!!actionLoading}
              >
                {actionLoading === "Applying…" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Apply optimized tools
              </SecondaryButton>
              <SecondaryButton onClick={loadReport} disabled={reportLoading || !!actionLoading}>
                {reportLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                View Fix Report
              </SecondaryButton>
            </div>
          </div>

          {scoreBreakdown && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <ScoreBreakdownRow breakdown={scoreBreakdown} />
            </div>
          )}
        </GlassPanel>
      )}

      {reportOpen && reportMarkdown && (
        <GlassPanel className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-white/55" /> Fix Report
            </h2>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="text-xs text-white/55 hover:text-white/60 flex items-center gap-1"
            >
              Collapse <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto rounded-lg border border-white/[0.04] bg-black/30 p-4">
            <pre className="text-[11px] text-white/70 font-mono whitespace-pre-wrap leading-relaxed">{reportMarkdown}</pre>
          </div>
        </GlassPanel>
      )}

      {reportOpen && !reportMarkdown && !reportLoading && (
        <GlassPanel className="mb-4">
          <p className="text-xs text-white/55 text-center py-4">No fix report available for this run.</p>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Detected Issues</h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {issues.length === 0 ? (
              <p className="text-xs text-white/70">No issues on selected run</p>
            ) : (
              issues.slice(0, 20).map((issue, i) => (
                <FailureCard
                  key={`${issue.type}-${issue.tool}-${i}`}
                  tool={issue.tool || "workflow"}
                  type={issueTypeLabel(issue.type)}
                  desc={issue.message}
                  time={issue.severity}
                />
              ))
            )}
            {issues.length > 20 && <p className="text-[10px] text-white/45">+{issues.length - 20} more (mostly documentation)</p>}
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Recommendations</h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {recs.length === 0 && lastRun?.issues_detected?.[0]?.suggested_fix ? (
              <RecommendationCard title="Suggested fix" desc={lastRun.issues_detected[0].suggested_fix!} />
            ) : recs.length === 0 ? (
              <p className="text-xs text-white/70">Run a test to get AI recommendations</p>
            ) : (
              recs.map((r, i) => <RecommendationCard key={i} title={`Insight ${i + 1}`} desc={r} />)
            )}
            {lastRun?.evaluation?.overall_assessment && (
              <RecommendationCard title="Overall" desc={lastRun.evaluation.overall_assessment} />
            )}
          </div>
        </GlassPanel>
      </div>
    </>
  );
}

function ScoreBreakdownRow({ breakdown }: { breakdown: ScoreBreakdown }) {
  const items: { label: string; score: number; max: number }[] = [
    { label: "Runtime", score: breakdown.runtime_success, max: 40 },
    { label: "Params", score: breakdown.parameter_clarity, max: 30 },
    { label: "Docs", score: breakdown.documentation, max: 20 },
    { label: "Stability", score: breakdown.stability, max: 10 },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map((item) => {
        const pct = Math.round((item.score / item.max) * 100);
        return (
          <div key={item.label} className="text-center">
            <p className="text-[10px] text-white/55 mb-1">{item.label}</p>
            <p className="text-sm font-bold font-mono text-white/70">{item.score}<span className="text-[10px] text-white/45">/{item.max}</span></p>
            <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-1">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-emerald-400/60" : pct >= 50 ? "bg-amber-400/60" : "bg-red-400/60"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
