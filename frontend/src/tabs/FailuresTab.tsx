import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { useApp, useActiveIssues, useSelectedWorkflow } from "@/context/AppContext";
import { FailureCard, GlassMetric, GlassPanel, PrimaryButton, RecommendationCard, SecondaryButton } from "@/components/ui/glass";
import { api } from "@/lib/api";
import { issueTypeLabel } from "@/lib/format";

export function FailuresTab() {
  const { lastRun, runAction, actionLoading } = useApp();
  const issues = useActiveIssues();
  const wf = useSelectedWorkflow();

  const runtime = issues.filter((i) =>
    ["hallucinated_parameter", "missing_parameter", "retry_loop", "workflow_instability"].includes(i.type)
  );
  const design = issues.filter((i) => !runtime.includes(i));
  const highCount = issues.filter((i) => i.severity === "high").length;

  const recs = lastRun?.evaluation?.documentation_gaps ?? lastRun?.evaluation?.root_causes ?? [];

  return (
    <>
      <div className="mb-8 md:mb-10">
        <p className="text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">Diagnostics</p>
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
              <p className="text-xs text-white/30 font-mono">Last run score</p>
              <p className="text-2xl font-bold font-mono text-white/90">{lastRun.agent_readiness_score}</p>
            </div>
            <div className="flex gap-2">
              <SecondaryButton
                onClick={() => runAction("Applying…", () => api.applyOptimized({ use_last_workflow: true }))}
                disabled={!!actionLoading}
              >
                Apply optimized tools
              </SecondaryButton>
              {lastRun.report_url && (
                <PrimaryButton onClick={() => window.open(`${import.meta.env.VITE_API_URL || ""}${lastRun.report_url}`, "_blank")}>
                  View report
                </PrimaryButton>
              )}
            </div>
          </div>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Detected Issues</h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {issues.length === 0 ? (
              <p className="text-xs text-white/25">No issues on selected run</p>
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
            {issues.length > 20 && <p className="text-[10px] text-white/20">+{issues.length - 20} more (mostly documentation)</p>}
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Recommendations</h2>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {recs.length === 0 && lastRun?.issues_detected?.[0]?.suggested_fix ? (
              <RecommendationCard title="Suggested fix" desc={lastRun.issues_detected[0].suggested_fix!} />
            ) : recs.length === 0 ? (
              <p className="text-xs text-white/25">Run a test to get AI recommendations</p>
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

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
